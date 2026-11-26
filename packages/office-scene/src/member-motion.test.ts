import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Box3, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  SEAT_DROP,
  WALK_DURATION,
  advanceMemberMotion,
  getDestination,
  isAnimatedActivity,
  isSeatedActivity,
  sampleActivityEffect,
  sampleMemberMotion,
} from './member-motion.ts';
import { prepareMemberPose } from './member-pose.ts';
import { CHARACTER_HEIGHT, prepareCharacter } from './model-preparation.ts';
import { buildOfficeLayout } from './layout.ts';
import { ROSTER, TEAMS } from './test-fixtures.ts';

const placement = buildOfficeLayout(ROSTER, TEAMS).members[0]!;

describe('seating rules', () => {
  test('busy activities sit, idle and error stand', () => {
    for (const activity of ['working', 'starting', 'waiting_approval', 'external'] as const) {
      expect(isSeatedActivity(activity)).toBe(true);
      expect(getDestination(placement, activity)).toBe(placement.chairPosition);
    }
    for (const activity of ['idle', 'error'] as const) {
      expect(isSeatedActivity(activity)).toBe(false);
      expect(getDestination(placement, activity)).toBe(placement.position);
    }
  });

  test('only idle needs no continuous rendering', () => {
    expect(isAnimatedActivity('idle')).toBe(false);
    expect(isAnimatedActivity('error')).toBe(true);
    expect(isAnimatedActivity('working')).toBe(true);
  });
});

describe('advanceMemberMotion', () => {
  test('walks to the chair and back over the walk duration', () => {
    let progress = 0;
    for (let i = 0; i < 10; i += 1) {
      progress = advanceMemberMotion(progress, true, false, WALK_DURATION / 10);
    }
    expect(progress).toBeCloseTo(1, 9);
    progress = advanceMemberMotion(progress, false, false, WALK_DURATION / 2);
    expect(progress).toBeCloseTo(0.5, 9);
  });

  test('clamps and jumps under reduced motion', () => {
    expect(advanceMemberMotion(0.9, true, false, 100)).toBe(1);
    expect(advanceMemberMotion(0.1, false, false, 100)).toBe(0);
    expect(advanceMemberMotion(0.3, true, true, 0)).toBe(1);
    expect(advanceMemberMotion(0.3, false, true, 0)).toBe(0);
  });
});

describe('sampleMemberMotion', () => {
  test('starts standing and facing the viewer', () => {
    const state = sampleMemberMotion(placement, 0);
    expect([state.x, state.z]).toEqual([placement.position[0], placement.position[2]]);
    expect(state.heading).toBeNull();
    expect(state.seat).toBe(0);
    expect(state.stride).toBe(0);
  });

  test('walks with a stride towards the chair', () => {
    const state = sampleMemberMotion(placement, 0.2);
    expect(state.stride).not.toBe(0);
    expect(state.x).toBeGreaterThan(placement.position[0]);
    expect(state.x).toBeLessThan(placement.chairPosition[0]);
  });

  test('ends seated at the chair facing the desk', () => {
    const state = sampleMemberMotion(placement, 1);
    expect(state.x).toBeCloseTo(placement.chairPosition[0], 9);
    expect(state.z).toBeCloseTo(placement.chairPosition[2], 9);
    expect(state.y).toBeCloseTo(-SEAT_DROP, 9);
    expect(state.heading).toBe(Math.PI);
    expect(state.seat).toBe(1);
  });
});

describe('sampleActivityEffect', () => {
  test('maps activities to beacons', () => {
    expect(sampleActivityEffect('waiting_approval', 0, false).beacon).toBe('approval');
    expect(sampleActivityEffect('error', 0, false).beacon).toBe('error');
    expect(sampleActivityEffect('external', 0, false).beacon).toBe('external');
    expect(sampleActivityEffect('working', 0, false).beacon).toBeNull();
  });

  test('types and bobs only while working', () => {
    const working = sampleActivityEffect('working', 0.37, false);
    expect(working.typing).not.toBe(0);
    expect(working.bob).not.toBe(0);
    const idle = sampleActivityEffect('idle', 0.37, false);
    expect([idle.typing, idle.bob, idle.pulse, idle.screenGlow]).toEqual([0, 0, 0, 0]);
  });

  test('holds still under reduced motion while keeping status visible', () => {
    const early = sampleActivityEffect('waiting_approval', 1, true);
    const late = sampleActivityEffect('waiting_approval', 9, true);
    expect(late).toEqual(early);
    expect(early.pulse).toBeGreaterThan(0);
    expect(sampleActivityEffect('working', 3, true).typing).toBe(0);
  });

  test('pulses stay within range', () => {
    for (let time = 0; time < 6; time += 0.13) {
      const { pulse } = sampleActivityEffect('error', time, false, 2);
      expect(pulse).toBeGreaterThanOrEqual(0);
      expect(pulse).toBeLessThanOrEqual(1);
    }
  });
});

