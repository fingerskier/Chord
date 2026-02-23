/**
 * Default rules for the "look" action.
 */

import type { Rule, LookAction } from '../types.js';

/** Carry out: describe the current location. */
export const carryOutLook: Rule<LookAction> = {
  name: 'carry-out-look',
  priority: 10,
  phase: 'carry_out',

  condition() {
    return true;
  },

  body(db, action) {
    const loc = db.getLocation(action.actor);
    if (!loc) return { outcome: 'continue', output: 'You are nowhere.' };

    const room = db.getObject(loc);
    if (!room) return { outcome: 'continue', output: 'You are nowhere.' };

    const lines: string[] = [];
    lines.push(`**${formatName(room.id)}**`);
    if (room.description) lines.push(room.description);

    // List visible objects
    const contents = db.getContents(loc);
    const visible = contents.filter(t => t.id !== action.actor);
    for (const thing of visible) {
      if (thing.description) {
        lines.push(thing.description);
      } else {
        lines.push(`You can see ${formatName(thing.id)} here.`);
      }
    }

    // List exits
    const exitRows = db.queryAll(
      'SELECT direction FROM exits WHERE from_room = ?', loc
    );
    if (exitRows.length > 0) {
      const dirs = exitRows.map(r => r.direction as string).join(', ');
      lines.push(`Exits: ${dirs}.`);
    }

    return { outcome: 'continue', output: lines.join('\n') };
  },
};

function formatName(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const lookingRules: Rule<LookAction>[] = [
  carryOutLook,
];
