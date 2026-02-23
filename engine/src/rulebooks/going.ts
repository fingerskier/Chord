/**
 * Default rules for the "go" action (movement between rooms).
 */

import type { Rule, GoAction } from '../types.js';

/** Check: direction must lead somewhere. */
export const checkGoNoExit: Rule<GoAction> = {
  name: 'check-go-no-exit',
  priority: 50,
  phase: 'check',

  condition(db, action) {
    const loc = db.getLocation(action.actor);
    if (!loc) return true;
    const dest = db.getExit(loc, action.noun);
    return dest === null;
  },

  body() {
    return { outcome: 'stop', output: "You can't go that way." };
  },
};

/** Carry out: move the actor to the destination room. */
export const carryOutGo: Rule<GoAction> = {
  name: 'carry-out-go',
  priority: 10,
  phase: 'carry_out',

  condition(db, action) {
    const loc = db.getLocation(action.actor);
    if (!loc) return false;
    return db.getExit(loc, action.noun) !== null;
  },

  body(db, action) {
    const loc = db.getLocation(action.actor)!;
    const dest = db.getExit(loc, action.noun)!;
    db.moveTo(action.actor, dest);
    return { outcome: 'continue' };
  },
};

/** Report: describe the new location. */
export const reportGo: Rule<GoAction> = {
  name: 'report-go',
  priority: 10,
  phase: 'report',

  condition() {
    return true;
  },

  body(db, action) {
    const loc = db.getLocation(action.actor);
    if (!loc) return { outcome: 'continue' };

    const room = db.getObject(loc);
    if (!room) return { outcome: 'continue' };

    const lines: string[] = [];
    // Room name (id formatted as title)
    lines.push(`**${formatName(room.id)}**`);
    if (room.description) lines.push(room.description);

    // List visible objects
    const contents = db.getContents(loc);
    const visible = contents.filter(t => t.id !== action.actor);
    for (const thing of visible) {
      if (thing.description) {
        lines.push(thing.description);
      }
    }

    return { outcome: 'continue', output: lines.join('\n') };
  },
};

function formatName(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const goingRules: Rule<GoAction>[] = [
  checkGoNoExit,
  carryOutGo,
  reportGo,
];
