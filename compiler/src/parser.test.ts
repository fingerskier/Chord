import { describe, it, expect } from 'vitest';
import { tokenize } from './lexer.js';
import { Parser } from './parser.js';

function parse(source: string) {
  const tokens = tokenize(source);
  const parser = new Parser(tokens);
  return parser.parse();
}

describe('parser', () => {
  describe('kind declarations', () => {
    it('parses "A lamp is a kind of thing."', () => {
      const { ast, errors } = parse('A lamp is a kind of thing.');
      expect(errors).toHaveLength(0);
      expect(ast.declarations).toHaveLength(1);
      const decl = ast.declarations[0];
      expect(decl.type).toBe('kind_decl');
      if (decl.type === 'kind_decl') {
        expect(decl.name).toBe('lamp');
        expect(decl.parent).toBe('thing');
      }
    });
  });

  describe('property declarations', () => {
    it('parses "A lamp has a truth state called lit."', () => {
      const { ast, errors } = parse('A lamp has a truth state called lit.');
      expect(errors).toHaveLength(0);
      const decl = ast.declarations[0];
      expect(decl.type).toBe('property_decl');
      if (decl.type === 'property_decl') {
        expect(decl.kindName).toBe('lamp');
        expect(decl.propertyType).toBe('truth_state');
        expect(decl.propertyName).toBe('lit');
      }
    });
  });

  describe('default declarations', () => {
    it('parses "A lamp is usually not lit."', () => {
      const { ast, errors } = parse('A lamp is usually not lit.');
      expect(errors).toHaveLength(0);
      const decl = ast.declarations[0];
      expect(decl.type).toBe('default_decl');
      if (decl.type === 'default_decl') {
        expect(decl.kindName).toBe('lamp');
        expect(decl.negated).toBe(true);
      }
    });
  });

  describe('object declarations', () => {
    it('parses room declaration with description', () => {
      const { ast, errors } = parse('The Dark Cave is a room. "You are in a cave."');
      expect(errors).toHaveLength(0);
      const decl = ast.declarations[0];
      expect(decl.type).toBe('object_decl');
      if (decl.type === 'object_decl') {
        expect(decl.name).toBe('Dark Cave');
        expect(decl.kind).toBe('room');
        expect(decl.description).toBe('You are in a cave.');
      }
    });

    it('parses object with location', () => {
      const { ast, errors } = parse('The brass lamp is a lamp in the Dark Cave.');
      expect(errors).toHaveLength(0);
      const decl = ast.declarations[0];
      expect(decl.type).toBe('object_decl');
      if (decl.type === 'object_decl') {
        expect(decl.name).toBe('brass lamp');
        expect(decl.kind).toBe('lamp');
        expect(decl.location).toBe('Dark Cave');
      }
    });
  });

  describe('relation declarations', () => {
    it('parses directional relation', () => {
      const { ast, errors } = parse('The Sunlit Clearing is north of the Dark Cave.');
      expect(errors).toHaveLength(0);
      const decl = ast.declarations[0];
      expect(decl.type).toBe('relation_decl');
      if (decl.type === 'relation_decl') {
        expect(decl.subjectName).toBe('Sunlit Clearing');
        expect(decl.direction).toBe('north');
        expect(decl.objectName).toBe('Dark Cave');
      }
    });
  });

  describe('rules', () => {
    it('parses instead rule with condition', () => {
      const source = `Instead of taking the brass lamp when the brass lamp is lit:
    say "The lamp is too hot to grab."`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.rules).toHaveLength(1);
      const rule = ast.rules[0];
      expect(rule.phase).toBe('instead');
      expect(rule.verb).toBe('take');
      expect(rule.nounPattern.type).toBe('specific');
      expect(rule.conditions).toHaveLength(1);
      expect(rule.body).toHaveLength(1);
    });

    it('parses after rule', () => {
      const source = `After taking the silver key:
    say "The key glints."`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.rules).toHaveLength(1);
      expect(ast.rules[0].phase).toBe('after');
    });

    it('parses carry out rule', () => {
      const source = `Carry out taking something:
    now the noun is carried by the player;
    remove the noun from its holder;`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.rules).toHaveLength(1);
      expect(ast.rules[0].phase).toBe('carry_out');
      expect(ast.rules[0].nounPattern.type).toBe('any');
    });
  });

  describe('every-turn rules', () => {
    it('parses every turn with conditions', () => {
      const source = `Every turn when the player is in the Dark Cave and the brass lamp is not lit:
    say "You hear something skittering."`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.everyTurnRules).toHaveLength(1);
      expect(ast.everyTurnRules[0].conditions).toHaveLength(2);
    });
  });

  describe('scenes', () => {
    it('parses scene declaration with begins/ends', () => {
      const source = `Darkness is a scene. Darkness begins when play begins. Darkness ends when the brass lamp is lit.`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.scenes).toHaveLength(1);
      expect(ast.scenes[0].name).toBe('Darkness');
      expect(ast.scenes[0].beginsWhen.type).toBe('play_begins');
      expect(ast.scenes[0].endsWhen.type).toBe('property_test');
    });
  });

  describe('player placement', () => {
    it('parses player start location', () => {
      const { ast, errors } = parse('The player is in the Dark Cave.');
      expect(errors).toHaveLength(0);
      expect(ast.playerStart).toBe('Dark Cave');
    });
  });

  describe('scene handlers', () => {
    it('parses When X ends handler', () => {
      const source = `When Darkness ends:
    say "The shadows retreat."`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.sceneHandlers).toHaveLength(1);
      expect(ast.sceneHandlers[0].sceneName).toBe('Darkness');
      expect(ast.sceneHandlers[0].event).toBe('ends');
    });
  });

  describe('annotations', () => {
    it('parses inline annotation before a declaration', () => {
      const source = `[open-world: true]
A person has number called loyalty.`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.declarations).toHaveLength(1);
      const decl = ast.declarations[0];
      expect(decl.annotations).toBeDefined();
      expect(decl.annotations!).toHaveLength(1);
      expect(decl.annotations![0].entries[0].key).toBe('open-world');
      expect(decl.annotations![0].entries[0].value).toBe('true');
    });

    it('parses multi-entry annotation', () => {
      const source = `[journal: enabled, depth: 10]
A person has number called suspicion.`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      const decl = ast.declarations[0];
      expect(decl.annotations).toBeDefined();
      expect(decl.annotations![0].entries).toHaveLength(2);
      expect(decl.annotations![0].entries[0].key).toBe('journal');
      expect(decl.annotations![0].entries[1].key).toBe('depth');
      expect(decl.annotations![0].entries[1].value).toBe('10');
    });

    it('parses annotation with quoted string value', () => {
      const source = `[name: "Every Turn"]
The Hall is a room.`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      const decl = ast.declarations[0];
      expect(decl.annotations![0].entries[0].key).toBe('name');
      expect(decl.annotations![0].entries[0].value).toBe('Every Turn');
    });

    it('parses annotation before a rule', () => {
      const source = `[schedule: clock]
After taking the lamp:
    say "Got it."`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.rules).toHaveLength(1);
      expect(ast.rules[0].annotations).toBeDefined();
      expect(ast.rules[0].annotations![0].entries[0].key).toBe('schedule');
    });

    it('unannotated code still works identically', () => {
      const source = `A lamp is a kind of thing.
The Hall is a room.`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.declarations).toHaveLength(2);
      expect(ast.declarations[0].annotations).toBeUndefined();
      expect(ast.declarations[1].annotations).toBeUndefined();
    });

    it('parses block annotations', () => {
      const source = `[begin structured]
A lamp is a kind of thing.
The Hall is a room.
[end structured]`;
      const { ast, errors } = parse(source);
      expect(errors).toHaveLength(0);
      expect(ast.declarations).toHaveLength(2);
      // Both declarations should have the block annotation
      expect(ast.declarations[0].annotations).toBeDefined();
      expect(ast.declarations[0].annotations![0].entries[0].key).toBe('block');
      expect(ast.declarations[0].annotations![0].entries[0].value).toBe('structured');
      expect(ast.declarations[1].annotations).toBeDefined();
    });
  });
});
