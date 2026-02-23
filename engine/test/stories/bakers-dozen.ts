/**
 * The Baker's Dozen — a whimsical baking simulation.
 *
 * Collect ingredients, mix dough, bake bread, and stock the
 * display counter. Reach 13 baked goods to complete the story.
 *
 * Features exercised: property counters, multiple concurrent scenes,
 * dynamic object creation via db.exec(), turn-counter logic,
 * multiple every-turn rules at different priorities, db.queryAll/queryValue.
 */

import type { Engine } from '../../src/engine.js';

export function loadBakersDozens(engine: Engine): void {
  // -------------------------------------------------------------------
  // Kinds
  // -------------------------------------------------------------------
  engine.addKind('ingredient', 'thing');
  engine.addKind('baked_good', 'thing');

  // -------------------------------------------------------------------
  // Rooms
  // -------------------------------------------------------------------
  engine.addObject(
    'bakery_front', 'room', undefined,
    'The cheerful shop front. A glass display counter awaits baked goods.',
  );
  engine.addObject(
    'kitchen', 'room', undefined,
    'A warm kitchen with a mixing bowl on the counter and a cast-iron oven against the wall.',
  );
  engine.addObject(
    'pantry', 'room', undefined,
    'A cool pantry lined with shelves of baking supplies.',
  );

  // Exits
  engine.addBidirectionalExit('bakery_front', 'south', 'kitchen', 'north');
  engine.addBidirectionalExit('kitchen', 'west', 'pantry', 'east');

  // -------------------------------------------------------------------
  // Objects
  // -------------------------------------------------------------------
  engine.addObject(
    'display_counter', 'container', 'bakery_front',
    'A glass display counter for showing off baked goods.',
  );
  engine.setProperty('display_counter', 'open', 'true');

  engine.addObject(
    'mixing_bowl', 'container', 'kitchen',
    'A large ceramic mixing bowl.',
  );
  engine.setProperty('mixing_bowl', 'open', 'true');

  engine.addObject(
    'oven', 'container', 'kitchen',
    'A heavy cast-iron oven.',
  );
  engine.setProperty('oven', 'open', 'false');
  engine.setProperty('oven', 'baking', 'false');
  engine.setProperty('oven', 'bake_turn', '0');

  engine.addObject(
    'flour_sack', 'ingredient', 'pantry',
    'A large sack of flour.',
  );
  engine.addObject(
    'sugar_jar', 'ingredient', 'pantry',
    'A jar of fine sugar.',
  );
  engine.addObject(
    'butter_crock', 'ingredient', 'pantry',
    'A crock of fresh butter.',
  );
  engine.addObject(
    'egg_basket', 'ingredient', 'pantry',
    'A basket of brown eggs.',
  );

  engine.addObject(
    'recipe_book', 'thing', 'kitchen',
    'A well-worn recipe book. It reads: "Put flour, sugar, butter, and eggs in the mixing bowl. Take the dough and put it in the oven. Wait a few turns, then open the oven."',
  );

  // Player tracks baked goods count
  engine.setProperty('player', 'goods_baked', '0');

  // -------------------------------------------------------------------
  // Place player
  // -------------------------------------------------------------------
  engine.placePlayer('bakery_front');

  // -------------------------------------------------------------------
  // Story-specific rules
  // -------------------------------------------------------------------

  // After putting an ingredient in the mixing bowl — check for all 4
  engine.registerRule('put', {
    name: 'after-put-ingredient-in-bowl',
    priority: 120,
    phase: 'after',
    condition(db, action) {
      if (action.second !== 'mixing_bowl') return false;
      return db.isKindOf(action.noun!, 'ingredient');
    },
    body(db) {
      const contents = db.getContents('mixing_bowl');
      const ingredients = contents.filter(t => db.isKindOf(t.id, 'ingredient'));

      if (ingredients.length >= 4) {
        // Remove ingredients from bowl
        for (const ing of ingredients) {
          db.removeFrom(ing.id);
        }
        // Create dough in the bowl
        db.exec(
          "INSERT OR IGNORE INTO objects (id, kind, location, description) VALUES ('dough', 'thing', 'mixing_bowl', 'A ball of fresh dough.')"
        );
        return {
          outcome: 'continue',
          output: 'The ingredients combine into a ball of dough!',
        };
      }

      return {
        outcome: 'continue',
        output: `Added to the bowl. ${4 - ingredients.length} ingredient(s) still needed.`,
      };
    },
  });

  // After putting dough in the oven — start baking
  engine.registerRule('put', {
    name: 'after-put-dough-in-oven',
    priority: 115,
    phase: 'after',
    condition(_db, action) {
      return action.noun === 'dough' && action.second === 'oven';
    },
    body(db) {
      db.setProperty('oven', 'baking', 'true');
      const turn = db.queryValue("SELECT value FROM meta WHERE key = 'turn'") as string;
      db.setProperty('oven', 'bake_turn', turn);
      return {
        outcome: 'continue',
        output: 'You slide the dough into the oven. Now you wait...',
      };
    },
  });

  // Instead of opening oven when baking is in progress and < 3 turns
  engine.registerRule('open', {
    name: 'instead-open-oven-too-early',
    priority: 130,
    phase: 'instead',
    condition(db, action) {
      if (action.noun !== 'oven') return false;
      if (db.getProperty('oven', 'baking') !== 'true') return false;
      const currentTurn = parseInt(
        db.queryValue("SELECT value FROM meta WHERE key = 'turn'") as string, 10
      );
      const bakeTurn = parseInt(db.getProperty('oven', 'bake_turn') ?? '0', 10);
      return (currentTurn - bakeTurn) < 3;
    },
    body() {
      return {
        outcome: 'stop',
        output: 'The oven is still hot and the bread needs more time. Give it a moment.',
      };
    },
  });

  // After opening oven when baking is complete (3+ turns)
  engine.registerRule('open', {
    name: 'after-open-oven-baking-done',
    priority: 120,
    phase: 'after',
    condition(db, action) {
      if (action.noun !== 'oven') return false;
      if (db.getProperty('oven', 'baking') !== 'true') return false;
      const currentTurn = parseInt(
        db.queryValue("SELECT value FROM meta WHERE key = 'turn'") as string, 10
      );
      const bakeTurn = parseInt(db.getProperty('oven', 'bake_turn') ?? '0', 10);
      return (currentTurn - bakeTurn) >= 3;
    },
    body(db) {
      // Remove dough, create bread
      db.exec("DELETE FROM objects WHERE id = 'dough'");
      const count = parseInt(db.getProperty('player', 'goods_baked') ?? '0', 10);
      const newCount = count + 1;
      const breadId = `fresh_bread_${newCount}`;
      db.exec(
        `INSERT OR IGNORE INTO objects (id, kind, location, description) VALUES ('${breadId}', 'baked_good', 'oven', 'A perfect golden loaf, still warm.')`
      );
      db.setProperty('player', 'goods_baked', String(newCount));
      db.setProperty('oven', 'baking', 'false');
      return {
        outcome: 'continue',
        output: `A perfect golden loaf emerges! That is loaf number ${newCount}.`,
      };
    },
  });

  // After putting bread in display counter — count items
  engine.registerRule('put', {
    name: 'after-put-bread-in-display',
    priority: 110,
    phase: 'after',
    condition(db, action) {
      if (action.second !== 'display_counter') return false;
      return db.isKindOf(action.noun!, 'baked_good');
    },
    body(db) {
      const displayItems = db.getContents('display_counter');
      const breads = displayItems.filter(t => db.isKindOf(t.id, 'baked_good'));
      return {
        outcome: 'continue',
        output: `The display now holds ${breads.length} item(s). You need 13 for a baker's dozen!`,
      };
    },
  });

  // -------------------------------------------------------------------
  // Every-turn rules (different priorities)
  // -------------------------------------------------------------------
  engine.registerEveryTurnRule({
    name: 'oven-warmth',
    priority: 20,
    condition(db) {
      if (db.getLocation('player') !== 'kitchen') return false;
      return db.getProperty('oven', 'baking') === 'true';
    },
    body() {
      return {
        outcome: 'continue',
        output: 'The oven radiates warmth. Something smells wonderful.',
      };
    },
  });

  engine.registerEveryTurnRule({
    name: 'customer-browsing',
    priority: 15,
    condition(db) {
      if (db.getLocation('player') !== 'bakery_front') return false;
      const count = parseInt(db.getProperty('player', 'goods_baked') ?? '0', 10);
      return count >= 3;
    },
    body() {
      return {
        outcome: 'continue',
        output: 'Customers browse the display counter appreciatively.',
      };
    },
  });

  engine.registerEveryTurnRule({
    name: 'pantry-inventory',
    priority: 5,
    condition(db) {
      return db.getLocation('player') === 'pantry';
    },
    body(db) {
      const items = db.getContents('pantry');
      const ingredients = items.filter(t => db.isKindOf(t.id, 'ingredient'));
      if (ingredients.length === 0) {
        return { outcome: 'continue', output: 'The pantry shelves are bare.' };
      }
      const names = ingredients.map(t => t.id.replace(/_/g, ' '));
      return {
        outcome: 'continue',
        output: `Available supplies: ${names.join(', ')}.`,
      };
    },
  });

  // -------------------------------------------------------------------
  // Scenes (three concurrent, based on goods_baked counter)
  // -------------------------------------------------------------------
  engine.registerScene({
    name: 'morning_rush',
    beginsWhen(db) {
      const count = parseInt(db.getProperty('player', 'goods_baked') ?? '0', 10);
      return count >= 1;
    },
    endsWhen(db) {
      const count = parseInt(db.getProperty('player', 'goods_baked') ?? '0', 10);
      return count >= 5;
    },
    onBegin() {
      return 'The morning customers start arriving! The bell above the door jingles.';
    },
    onEnd() {
      return 'The morning rush subsides. Time for the afternoon crowd.';
    },
  });

  engine.registerScene({
    name: 'afternoon_lull',
    beginsWhen(db) {
      const count = parseInt(db.getProperty('player', 'goods_baked') ?? '0', 10);
      return count >= 5;
    },
    endsWhen(db) {
      const count = parseInt(db.getProperty('player', 'goods_baked') ?? '0', 10);
      return count >= 10;
    },
    onBegin() {
      return 'The afternoon crowd trickles in, looking for fresh pastries.';
    },
    onEnd() {
      return 'Almost closing time... just a few more loaves!';
    },
  });

  engine.registerScene({
    name: 'closing_time',
    beginsWhen(db) {
      const count = parseInt(db.getProperty('player', 'goods_baked') ?? '0', 10);
      return count >= 10;
    },
    endsWhen(db) {
      const count = parseInt(db.getProperty('player', 'goods_baked') ?? '0', 10);
      return count >= 13;
    },
    onBegin() {
      return 'Last call for baked goods! The end of the day approaches.';
    },
    onEnd() {
      return "Congratulations! You have baked a baker's dozen! The shop is a tremendous success!";
    },
  });
}
