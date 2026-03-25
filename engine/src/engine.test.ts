import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Engine } from './engine.js';
import { loadDemoStory } from './demo-story.js';

describe('Engine', () => {
  let engine: Engine;

  beforeEach(() => {
    engine = new Engine();
    loadDemoStory(engine);
  });

  afterEach(() => {
    engine.close();
  });

  describe('initialization', () => {
    it('creates player object', () => {
      const player = engine.getObject('player');
      expect(player).not.toBeNull();
      expect(player!.kind).toBe('person');
    });

    it('places player in dark cave', () => {
      const player = engine.getObject('player');
      expect(player!.location).toBe('dark_cave');
    });

    it('creates rooms', () => {
      expect(engine.getObject('dark_cave')).not.toBeNull();
      expect(engine.getObject('sunlit_clearing')).not.toBeNull();
    });

    it('creates objects', () => {
      expect(engine.getObject('brass_lamp')).not.toBeNull();
      expect(engine.getObject('wooden_chest')).not.toBeNull();
      expect(engine.getObject('silver_key')).not.toBeNull();
    });
  });

  describe('look', () => {
    it('describes the current room', () => {
      const output = engine.look();
      expect(output.join('\n')).toContain('Dark Cave');
      expect(output.join('\n')).toContain('damp, dark cave');
    });

    it('lists visible objects', () => {
      const output = engine.look();
      expect(output.join('\n')).toContain('brass lamp');
    });

    it('lists exits', () => {
      const output = engine.look();
      expect(output.join('\n')).toContain('north');
    });
  });

  describe('movement', () => {
    it('moves player north', () => {
      const output = engine.turn('north');
      expect(output.join('\n')).toContain('Sunlit Clearing');
    });

    it('moves player south from clearing', () => {
      engine.turn('north');
      const output = engine.turn('south');
      expect(output.join('\n')).toContain('Dark Cave');
    });

    it('rejects invalid direction', () => {
      const output = engine.turn('east');
      expect(output.join('\n')).toContain("can't go that way");
    });

    it('supports abbreviated directions', () => {
      const output = engine.turn('n');
      expect(output.join('\n')).toContain('Sunlit Clearing');
    });

    it('supports go + direction', () => {
      const output = engine.turn('go north');
      expect(output.join('\n')).toContain('Sunlit Clearing');
    });
  });

  describe('taking', () => {
    it('takes an object', () => {
      const output = engine.turn('take brass lamp');
      expect(output.join('\n')).toContain('Taken');
    });

    it('refuses to take something already carried', () => {
      engine.turn('take brass lamp');
      const output = engine.turn('take brass lamp');
      expect(output.join('\n')).toContain('already carrying');
    });

    it('refuses to take a room', () => {
      const output = engine.turn('take dark cave');
      expect(output.join('\n')).toContain('not something you can pick up');
    });

    it('refuses to take with no noun', () => {
      const output = engine.turn('take');
      expect(output.join('\n')).toContain('What do you want to take');
    });
  });

  describe('dropping', () => {
    it('drops a carried object', () => {
      engine.turn('take brass lamp');
      const output = engine.turn('drop brass lamp');
      expect(output.join('\n')).toContain('Dropped');
    });

    it('refuses to drop something not carried', () => {
      const output = engine.turn('drop brass lamp');
      expect(output.join('\n')).toContain('not carrying');
    });
  });

  describe('inventory', () => {
    it('shows empty-handed when carrying nothing', () => {
      const output = engine.turn('inventory');
      expect(output.join('\n')).toContain('empty-handed');
    });

    it('lists carried items', () => {
      engine.turn('take brass lamp');
      const output = engine.turn('i');
      expect(output.join('\n')).toContain('Brass Lamp');
    });
  });

  describe('examining', () => {
    it('shows object description', () => {
      const output = engine.turn('examine brass lamp');
      expect(output.join('\n')).toContain('brass lamp');
    });

    it('short form x works', () => {
      const output = engine.turn('x brass lamp');
      expect(output.join('\n')).toContain('brass lamp');
    });

    it('refuses with no noun', () => {
      const output = engine.turn('examine');
      expect(output.join('\n')).toContain('What do you want to examine');
    });
  });

  describe('open/close', () => {
    it('opens a container', () => {
      engine.turn('north'); // go to clearing
      const output = engine.turn('open wooden chest');
      expect(output.join('\n')).toContain('open');
    });

    it('refuses to open a non-container', () => {
      const output = engine.turn('open brass lamp');
      expect(output.join('\n')).toContain('not something you can open');
    });

    it('closes an open container', () => {
      engine.turn('north');
      engine.turn('open wooden chest');
      const output = engine.turn('close wooden chest');
      expect(output.join('\n')).toContain('Closed');
    });
  });

  describe('story rules', () => {
    it('blocks taking hot lamp', () => {
      engine.db.setProperty('brass_lamp', 'lit', 'true');
      const output = engine.turn('take brass lamp');
      expect(output.join('\n')).toContain('too hot');
    });

    it('fires after-take rule for silver key', () => {
      engine.turn('north');
      engine.turn('open wooden chest');
      const output = engine.turn('take silver key');
      expect(output.join('\n')).toContain('shimmer');
    });

    it('fires every-turn darkness warning in dark cave', () => {
      const output = engine.turn('look');
      expect(output.join('\n')).toContain('skittering');
    });

    it('does not fire darkness warning in clearing', () => {
      engine.turn('north');
      const output = engine.turn('look');
      expect(output.join('\n')).not.toContain('skittering');
    });
  });

  describe('turn counter', () => {
    it('starts at 0', () => {
      expect(engine.getTurn()).toBe(0);
    });

    it('increments after a successful turn', () => {
      engine.turn('look');
      expect(engine.getTurn()).toBe(1);
    });
  });

  describe('unknown commands', () => {
    it('returns error for gibberish', () => {
      const output = engine.turn('xyzzy');
      expect(output).toContain("I didn't understand that.");
    });
  });

  describe('verb synonyms', () => {
    it('get = take', () => {
      const output = engine.turn('get brass lamp');
      expect(output.join('\n')).toContain('Taken');
    });

    it('grab = take', () => {
      const output = engine.turn('grab brass lamp');
      expect(output.join('\n')).toContain('Taken');
    });

    it('l = look', () => {
      const output = engine.turn('l');
      expect(output.join('\n')).toContain('Dark Cave');
    });
  });

  describe('error boundaries (D8 fail-safe)', () => {
    it('survives a throwing rule and continues cascade', () => {
      engine.registerRule('take', {
        priority: 1000,
        phase: 'before',
        name: 'exploding-rule',
        condition: () => true,
        body: () => { throw new Error('BOOM'); },
      });

      engine.registerRule('take', {
        priority: 500,
        phase: 'after',
        name: 'after-take-msg',
        condition: (_db, action) => action.noun === 'brass_lamp',
        body: () => ({ outcome: 'continue' as const, output: 'You took it!' }),
      });

      const output = engine.turn('take lamp');
      expect(output).toBeDefined();
      expect(output.join('\n')).toContain('You took it!');
    });

    it('logs errors with provenance', () => {
      engine.registerRule('take', {
        priority: 1000,
        phase: 'before',
        name: 'bad-rule',
        condition: () => true,
        body: () => { throw new Error('test error'); },
      });

      engine.turn('take lamp');
      const errors = engine.getRuntimeErrors();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].ruleName).toBe('bad-rule');
      expect(errors[0].phase).toBe('before');
      expect(errors[0].verb).toBe('take');
      expect(errors[0].detail).toContain('test error');
    });

    it('clearRuntimeErrors resets the log', () => {
      engine.registerRule('take', {
        priority: 1000,
        phase: 'before',
        name: 'failing-rule',
        condition: () => true,
        body: () => { throw new Error('fail'); },
      });

      engine.turn('take lamp');
      expect(engine.getRuntimeErrors().length).toBeGreaterThan(0);
      engine.clearRuntimeErrors();
      expect(engine.getRuntimeErrors()).toHaveLength(0);
    });

    it('handles throwing every-turn rules gracefully', () => {
      engine.registerEveryTurnRule({
        priority: 100,
        name: 'bad-every-turn',
        condition: () => true,
        body: () => { throw new Error('every-turn boom'); },
      });

      const output = engine.turn('look');
      expect(output).toBeDefined();
      const errors = engine.getRuntimeErrors();
      expect(errors.some(e => e.detail.includes('every-turn boom'))).toBe(true);
    });
  });
});
