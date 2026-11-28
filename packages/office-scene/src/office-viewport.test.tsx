import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OfficeViewport } from './viewport/index.ts';
import { supportsWebGL2 } from './webgl.ts';
import { ROSTER, TEAMS } from './test-fixtures.ts';

const render = (compact: boolean) =>
  renderToStaticMarkup(
    createElement(OfficeViewport, {
      members: ROSTER,
      teams: TEAMS,
      activities: { ceo: 'waiting_approval', dev1: 'working' },
      selectedId: 'ceo',
      onSelect: () => {},
      compact,
    }),
  );

describe('OfficeViewport without WebGL2', () => {
  test('detects the headless environment', () => {
    expect(supportsWebGL2()).toBe(false);
  });

  test('lists every team and member with live status', () => {
    const html = render(false);
    expect(html).toContain('data-office-fallback="unsupported"');
    for (const team of TEAMS) expect(html).toContain(team.name);
    for (const member of ROSTER) expect(html).toContain(member.displayName);
    expect(html).toContain('承認待ち');
    expect(html).toContain('作業中');
    expect(html).toContain('社長');
    expect(html).toContain('aria-pressed="true"');
  });

  test('does not offer camera controls it cannot honour', () => {
    expect(render(false)).not.toContain('ao-viewport__controls');
    expect(render(true)).toContain('data-compact="true"');
  });
});