/** Loads the shipped rig without its texture, which needs a browser image decoder. */
async function loadCharacter() {
  const file = readFileSync(new URL('../assets/character.glb', import.meta.url));
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8'));
  delete json.images;
  delete json.textures;
  delete json.materials;
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  let text = JSON.stringify(json);
  text += ' '.repeat((4 - (Buffer.byteLength(text) % 4)) % 4);
  const chunk = Buffer.from(text);
  const rest = file.subarray(20 + jsonLength);
  const header = Buffer.alloc(20);
  file.copy(header, 0, 0, 20);
  header.writeUInt32LE(20 + chunk.length + rest.length, 8);
  header.writeUInt32LE(chunk.length, 12);
  const merged = Buffer.concat([header, chunk, rest]);
  const buffer = merged.buffer.slice(merged.byteOffset, merged.byteOffset + merged.byteLength);
  return new GLTFLoader().parseAsync(buffer as ArrayBuffer, '');
}

describe('the bundled character rig', () => {
  test('is grounded at the target height', async () => {
    const gltf = await loadCharacter();
    const prepared = prepareCharacter(
      gltf.scene,
      gltf.animations.find((clip) => clip.name.toLowerCase() === 'idle'),
      '#ff0000',
    );
    const bounds = new Box3().setFromObject(prepared.model);
    expect(bounds.min.y).toBeCloseTo(0, 3);
    expect(bounds.max.y).toBeCloseTo(CHARACTER_HEIGHT, 3);
    expect(prepared.model.getObjectByName('Head')).toBeDefined();
    prepared.dispose();
  });

  test('sits with level thighs, then restores the standing pose', async () => {
    const gltf = await loadCharacter();
    const { model } = prepareCharacter(
      gltf.scene,
      gltf.animations.find((clip) => clip.name.toLowerCase() === 'idle'),
    );
    const pose = prepareMemberPose(model);
    // Both legs and both arms were found on the real rig.
    expect(pose.jointCount).toBe(8);

    const direction = (from: string, to: string) => {
      model.updateMatrixWorld(true);
      const bone = (name: string) =>
        (model.getObjectByName(name) as Object3D).getWorldPosition(new Vector3());
      return bone(to).sub(bone(from)).normalize();
    };
    const standingThigh = direction('LeftUpLeg', 'LeftLeg');
    expect(standingThigh.y).toBeLessThan(-0.85);

    // The model faces +Z, so the desk heading needs no skew correction.
    expect(Math.abs(pose.heading)).toBeLessThan(0.15);

    pose.apply(1, 0);
    for (const side of ['Left', 'Right']) {
      expect(Math.abs(direction(`${side}UpLeg`, `${side}Leg`).y)).toBeLessThan(0.25);
      expect(direction(`${side}Leg`, `${side}Foot`).y).toBeLessThan(-0.9);
      // Forearms reach forward over the keyboard.
      const forward = new Vector3(Math.sin(pose.heading), 0, Math.cos(pose.heading));
      expect(direction(`${side}ForeArm`, `${side}Hand`).dot(forward)).toBeGreaterThan(0.85);
    }
    const hand = () => {
      model.updateMatrixWorld(true);
      return model.getObjectByName('LeftHand')!.getWorldPosition(new Vector3());
    };
    const still = hand();
    pose.apply(1, 0, 1);
    expect(hand().distanceTo(still)).toBeGreaterThan(0.005);

    pose.apply(0, 0);
    expect(direction('LeftUpLeg', 'LeftLeg').distanceTo(standingThigh)).toBeLessThan(1e-6);
  });
});
