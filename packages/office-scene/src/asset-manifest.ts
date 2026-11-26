/**
 * Static Kenney CC0 files bundled with office-scene (licenses sit beside them in `../assets`). Vite resolves the `?url` imports to hashed
 * local files, so nothing is fetched from a remote host at runtime.
 */
import characterUrl from '../assets/character.glb?url';
import deskUrl from '../assets/desk.glb?url';
import chairUrl from '../assets/chairDesk.glb?url';
import screenUrl from '../assets/computerScreen.glb?url';
import keyboardUrl from '../assets/computerKeyboard.glb?url';
import laptopUrl from '../assets/laptop.glb?url';
import bookcaseUrl from '../assets/bookcaseOpen.glb?url';

export const SCENE_ASSET_URLS = Object.freeze({
  character: characterUrl,
  desk: deskUrl,
  chair: chairUrl,
  screen: screenUrl,
  keyboard: keyboardUrl,
  laptop: laptopUrl,
  bookcase: bookcaseUrl,
});
