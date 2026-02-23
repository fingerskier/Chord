/**
 * The Clockwork Garden — a steampunk assembly puzzle.
 *
 * Collect three gears from various containers and place them
 * on the workbench to bring a clockwork bird to life.
 *
 * Features exercised: containers, put verb, custom kinds,
 * after/instead/before rules, scenes, every-turn rules.
 */

import type { Engine } from '../../src/engine.js';

export function loadClockworkGarden(engine: Engine): void {
  // -------------------------------------------------------------------
  // Kinds
  // -------------------------------------------------------------------
  engine.addKind('gear', 'thing');
  engine.addKind('mechanism', 'container');

  // -------------------------------------------------------------------
  // Rooms
  // -------------------------------------------------------------------
  engine.addObject(
    'garden_gate', 'room', undefined,
    'An ornate iron gate opens onto a garden of brass flowers and copper vines.',
  );
  engine.addObject(
    'rose_terrace', 'room', undefined,
    'Mechanical roses bloom and close in slow rhythm along a stone terrace.',
  );
  engine.addObject(
    'greenhouse', 'room', undefined,
    'Glass walls enclose a humid workshop. A heavy workbench dominates the center.',
  );
  engine.addObject(
    'clock_tower_base', 'room', undefined,
    'The base of a tall clock tower. Gears turn slowly behind glass panels in the walls.',
  );

  // Exits (2×2 grid)
  engine.addBidirectionalExit('garden_gate', 'east', 'rose_terrace', 'west');
  engine.addBidirectionalExit('garden_gate', 'south', 'greenhouse', 'north');
  engine.addBidirectionalExit('rose_terrace', 'south', 'clock_tower_base', 'north');
  engine.addBidirectionalExit('greenhouse', 'east', 'clock_tower_base', 'west');

  // -------------------------------------------------------------------
  // Objects
  // -------------------------------------------------------------------
  engine.addObject(
    'display_case', 'container', 'garden_gate',
    'A glass display case stands beside the gate.',
  );
  engine.setProperty('display_case', 'open', 'false');

  engine.addObject('bronze_gear', 'gear', 'display_case', 'A toothed bronze gear.');

  engine.addObject(
    'cracked_fountain', 'container', 'rose_terrace',
    'A cracked stone fountain, its basin dry.',
  );
  engine.setProperty('cracked_fountain', 'open', 'false');

  engine.addObject('silver_gear', 'gear', 'cracked_fountain', 'A polished silver gear.');

  engine.addObject('gold_gear', 'gear', 'greenhouse', 'A gleaming gold gear lies on the floor.');

  engine.addObject(
    'workbench', 'container', 'greenhouse',
    'A sturdy oak workbench with slots for gears.',
  );
  engine.setProperty('workbench', 'open', 'true');

  engine.addObject(
    'clockwork_bird', 'thing', 'clock_tower_base',
    'A delicate clockwork bird perches on a brass stand, motionless.',
  );
  engine.setProperty('clockwork_bird', 'assembled', 'false');

  // -------------------------------------------------------------------
  // Place player
  // -------------------------------------------------------------------
  engine.placePlayer('garden_gate');

  // -------------------------------------------------------------------
  // Story-specific rules
  // -------------------------------------------------------------------

  // Instead of taking the clockwork bird when not assembled
  engine.registerRule('take', {
    name: 'instead-take-bird-when-not-assembled',
    priority: 130,
    phase: 'instead',
    condition(db, action) {
      if (action.noun !== 'clockwork_bird') return false;
      return db.getProperty('clockwork_bird', 'assembled') !== 'true';
    },
    body() {
      return {
        outcome: 'stop',
        output: 'The bird is bolted firmly to its brass stand. It needs something to bring it to life.',
      };
    },
  });

  // After putting a gear in the workbench, check if all three are present
  engine.registerRule('put', {
    name: 'after-put-gear-in-workbench',
    priority: 120,
    phase: 'after',
    condition(db, action) {
      if (action.second !== 'workbench') return false;
      return db.isKindOf(action.noun!, 'gear');
    },
    body(db) {
      const contents = db.getContents('workbench');
      const gears = contents.filter(t => db.isKindOf(t.id, 'gear'));
      if (gears.length >= 3) {
        db.setProperty('clockwork_bird', 'assembled', 'true');
        return {
          outcome: 'continue',
          output: 'The three gears mesh together perfectly on the workbench. You hear a whirring sound from the clock tower!',
        };
      }
      return {
        outcome: 'continue',
        output: `Gear placed. The workbench now holds ${gears.length} of 3 gears.`,
      };
    },
  });

  // Before going to clock_tower_base — hint if bird not assembled
  engine.registerRule('go', {
    name: 'before-go-tower-hint',
    priority: 100,
    phase: 'before',
    condition(db, action) {
      if (action.noun !== 'south' && action.noun !== 'east') return false;
      const loc = db.getLocation('player');
      // Only fire if heading toward clock_tower_base
      if (loc === 'rose_terrace' && action.noun === 'south') return true;
      if (loc === 'greenhouse' && action.noun === 'east') return true;
      return false;
    },
    body(db) {
      if (db.getProperty('clockwork_bird', 'assembled') !== 'true') {
        return {
          outcome: 'continue',
          output: 'You sense the tower is waiting for something...',
        };
      }
      return { outcome: 'continue' };
    },
  });

  // After taking the assembled clockwork bird
  engine.registerRule('take', {
    name: 'after-take-assembled-bird',
    priority: 110,
    phase: 'after',
    condition(_db, action) {
      return action.noun === 'clockwork_bird';
    },
    body() {
      return {
        outcome: 'continue',
        output: 'The clockwork bird flutters its wings and settles contentedly in your hands. You have restored it!',
      };
    },
  });

  // -------------------------------------------------------------------
  // Every-turn rule
  // -------------------------------------------------------------------
  engine.registerEveryTurnRule({
    name: 'workbench-clicking',
    priority: 10,
    condition(db) {
      if (db.getLocation('player') !== 'greenhouse') return false;
      const contents = db.getContents('workbench');
      return contents.some(t => db.isKindOf(t.id, 'gear'));
    },
    body() {
      return {
        outcome: 'continue',
        output: 'Gears click softly on the workbench.',
      };
    },
  });

  // -------------------------------------------------------------------
  // Scene
  // -------------------------------------------------------------------
  engine.registerScene({
    name: 'assembly',
    beginsWhen(db) {
      const contents = db.getContents('workbench');
      return contents.some(t => db.isKindOf(t.id, 'gear'));
    },
    endsWhen(db) {
      return db.getProperty('clockwork_bird', 'assembled') === 'true';
    },
    onBegin() {
      return 'You feel the garden stir with anticipation as the first gear finds its place.';
    },
    onEnd() {
      return 'The clockwork bird springs to life with a triumphant chirp! The garden blooms brighter in response.';
    },
  });
}
