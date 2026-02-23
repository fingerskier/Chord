/**
 * Default rules for the "take" action.
 */

import type { Rule, TakeAction } from '../types.js';

/** Check: can't take something you're already carrying. */
export const checkTakeAlreadyCarried: Rule<TakeAction> = {
  name: 'check-take-already-carried',
  priority: 50,
  phase: 'check',

  condition(db, action) {
    if (!action.noun) return false;
    const loc = db.getLocation(action.noun);
    return loc === action.actor;
  },

  body() {
    return { outcome: 'stop', output: "You're already carrying that." };
  },
};

/** Check: must specify what to take. */
export const checkTakeNothingSpecified: Rule<TakeAction> = {
  name: 'check-take-nothing-specified',
  priority: 100,
  phase: 'check',

  condition(_db, action) {
    return !action.noun;
  },

  body() {
    return { outcome: 'stop', output: 'What do you want to take?' };
  },
};

/** Check: can't take rooms. */
export const checkTakeRoom: Rule<TakeAction> = {
  name: 'check-take-room',
  priority: 60,
  phase: 'check',

  condition(db, action) {
    if (!action.noun) return false;
    return db.isKindOf(action.noun, 'room');
  },

  body() {
    return { outcome: 'stop', output: "That's not something you can pick up." };
  },
};

/** Check: can't take people. */
export const checkTakePerson: Rule<TakeAction> = {
  name: 'check-take-person',
  priority: 60,
  phase: 'check',

  condition(db, action) {
    if (!action.noun) return false;
    return db.isKindOf(action.noun, 'person');
  },

  body() {
    return { outcome: 'stop', output: "That's not something you can pick up." };
  },
};

/** Carry out: move the object to the actor. */
export const carryOutTake: Rule<TakeAction> = {
  name: 'carry-out-take',
  priority: 10,
  phase: 'carry_out',

  condition(_db, action) {
    return !!action.noun;
  },

  body(db, action) {
    db.moveTo(action.noun!, action.actor);
    return { outcome: 'continue' };
  },
};

/** Report: confirm the take. */
export const reportTake: Rule<TakeAction> = {
  name: 'report-take',
  priority: 10,
  phase: 'report',

  condition(_db, action) {
    return !!action.noun;
  },

  body() {
    return { outcome: 'continue', output: 'Taken.' };
  },
};

export const takingRules: Rule<TakeAction>[] = [
  checkTakeNothingSpecified,
  checkTakeRoom,
  checkTakePerson,
  checkTakeAlreadyCarried,
  carryOutTake,
  reportTake,
];
