/**
 * Default rulebook registration.
 *
 * Registers all built-in rules for the standard verbs.
 * Story-specific (compiled) rules are registered on top of these.
 */

import type { RulebookRegistry } from '../types.js';
import { takingRules } from './taking.js';
import { droppingRules } from './dropping.js';
import { goingRules } from './going.js';
import { lookingRules } from './looking.js';
import { examiningRules } from './examining.js';
import { inventoryRules } from './inventory.js';
import { openingRules, closingRules } from './opening.js';
import { puttingRules } from './putting.js';

export function registerDefaultRules(registry: RulebookRegistry): void {
  for (const rule of takingRules) registry.registerRule('take', rule);
  for (const rule of droppingRules) registry.registerRule('drop', rule);
  for (const rule of goingRules) registry.registerRule('go', rule);
  for (const rule of lookingRules) registry.registerRule('look', rule);
  for (const rule of examiningRules) registry.registerRule('examine', rule);
  for (const rule of inventoryRules) registry.registerRule('inventory', rule);
  for (const rule of openingRules) registry.registerRule('open', rule);
  for (const rule of closingRules) registry.registerRule('close', rule);
  for (const rule of puttingRules) registry.registerRule('put', rule);
}
