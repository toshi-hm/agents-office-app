import { useGLTF } from '@react-three/drei';
import { TextureLoader } from 'three';

type ExtendLoader = NonNullable<Parameters<typeof useGLTF>[3]>;

/**
 * Decode embedded textures through <img> (CSP `img-src blob:`). three's default ImageBitmapLoader
 * `fetch`es the blob URL, which a strict desktop `connect-src` refuses.
 */
const useImageElementTextures: ExtendLoader = (loader) => {
  loader.register((parser) => {
    (parser as unknown as { textureLoader: TextureLoader }).textureLoader = new TextureLoader(
      parser.options.manager,
    );
    return { name: 'OFFICE_image_element_textures', beforeRoot: () => null };
  });
};

// Draco and meshopt decoders are disabled: the bundled files need neither (and no CDN).
export function useSceneGLTF(url: string) {
  return useGLTF(url, false, false, useImageElementTextures);
}

export function preloadSceneGLTF(url: string): void {
  useGLTF.preload(url, false, false, useImageElementTextures);
}

export function clearSceneGLTF(url: string): void {
  useGLTF.clear(url);
}
