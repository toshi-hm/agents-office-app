import { SCENE_ASSET_URLS } from '../asset-manifest.ts';
import { clearSceneGLTF, preloadSceneGLTF } from '../scene-gltf.ts';

export function preloadSceneAssets(): void {
  for (const url of Object.values(SCENE_ASSET_URLS)) preloadSceneGLTF(url);
}

export function clearSceneAssets(): void {
  for (const url of Object.values(SCENE_ASSET_URLS)) clearSceneGLTF(url);
}
