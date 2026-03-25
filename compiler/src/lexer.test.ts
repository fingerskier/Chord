import { describe, it, expect } from 'vitest';
import { tokenize, type Token } from './lexer.js';

function types(tokens: Token[]): string[] {
  return tokens.map(t => t.type);
}

function values(tokens: Token[]): string[] {
  return tokens.filter(t => t.type === 'WORD' || t.type === 'QUOTED_STRING' || t.type === 'NUMBER')
    .map(t => t.value);
}

describe('lexer', () => {
  it('tokenizes a simple declaration', () => {
    const tokens = tokenize('A lamp is a kind of thing.');
    const words = values(tokens);
    expect(words).toEqual(['A', 'lamp', 'is', 'a', 'kind', 'of', 'thing']);
    expect(tokens.some(t => t.type === 'DOT')).toBe(true);
  });

  it('handles quoted strings', () => {
    const tokens = tokenize('The Dark Cave is a room. "You are in a cave."');
    const strings = tokens.filter(t => t.type === 'QUOTED_STRING');
    expect(strings).toHaveLength(1);
    expect(strings[0].value).toBe('You are in a cave.');
  });

  it('produces INDENT/DEDENT for indented blocks', () => {
    const source = `Before taking something:
    say "hello";
    stop.
After dropping:
    say "bye";`;
    const tokens = tokenize(source);
    const typeList = types(tokens);
    expect(typeList).toContain('INDENT');
    expect(typeList).toContain('DEDENT');
  });

  it('tracks line numbers', () => {
    const tokens = tokenize('line one.\nline two.');
    const lineOneTokens = tokens.filter(t => t.loc.line === 1);
    const lineTwoTokens = tokens.filter(t => t.loc.line === 2);
    expect(lineOneTokens.length).toBeGreaterThan(0);
    expect(lineTwoTokens.length).toBeGreaterThan(0);
  });

  it('handles empty lines', () => {
    const tokens = tokenize('A thing.\n\nB thing.');
    const words = values(tokens);
    expect(words).toEqual(['A', 'thing', 'B', 'thing']);
  });

  it('tokenizes comparators', () => {
    const tokens = tokenize('> >= < <= != =');
    const comps = tokens.filter(t => t.type === 'COMPARATOR');
    expect(comps.map(t => t.value)).toEqual(['>', '>=', '<', '<=', '!=', '=']);
  });

  it('tokenizes brackets and commas for annotations', () => {
    const tokens = tokenize('[open-world: true, depth: 10]');
    const typeList = types(tokens);
    expect(typeList).toContain('LBRACKET');
    expect(typeList).toContain('RBRACKET');
    expect(typeList).toContain('COMMA');
    expect(typeList).toContain('COLON');
    // Verify order: [ WORD : WORD , WORD : NUMBER ]
    const meaningful = tokens.filter(t => t.type !== 'NEWLINE' && t.type !== 'EOF');
    expect(meaningful[0].type).toBe('LBRACKET');
    expect(meaningful[meaningful.length - 1].type).toBe('RBRACKET');
  });

  it('does not tokenize brackets inside quoted strings', () => {
    const tokens = tokenize('"[hello world]"');
    expect(tokens.some(t => t.type === 'LBRACKET')).toBe(false);
    expect(tokens.some(t => t.type === 'RBRACKET')).toBe(false);
    const str = tokens.find(t => t.type === 'QUOTED_STRING');
    expect(str?.value).toBe('[hello world]');
  });
});
