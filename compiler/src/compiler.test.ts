import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile } from './compiler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goldenDir = path.join(__dirname, '..', 'test', 'golden');

describe('compiler', () => {
  it('compiles the dark cave example without errors', () => {
    const source = fs.readFileSync(path.join(goldenDir, 'dark-cave.chord'), 'utf-8');
    const result = compile(source);

    expect(result.errors).toHaveLength(0);
    expect(result.code).toBeTruthy();
    expect(result.code).toContain('loadStory');
    expect(result.code).toContain("import type { Engine } from '@chord/engine'");
  });

  it('generates kind declarations', () => {
    const source = `A lamp is a kind of thing.`;
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("engine.addKind('lamp', 'thing')");
  });

  it('generates object declarations with descriptions', () => {
    const source = `The Dark Cave is a room. "You are in a cave."`;
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("engine.addObject('dark_cave', 'room'");
    expect(result.code).toContain('You are in a cave.');
  });

  it('generates bidirectional exits', () => {
    const source = `
The Hall is a room.
The Garden is a room.
The Garden is north of the Hall.`;
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('addBidirectionalExit');
    expect(result.code).toContain("'north'");
    expect(result.code).toContain("'south'");
  });

  it('generates player placement', () => {
    const source = `
The Hall is a room.
The player is in the Hall.`;
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("engine.placePlayer('hall')");
  });

  it('generates rules with conditions', () => {
    const source = `
The lamp is a thing.
Instead of taking the lamp when the lamp is lit:
    say "Too hot!"`;
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain("registerRule('take'");
    expect(result.code).toContain("phase: 'instead'");
    expect(result.code).toContain("action.noun !== 'lamp'");
    expect(result.code).toContain("getProperty");
    expect(result.code).toContain("Too hot!");
    // Instead rules default to 'stop' (block the action)
    expect(result.code).toContain("outcome: 'stop'");
  });

  it('generates every-turn rules', () => {
    const source = `
The Cave is a room.
Every turn when the player is in the Cave:
    say "Drip drip."`;
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('registerEveryTurnRule');
    expect(result.code).toContain("getLocation('player')");
    expect(result.code).toContain('Drip drip.');
  });

  it('generates scenes with handlers', () => {
    const source = `
Darkness is a scene. Darkness begins when play begins. Darkness ends when the brass lamp is lit.

When Darkness ends:
    say "The shadows retreat."`;
    const result = compile(source);
    expect(result.errors).toHaveLength(0);
    expect(result.code).toContain('registerScene');
    expect(result.code).toContain("name: 'darkness'");
    expect(result.code).toContain('onEnd');
    expect(result.code).toContain('The shadows retreat.');
  });

  it('check-only mode does not generate code', () => {
    const source = `The Hall is a room.`;
    const result = compile(source, { checkOnly: true });
    expect(result.errors).toHaveLength(0);
    expect(result.code).toBe('');
    expect(result.ast).toBeTruthy();
  });

  it('full dark cave golden test produces valid TypeScript', () => {
    const source = fs.readFileSync(path.join(goldenDir, 'dark-cave.chord'), 'utf-8');
    const result = compile(source);

    expect(result.errors).toHaveLength(0);

    // Verify key elements are present
    const code = result.code;
    expect(code).toContain("engine.addKind('lamp', 'thing')");
    expect(code).toContain("engine.addObject('dark_cave', 'room'");
    expect(code).toContain("engine.addObject('sunlit_clearing', 'room'");
    expect(code).toContain('addBidirectionalExit');
    expect(code).toContain("engine.addObject('brass_lamp', 'lamp'");
    expect(code).toContain("engine.addObject('wooden_chest', 'container'");
    expect(code).toContain("engine.addObject('silver_key', 'thing'");
    expect(code).toContain("engine.placePlayer('dark_cave')");
    expect(code).toContain("registerRule('take'");
    expect(code).toContain("phase: 'instead'");
    expect(code).toContain("phase: 'after'");
    expect(code).toContain('registerEveryTurnRule');
    expect(code).toContain('registerScene');
    expect(code).toContain('The lamp is too hot to grab with bare hands.');
    expect(code).toContain('The key glints with an unusual shimmer');
    expect(code).toContain('You hear something skittering in the darkness.');
    expect(code).toContain('The shadows retreat.');
  });
});
