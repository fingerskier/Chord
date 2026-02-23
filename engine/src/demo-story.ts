/**
 * Demo story — the Dark Cave example from MVP.md.
 *
 * This seeds the database with rooms, objects, and exits
 * from the specification, then registers story-specific rules.
 */

import type { Engine } from './engine.js';

export function loadDemoStory(engine: Engine): void {
  // -------------------------------------------------------------------
  // Kinds
  // -------------------------------------------------------------------
  engine.addKind('lamp', 'thing');

  // -------------------------------------------------------------------
  // Rooms
  // -------------------------------------------------------------------
  engine.addObject(
    'dark_cave', 'room', undefined,
    'You are in a damp, dark cave.',
  );
  engine.addObject(
    'sunlit_clearing', 'room', undefined,
    'Bright sunlight filters through the canopy.',
  );

  // Exits (bidirectional)
  engine.addBidirectionalExit('dark_cave', 'north', 'sunlit_clearing', 'south');

  // -------------------------------------------------------------------
  // Objects
  // -------------------------------------------------------------------
  engine.addObject(
    'brass_lamp', 'lamp', 'dark_cave',
    'An old brass lamp sits here.',
  );
  engine.setProperty('brass_lamp', 'lit', 'false');

  engine.addObject(
    'wooden_chest', 'container', 'sunlit_clearing',
    'A sturdy wooden chest rests against a tree.',
  );
  engine.setProperty('wooden_chest', 'open', 'false');

  engine.addObject(
    'silver_key', 'thing', 'wooden_chest',
    'A small silver key.',
  );

  // -------------------------------------------------------------------
  // Place player
  // -------------------------------------------------------------------
  engine.placePlayer('dark_cave');

  // -------------------------------------------------------------------
  // Story-specific rules
  // -------------------------------------------------------------------

  // Instead of taking the brass lamp when lit
  engine.registerRule('take', {
    name: 'instead-take-brass-lamp-when-lit',
    priority: 130,
    phase: 'instead',

    condition(db, action) {
      if (action.noun !== 'brass_lamp') return false;
      return db.getProperty('brass_lamp', 'lit') === 'true';
    },

    body() {
      return {
        outcome: 'stop',
        output: 'The lamp is too hot to grab with bare hands.',
      };
    },
  });

  // After taking the silver key
  engine.registerRule('take', {
    name: 'after-take-silver-key',
    priority: 120,
    phase: 'after',

    condition(_db, action) {
      return action.noun === 'silver_key';
    },

    body() {
      return {
        outcome: 'continue',
        output: 'The key glints with an unusual shimmer as you pick it up.',
      };
    },
  });

  // Every turn: darkness warning
  engine.registerEveryTurnRule({
    name: 'darkness-warning',
    priority: 10,

    condition(db) {
      const loc = db.getLocation('player');
      if (loc !== 'dark_cave') return false;
      return db.getProperty('brass_lamp', 'lit') !== 'true';
    },

    body() {
      return {
        outcome: 'continue',
        output: 'You hear something skittering in the darkness.',
      };
    },
  });

  // Darkness scene
  engine.registerScene({
    name: 'darkness',

    beginsWhen() {
      // Begins at start of play (always true initially)
      return true;
    },

    endsWhen(db) {
      return db.getProperty('brass_lamp', 'lit') === 'true';
    },

    onEnd() {
      return 'The shadows retreat. You feel safer now.';
    },
  });
}
