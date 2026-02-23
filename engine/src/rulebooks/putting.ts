/**
 * Default rules for the "put" action (put X in Y).
 */

import type { Rule, PutAction } from '../types.js';

export const checkPutNothingSpecified: Rule<PutAction> = {
  name: 'check-put-nothing-specified',
  priority: 100,
  phase: 'check',

  condition(_db, action) {
    return !action.noun || !action.second;
  },

  body() {
    return { outcome: 'stop', output: 'What do you want to put, and where?' };
  },
};

export const checkPutNotCarried: Rule<PutAction> = {
  name: 'check-put-not-carried',
  priority: 50,
  phase: 'check',

  condition(db, action) {
    if (!action.noun) return false;
    return db.getLocation(action.noun) !== action.actor;
  },

  body() {
    return { outcome: 'stop', output: "You're not carrying that." };
  },
};

export const checkPutNotContainer: Rule<PutAction> = {
  name: 'check-put-not-container',
  priority: 50,
  phase: 'check',

  condition(db, action) {
    if (!action.second) return false;
    return !db.isKindOf(action.second, 'container');
  },

  body() {
    return { outcome: 'stop', output: "That's not a container." };
  },
};

export const carryOutPut: Rule<PutAction> = {
  name: 'carry-out-put',
  priority: 10,
  phase: 'carry_out',

  condition(_db, action) {
    return !!action.noun && !!action.second;
  },

  body(db, action) {
    db.moveTo(action.noun, action.second);
    return { outcome: 'continue' };
  },
};

export const reportPut: Rule<PutAction> = {
  name: 'report-put',
  priority: 10,
  phase: 'report',

  condition(_db, action) {
    return !!action.noun && !!action.second;
  },

  body() {
    return { outcome: 'continue', output: 'Done.' };
  },
};

export const puttingRules: Rule<PutAction>[] = [
  checkPutNothingSpecified,
  checkPutNotCarried,
  checkPutNotContainer,
  carryOutPut,
  reportPut,
];
