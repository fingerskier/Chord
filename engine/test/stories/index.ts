/**
 * Story registry — exports all sample stories and a name→loader map.
 */

import type { Engine } from '../../src/engine.js';
import { loadClockworkGarden } from './clockwork-garden.js';
import { loadSunkenLibrary } from './sunken-library.js';
import { loadBakersDozens } from './bakers-dozen.js';

export { loadClockworkGarden } from './clockwork-garden.js';
export { loadSunkenLibrary } from './sunken-library.js';
export { loadBakersDozens } from './bakers-dozen.js';

export const STORIES: Record<string, (engine: Engine) => void> = {
  'clockwork-garden': loadClockworkGarden,
  'sunken-library': loadSunkenLibrary,
  'bakers-dozen': loadBakersDozens,
};
