/**
 * Default rules for the "open" and "close" actions.
 */

import type { Rule, OpenAction, CloseAction } from '../types.js';

// ---------------------------------------------------------------------------
// Open
// ---------------------------------------------------------------------------

export const checkOpenNothingSpecified: Rule<OpenAction> = {
  name: 'check-open-nothing-specified',
  priority: 100,
  phase: 'check',

  condition(_db, action) {
    return !action.noun;
  },

  body() {
    return { outcome: 'stop', output: 'What do you want to open?' };
  },
};

export const checkOpenNotOpenable: Rule<OpenAction> = {
  name: 'check-open-not-openable',
  priority: 50,
  phase: 'check',

  condition(db, action) {
    if (!action.noun) return false;
    // Only containers are openable by default
    return !db.isKindOf(action.noun, 'container');
  },

  body() {
    return { outcome: 'stop', output: "That's not something you can open." };
  },
};

export const checkOpenAlreadyOpen: Rule<OpenAction> = {
  name: 'check-open-already-open',
  priority: 40,
  phase: 'check',

  condition(db, action) {
    if (!action.noun) return false;
    return db.getProperty(action.noun, 'open') === 'true';
  },

  body() {
    return { outcome: 'stop', output: "That's already open." };
  },
};

export const carryOutOpen: Rule<OpenAction> = {
  name: 'carry-out-open',
  priority: 10,
  phase: 'carry_out',

  condition(_db, action) {
    return !!action.noun;
  },

  body(db, action) {
    db.setProperty(action.noun!, 'open', 'true');
    return { outcome: 'continue' };
  },
};

export const reportOpen: Rule<OpenAction> = {
  name: 'report-open',
  priority: 10,
  phase: 'report',

  condition(_db, action) {
    return !!action.noun;
  },

  body(db, action) {
    const contents = db.getContents(action.noun!);
    if (contents.length > 0) {
      const names = contents.map(t => formatName(t.id)).join(', ');
      return {
        outcome: 'continue',
        output: `You open it, revealing ${names}.`,
      };
    }
    return { outcome: 'continue', output: 'Opened.' };
  },
};

// ---------------------------------------------------------------------------
// Close
// ---------------------------------------------------------------------------

export const checkCloseNothingSpecified: Rule<CloseAction> = {
  name: 'check-close-nothing-specified',
  priority: 100,
  phase: 'check',

  condition(_db, action) {
    return !action.noun;
  },

  body() {
    return { outcome: 'stop', output: 'What do you want to close?' };
  },
};

export const checkCloseNotClosable: Rule<CloseAction> = {
  name: 'check-close-not-closable',
  priority: 50,
  phase: 'check',

  condition(db, action) {
    if (!action.noun) return false;
    return !db.isKindOf(action.noun, 'container');
  },

  body() {
    return { outcome: 'stop', output: "That's not something you can close." };
  },
};

export const checkCloseAlreadyClosed: Rule<CloseAction> = {
  name: 'check-close-already-closed',
  priority: 40,
  phase: 'check',

  condition(db, action) {
    if (!action.noun) return false;
    return db.getProperty(action.noun, 'open') !== 'true';
  },

  body() {
    return { outcome: 'stop', output: "That's already closed." };
  },
};

export const carryOutClose: Rule<CloseAction> = {
  name: 'carry-out-close',
  priority: 10,
  phase: 'carry_out',

  condition(_db, action) {
    return !!action.noun;
  },

  body(db, action) {
    db.setProperty(action.noun!, 'open', 'false');
    return { outcome: 'continue' };
  },
};

export const reportClose: Rule<CloseAction> = {
  name: 'report-close',
  priority: 10,
  phase: 'report',

  condition(_db, action) {
    return !!action.noun;
  },

  body() {
    return { outcome: 'continue', output: 'Closed.' };
  },
};

function formatName(id: string): string {
  return id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export const openingRules: Rule<OpenAction>[] = [
  checkOpenNothingSpecified,
  checkOpenNotOpenable,
  checkOpenAlreadyOpen,
  carryOutOpen,
  reportOpen,
];

export const closingRules: Rule<CloseAction>[] = [
  checkCloseNothingSpecified,
  checkCloseNotClosable,
  checkCloseAlreadyClosed,
  carryOutClose,
  reportClose,
];
