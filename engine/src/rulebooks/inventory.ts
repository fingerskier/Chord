/**
 * Default rules for the "inventory" action.
 */

import type { Rule, InventoryAction } from '../types.js';

/** Carry out: list what the player is carrying. */
export const carryOutInventory: Rule<InventoryAction> = {
  name: 'carry-out-inventory',
  priority: 10,
  phase: 'carry_out',

  condition() {
    return true;
  },

  body(db, action) {
    const carried = db.getContents(action.actor);
    if (carried.length === 0) {
      return { outcome: 'continue', output: 'You are empty-handed.' };
    }

    const names = carried.map(t => formatName(t.id));
    return {
      outcome: 'continue',
      output: `You are carrying:\n${names.map(n => `  ${n}`).join('\n')}`,
    };
  },
};

function formatName(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const inventoryRules: Rule<InventoryAction>[] = [
  carryOutInventory,
];
