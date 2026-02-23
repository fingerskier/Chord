import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Engine } from '../engine/src/engine.js';
import { loadClockworkGarden } from './stories/clockwork-garden.js';
import { loadSunkenLibrary } from './stories/sunken-library.js';
import { loadBakersDozens } from './stories/bakers-dozen.js';

// =========================================================================
// The Clockwork Garden
// =========================================================================

describe('Clockwork Garden', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
    loadClockworkGarden(engine);
  });

  afterEach(() => {
    engine.close();
  });

  describe('initialization', () => {
    it('places player in garden gate', () => {
      expect(engine.getObject('player')!.location).toBe('garden_gate');
    });

    it('creates all four rooms', () => {
      expect(engine.getObject('garden_gate')).not.toBeNull();
      expect(engine.getObject('rose_terrace')).not.toBeNull();
      expect(engine.getObject('greenhouse')).not.toBeNull();
      expect(engine.getObject('clock_tower_base')).not.toBeNull();
    });

    it('creates gear objects', () => {
      expect(engine.getObject('bronze_gear')).not.toBeNull();
      expect(engine.getObject('silver_gear')).not.toBeNull();
      expect(engine.getObject('gold_gear')).not.toBeNull();
    });
  });

  describe('containers', () => {
    it('opens display case to reveal bronze gear', () => {
      const output = engine.turn('open display case');
      expect(output.join('\n')).toContain('open');
      const takeOutput = engine.turn('take bronze gear');
      expect(takeOutput.join('\n')).toContain('Taken');
    });

    it('opens cracked fountain to reveal silver gear', () => {
      engine.turn('east'); // rose_terrace
      engine.turn('open cracked fountain');
      const output = engine.turn('take silver gear');
      expect(output.join('\n')).toContain('Taken');
    });

    it('gold gear is directly takeable in greenhouse', () => {
      engine.turn('south'); // greenhouse
      const output = engine.turn('take gold gear');
      expect(output.join('\n')).toContain('Taken');
    });
  });

  describe('clockwork bird', () => {
    it('blocks taking the bird before assembly', () => {
      engine.turn('east');  // rose_terrace
      engine.turn('south'); // clock_tower_base
      const output = engine.turn('take clockwork bird');
      expect(output.join('\n')).toContain('bolted firmly');
    });

    it('allows taking the bird after assembly', () => {
      // Collect all gears and assemble
      engine.turn('open display case');
      engine.turn('take bronze gear');
      engine.turn('south'); // greenhouse
      engine.turn('take gold gear');
      engine.turn('put bronze gear in workbench');
      engine.turn('put gold gear in workbench');
      engine.turn('north'); // garden_gate
      engine.turn('east');  // rose_terrace
      engine.turn('open cracked fountain');
      engine.turn('take silver gear');
      engine.turn('west');  // garden_gate
      engine.turn('south'); // greenhouse
      engine.turn('put silver gear in workbench');
      // Bird should now be assembled
      engine.turn('east');  // clock_tower_base
      const output = engine.turn('take clockwork bird');
      expect(output.join('\n')).toContain('flutter');
    });
  });

  describe('assembly mechanics', () => {
    it('counts gears placed on workbench', () => {
      engine.turn('open display case');
      engine.turn('take bronze gear');
      engine.turn('south'); // greenhouse
      const output = engine.turn('put bronze gear in workbench');
      expect(output.join('\n')).toContain('1 of 3');
    });

    it('assembles bird when all three gears are placed', () => {
      engine.turn('open display case');
      engine.turn('take bronze gear');
      engine.turn('south'); // greenhouse
      engine.turn('take gold gear');
      engine.turn('put bronze gear in workbench');
      engine.turn('put gold gear in workbench');
      engine.turn('north'); // garden_gate
      engine.turn('east');  // rose_terrace
      engine.turn('open cracked fountain');
      engine.turn('take silver gear');
      engine.turn('west');  // garden_gate
      engine.turn('south'); // greenhouse
      const output = engine.turn('put silver gear in workbench');
      expect(output.join('\n')).toContain('whirring');
    });
  });

  describe('every-turn rule', () => {
    it('clicks gears on workbench', () => {
      engine.turn('open display case');
      engine.turn('take bronze gear');
      engine.turn('south'); // greenhouse
      engine.turn('put bronze gear in workbench');
      const output = engine.turn('look');
      expect(output.join('\n')).toContain('click softly');
    });
  });

  describe('scene', () => {
    it('fires assembly scene begin on first gear', () => {
      engine.turn('open display case');
      engine.turn('take bronze gear');
      engine.turn('south'); // greenhouse
      const output = engine.turn('put bronze gear in workbench');
      expect(output.join('\n')).toContain('anticipation');
    });

    it('fires assembly scene end when all gears placed', () => {
      engine.turn('open display case');
      engine.turn('take bronze gear');
      engine.turn('south');
      engine.turn('take gold gear');
      engine.turn('put bronze gear in workbench');
      engine.turn('put gold gear in workbench');
      engine.turn('north');
      engine.turn('east');
      engine.turn('open cracked fountain');
      engine.turn('take silver gear');
      engine.turn('west');
      engine.turn('south');
      const output = engine.turn('put silver gear in workbench');
      expect(output.join('\n')).toContain('springs to life');
    });
  });
});

