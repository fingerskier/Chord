/**
 * Default rules for the "examine" action.
 */

import type { Rule, ExamineAction } from '../types.js';

/** Check: must specify what to examine. */
export const checkExamineNothingSpecified: Rule<ExamineAction> = {
  name: 'check-examine-nothing-specified',
  priority: 100,
  phase: 'check',

  condition(_db, action) {
    return !action.noun;
  },

  body() {
    return { outcome: 'stop', output: 'What do you want to examine?' };
  },
};

/** Carry out: show the object's description. */
export const carryOutExamine: Rule<ExamineAction> = {
  name: 'carry-out-examine',
  priority: 10,
  phase: 'carry_out',

  condition(_db, action) {
    return !!action.noun;
  },

  body(db, action) {
    const obj = db.getObject(action.noun!);
    if (!obj) {
      return { outcome: 'stop', output: "You can't see any such thing." };
    }

    if (obj.description) {
      return { outcome: 'continue', output: obj.description };
    }

    return {
      outcome: 'continue',
      output: `You see nothing special about ${formatName(obj.id)}.`,
    };
  },
};

function formatName(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const examiningRules: Rule<ExamineAction>[] = [
  checkExamineNothingSpecified,
  carryOutExamine,
];
