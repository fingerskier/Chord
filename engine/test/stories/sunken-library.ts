/**
 * The Sunken Library — an underwater exploration adventure.
 *
 * Navigate flooded chambers, interact with an NPC librarian,
 * and recover a magical tome from the deep archive.
 *
 * Features exercised: up/down/diagonal directions, one-way exits,
 * 3-level kind hierarchy, person kind, replace/redirect outcome,
 * before/instead/check rules, scenes.
 */

import type { Engine } from '../../src/engine.js';

export function loadSunkenLibrary(engine: Engine): void {
  // ---------------------------------------------------------------
  // Kinds — 3-level hierarchy: thing → book → magic_book
  // ---------------------------------------------------------------
  engine.addKind('book', 'thing');
  engine.addKind('magic_book', 'book');

  // ---------------------------------------------------------------
  // Rooms
  // ---------------------------------------------------------------
  engine.addObject(
    'entrance_hall', 'room', undefined,
    'A grand hall with marble columns, ankle-deep in murky water. Kelp clings to the walls.',
  );
  engine.addObject(
    'reading_room', 'room', undefined,
    'A dry, elevated chamber lined with shelves. An ancient librarian sits at a desk.',
  );
  engine.addObject(
    'deep_archive', 'room', undefined,
    'A submerged vault. Water presses in from all sides. Bioluminescent coral provides faint light.',
  );
  engine.addObject(
    'coral_gallery', 'room', undefined,
    'A gallery where coral has overtaken the bookshelves, forming strange organic sculptures.',
  );
  engine.addObject(
    'librarian_office', 'room', undefined,
    'A cozy office above the reading room. Star charts cover every wall.',
  );

  // Exits
  engine.addBidirectionalExit('entrance_hall', 'east', 'reading_room', 'west');
  engine.addBidirectionalExit('entrance_hall', 'northeast', 'coral_gallery', 'southwest');
  engine.addBidirectionalExit('reading_room', 'up', 'librarian_office', 'down');

  // One-way exit down to deep_archive (going back up requires the charm)
  engine.addExit('entrance_hall', 'down', 'deep_archive');
  engine.addExit('deep_archive', 'up', 'entrance_hall');

  // -------------------------------------------------------------------
  // Objects
  // -------------------------------------------------------------------
  engine.addObject(
    'old_librarian', 'person', 'reading_room',
    'An ancient librarian peers at you over half-moon spectacles.',
  );

  engine.addObject(
    'soggy_catalog', 'book', 'entrance_hall',
    'A waterlogged catalog of the library holdings.',
  );

  engine.addObject(
    'glowing_tome', 'magic_book', 'deep_archive',
    'A heavy tome that pulses with an eerie green glow.',
  );
  engine.setProperty('glowing_tome', 'sticky', 'true');

  engine.addObject(
    'breathing_charm', 'thing', 'coral_gallery',
    'A small charm carved in the shape of a fish.',
  );

  engine.addObject(
    'reading_desk', 'container', 'reading_room',
    'A heavy oak desk covered in papers.',
  );
  engine.setProperty('reading_desk', 'open', 'false');

  engine.addObject(
    'rusted_key', 'thing', 'reading_desk',
    'A small rusted key.',
  );

  engine.addObject(
    'stone_tablet', 'thing', 'librarian_office',
    'An ancient tablet covered in faintly glowing runes.',
  );

  // -------------------------------------------------------------------
  // Place player
  // -------------------------------------------------------------------
  engine.placePlayer('entrance_hall');

  // -------------------------------------------------------------------
  // Story-specific rules
  // -------------------------------------------------------------------

  // Instead of taking the librarian
  engine.registerRule('take', {
    name: 'instead-take-librarian',
    priority: 140,
    phase: 'instead',
    condition(_db, action) {
      return action.noun === 'old_librarian';
    },
    body() {
      return {
        outcome: 'stop',
        output: "The librarian swats your hand away. 'I am NOT a book!' she snaps.",
      };
    },
  });

  // Before going up from deep_archive — check for breathing charm
  engine.registerRule('go', {
    name: 'before-go-up-from-archive',
    priority: 130,
    phase: 'check',
    condition(db, action) {
      if (action.noun !== 'up') return false;
      return db.getLocation('player') === 'deep_archive';
    },
    body(db) {
      const charmLoc = db.getLocation('breathing_charm');
      if (charmLoc !== 'player') {
        return {
          outcome: 'stop',
          output: 'The water pressure is too great. You need something to help you breathe.',
        };
      }
      return {
        outcome: 'continue',
        output: 'The charm glows and a bubble of air surrounds you as you ascend.',
      };
    },
  });

  // Replace: examining glowing_tome when not carrying it redirects to take
  engine.registerRule('examine', {
    name: 'replace-examine-tome-to-take',
    priority: 120,
    phase: 'instead',
    condition(db, action) {
      if (action.noun !== 'glowing_tome') return false;
      return db.getLocation('glowing_tome') !== 'player';
    },
    body() {
      return {
        outcome: 'replace',
        output: 'As you lean in to examine the tome, your hands reach out involuntarily...',
        redirect: { verb: 'take', actor: 'player', noun: 'glowing_tome' },
      };
    },
  });

  // Check: cannot drop the glowing tome (it's sticky)
  engine.registerRule('drop', {
    name: 'check-drop-glowing-tome',
    priority: 130,
    phase: 'check',
    condition(_db, action) {
      return action.noun === 'glowing_tome';
    },
    body() {
      return {
        outcome: 'stop',
        output: 'The tome clings to your hands with spectral tendrils. You cannot let go.',
      };
    },
  });

  // After taking the breathing charm
  engine.registerRule('take', {
    name: 'after-take-breathing-charm',
    priority: 110,
    phase: 'after',
    condition(_db, action) {
      return action.noun === 'breathing_charm';
    },
    body() {
      return {
        outcome: 'continue',
        output: 'As you pick up the charm, you feel a tingle of magic. The carved fish seems to wink at you.',
      };
    },
  });

  // -------------------------------------------------------------------
  // Every-turn rule
  // -------------------------------------------------------------------
  engine.registerEveryTurnRule({
    name: 'tome-humming',
    priority: 10,
    condition(db) {
      return db.getLocation('glowing_tome') === 'player';
    },
    body() {
      return {
        outcome: 'continue',
        output: 'The tome hums softly in your hands, its green light pulsing.',
      };
    },
  });

  // -------------------------------------------------------------------
  // Scene
  // -------------------------------------------------------------------
  engine.registerScene({
    name: 'flooding',
    beginsWhen(db) {
      return db.getLocation('player') === 'deep_archive';
    },
    endsWhen(db) {
      return (
        db.getLocation('player') === 'entrance_hall' &&
        db.getLocation('breathing_charm') === 'player'
      );
    },
    onBegin() {
      return 'Water rushes in around you. The pressure is immense.';
    },
    onEnd() {
      return 'The flood waters begin to recede as the charm stabilizes the library.';
    },
  });
}