// =========================================================================
// The Sunken Library
// =========================================================================

describe('Sunken Library', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
    loadSunkenLibrary(engine);
  });

  afterEach(() => {
    engine.close();
  });

  describe('initialization', () => {
    it('places player in entrance hall', () => {
      expect(engine.getObject('player')!.location).toBe('entrance_hall');
    });

    it('creates all five rooms', () => {
      expect(engine.getObject('entrance_hall')).not.toBeNull();
      expect(engine.getObject('reading_room')).not.toBeNull();
      expect(engine.getObject('deep_archive')).not.toBeNull();
      expect(engine.getObject('coral_gallery')).not.toBeNull();
      expect(engine.getObject('librarian_office')).not.toBeNull();
    });
  });

  describe('movement', () => {
    it('goes east to reading room', () => {
      const output = engine.turn('east');
      expect(output.join('\n')).toContain('Reading Room');
    });

    it('goes northeast to coral gallery', () => {
      const output = engine.turn('northeast');
      expect(output.join('\n')).toContain('Coral Gallery');
    });

    it('goes down to deep archive', () => {
      const output = engine.turn('down');
      expect(output.join('\n')).toContain('Deep Archive');
    });

    it('goes up from reading room to librarian office', () => {
      engine.turn('east');
      const output = engine.turn('up');
      expect(output.join('\n')).toContain('Librarian Office');
    });

    it('blocks going up from deep archive without charm', () => {
      engine.turn('down');
      const output = engine.turn('up');
      expect(output.join('\n')).toContain('water pressure');
    });

    it('allows going up from deep archive with charm', () => {
      engine.turn('northeast'); // coral_gallery
      engine.turn('take breathing charm');
      engine.turn('southwest'); // entrance_hall
      engine.turn('down'); // deep_archive
      const output = engine.turn('up');
      expect(output.join('\n')).toContain('bubble of air');
    });
  });

  describe('NPC interaction', () => {
    it('blocks taking the librarian', () => {
      engine.turn('east'); // reading_room
      const output = engine.turn('take librarian');
      expect(output.join('\n')).toContain('NOT a book');
    });
  });

  describe('replace/redirect', () => {
    it('redirects examine tome to take when not carrying', () => {
      engine.turn('down'); // deep_archive
      const output = engine.turn('examine glowing tome');
      // The replace outcome redirects to a take action
      expect(output.join('\n')).toContain('Taken');
      // Verify the tome is now carried
      expect(engine.getObject('glowing_tome')!.location).toBe('player');
    });
  });

  describe('sticky tome', () => {
    it('cannot drop the glowing tome', () => {
      engine.turn('down');
      engine.turn('take glowing tome');
      const output = engine.turn('drop glowing tome');
      expect(output.join('\n')).toContain('spectral tendrils');
    });
  });

  describe('breathing charm', () => {
    it('shows special message on take', () => {
      engine.turn('northeast');
      const output = engine.turn('take breathing charm');
      expect(output.join('\n')).toContain('wink');
    });
  });

  describe('every-turn rule', () => {
    it('tome hums when carried', () => {
      engine.turn('down');
      engine.turn('take glowing tome');
      const output = engine.turn('look');
      expect(output.join('\n')).toContain('hums softly');
    });
  });

  describe('scene', () => {
    it('fires flooding scene on entering deep archive', () => {
      const output = engine.turn('down');
      expect(output.join('\n')).toContain('Water rushes in');
    });

    it('fires flooding scene end on return with charm', () => {
      engine.turn('northeast'); // coral_gallery
      engine.turn('take breathing charm');
      engine.turn('southwest'); // entrance_hall
      engine.turn('down'); // deep_archive — scene begins
      const output = engine.turn('up'); // back to entrance_hall with charm — scene ends
      expect(output.join('\n')).toContain('recede');
    });
  });
});

