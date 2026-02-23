/**
 * Default rules for the "drop" action.
 */

import type { Rule, DropAction } from '../types.js';

/** Check: must specify what to drop. */
export const checkDropNothingSpecified: Rule<DropAction> = {
  name: 'check-drop-nothing-specified',
  priority: 100,
  phase: 'check',

  condition(_db, action) {
    return !action.noun;
  },

  body() {
    return { outcome: 'stop', output: 'What do you want to drop?' };
  },
};

/** Check: must be carrying the thing. */
export const checkDropNotCarried: Rule<DropAction> = {
  name: 'check-drop-not-carried',
  priority: 50,
  phase: 'check',

  condition(db, action) {
    if (!action.noun) return false;
    const loc = db.getLocation(action.noun);
    return loc !== action.actor;
  },

  body() {
    return { outcome: 'stop', output: "You're not carrying that." };
  },
};

/** Carry out: move the object to the actor's location. */
export const carryOutDrop: Rule<DropAction> = {
  name: 'carry-out-drop',
  priority: 10,
  phase: 'carry_out',

  condition(_db, action) {
    return !!action.noun;
  },

  body(db, action) {
    const actorLoc = db.getLocation(action.actor);
    if (actorLoc) {
      db.moveTo(action.noun!, actorLoc);
    }
    return { outcome: 'continue' };
  },
};

/** Report: confirm the drop. */
export const reportDrop: Rule<DropAction> = {
  name: 'report-drop',
  priority: 10,
  phase: 'report',

  condition(_db, action) {
    return !!action.noun;
  },

  body() {
    return { outcome: 'continue', output: 'Dropped.' };
  },
};

export const droppingRules: Rule<DropAction>[] = [
  checkDropNothingSpecified,
  checkDropNotCarried,
  carryOutDrop,
  reportDrop,
];