// =========================================================================
// The Baker's Dozen
// =========================================================================

describe("Baker's Dozen", () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
    loadBakersDozens(engine);
  });

  afterEach(() => {
    engine.close();
  });

  describe('initialization', () => {
    it('places player in bakery front', () => {
      expect(engine.getObject('player')!.location).toBe('bakery_front');
    });

    it('creates rooms', () => {
      expect(engine.getObject('bakery_front')).not.toBeNull();
      expect(engine.getObject('kitchen')).not.toBeNull();
      expect(engine.getObject('pantry')).not.toBeNull();
    });

    it('creates ingredients in pantry', () => {
      expect(engine.getObject('flour_sack')!.location).toBe('pantry');
      expect(engine.getObject('sugar_jar')!.location).toBe('pantry');
      expect(engine.getObject('butter_crock')!.location).toBe('pantry');
      expect(engine.getObject('egg_basket')!.location).toBe('pantry');
    });
  });

  describe('baking mechanic', () => {
    function collectAndMixIngredients() {
      engine.turn('south'); // kitchen
      engine.turn('west');  // pantry
      engine.turn('take flour sack');
      engine.turn('take sugar jar');
      engine.turn('take butter crock');
      engine.turn('take egg basket');
      engine.turn('east');  // kitchen
      engine.turn('put flour sack in mixing bowl');
      engine.turn('put sugar jar in mixing bowl');
      engine.turn('put butter crock in mixing bowl');
    }

    it('counts ingredients in the bowl', () => {
      engine.turn('south');
      engine.turn('west');
      engine.turn('take flour sack');
      engine.turn('east');
      const output = engine.turn('put flour sack in mixing bowl');
      expect(output.join('\n')).toContain('3 ingredient(s) still needed');
    });

    it('combines ingredients into dough when all four are added', () => {
      collectAndMixIngredients();
      const output = engine.turn('put egg basket in mixing bowl');
      expect(output.join('\n')).toContain('ball of dough');
    });

    it('blocks opening oven too early', () => {
      collectAndMixIngredients();
      engine.turn('put egg basket in mixing bowl');
      engine.turn('take dough');
      engine.turn('open oven');
      engine.turn('put dough in oven');
      engine.turn('close oven');
      const output = engine.turn('open oven');
      expect(output.join('\n')).toContain('needs more time');
    });

    it('produces bread after enough turns', () => {
      collectAndMixIngredients();
      engine.turn('put egg basket in mixing bowl');
      engine.turn('take dough');
      engine.turn('open oven');
      engine.turn('put dough in oven');
      engine.turn('close oven');
      // Wait 3 turns
      engine.turn('look');
      engine.turn('look');
      engine.turn('look');
      const output = engine.turn('open oven');
      expect(output.join('\n')).toContain('golden loaf');
    });
  });

  describe('counter properties', () => {
    it('starts with zero goods baked', () => {
      expect(engine.db.getProperty('player', 'goods_baked')).toBe('0');
    });
  });

  describe('every-turn rules', () => {
    it('reports oven warmth when baking', () => {
      engine.turn('south'); // kitchen
      engine.turn('west');  // pantry
      engine.turn('take flour sack');
      engine.turn('take sugar jar');
      engine.turn('take butter crock');
      engine.turn('take egg basket');
      engine.turn('east');  // kitchen
      engine.turn('put flour sack in mixing bowl');
      engine.turn('put sugar jar in mixing bowl');
      engine.turn('put butter crock in mixing bowl');
      engine.turn('put egg basket in mixing bowl');
      engine.turn('take dough');
      engine.turn('open oven');
      engine.turn('put dough in oven');
      engine.turn('close oven');
      const output = engine.turn('look');
      expect(output.join('\n')).toContain('radiates warmth');
    });

    it('lists ingredients in pantry', () => {
      engine.turn('south');
      engine.turn('west');
      const output = engine.turn('look');
      expect(output.join('\n')).toContain('flour sack');
    });
  });

  describe('recipe book', () => {
    it('can examine recipe book for instructions', () => {
      engine.turn('south');
      const output = engine.turn('examine recipe book');
      expect(output.join('\n')).toContain('flour');
    });
  });
});
