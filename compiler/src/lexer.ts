/**
 * Lexer for the Chord story DSL.
 *
 * Produces a flat token stream with INDENT/DEDENT tokens for
 * indentation-sensitive rule bodies.
 */

import type { SourceLocation } from './ast.js';

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

export type TokenType =
  | 'WORD'
  | 'QUOTED_STRING'
  | 'NUMBER'
  | 'DOT'
  | 'COLON'
  | 'SEMICOLON'
  | 'COMPARATOR'
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  loc: SourceLocation;
}

// ---------------------------------------------------------------------------
// Lexer
// ---------------------------------------------------------------------------

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  const lines = source.split(/\r?\n/);
  const indentStack: number[] = [0];

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const rawLine = lines[lineNum];
    const line = lineNum + 1;

    // Skip completely empty lines
    if (rawLine.trim() === '') {
      continue;
    }

    // Measure leading whitespace
    const stripped = rawLine.replace(/^\t/, '    '); // normalize tabs to 4 spaces
    const indent = stripped.length - stripped.trimStart().length;
    const content = stripped.trimStart();

    // Emit INDENT/DEDENT tokens
    const currentIndent = indentStack[indentStack.length - 1];
    if (indent > currentIndent) {
      indentStack.push(indent);
      tokens.push({ type: 'INDENT', value: '', loc: { line, col: 1 } });
    } else if (indent < currentIndent) {
      while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indent) {
        indentStack.pop();
        tokens.push({ type: 'DEDENT', value: '', loc: { line, col: 1 } });
      }
    }

    // Tokenize the line content
    let col = indent + 1;
    let pos = 0;

    while (pos < content.length) {
      // Skip whitespace within a line
      if (content[pos] === ' ' || content[pos] === '\t') {
        pos++;
        col++;
        continue;
      }

      // Quoted string
      if (content[pos] === '"') {
        const startCol = col;
        pos++; col++;
        let str = '';
        while (pos < content.length && content[pos] !== '"') {
          if (content[pos] === '\\' && pos + 1 < content.length) {
            str += content[pos + 1];
            pos += 2; col += 2;
          } else {
            str += content[pos];
            pos++; col++;
          }
        }
        if (pos < content.length) {
          pos++; col++; // skip closing quote
        }
        tokens.push({ type: 'QUOTED_STRING', value: str, loc: { line, col: startCol } });
        continue;
      }

      // Dot (sentence terminator)
      if (content[pos] === '.') {
        tokens.push({ type: 'DOT', value: '.', loc: { line, col } });
        pos++; col++;
        continue;
      }

      // Colon
      if (content[pos] === ':') {
        tokens.push({ type: 'COLON', value: ':', loc: { line, col } });
        pos++; col++;
        continue;
      }

      // Semicolon
      if (content[pos] === ';') {
        tokens.push({ type: 'SEMICOLON', value: ';', loc: { line, col } });
        pos++; col++;
        continue;
      }

      // Comparators
      if (content[pos] === '>' || content[pos] === '<' || content[pos] === '!' || content[pos] === '=') {
        const startCol = col;
        let op = content[pos];
        pos++; col++;
        if (pos < content.length && content[pos] === '=') {
          op += '=';
          pos++; col++;
        }
        tokens.push({ type: 'COMPARATOR', value: op, loc: { line, col: startCol } });
        continue;
      }

      // Number (digits, possibly negative)
      if (/[0-9]/.test(content[pos]) || (content[pos] === '-' && pos + 1 < content.length && /[0-9]/.test(content[pos + 1]))) {
        const startCol = col;
        let num = '';
        if (content[pos] === '-') {
          num += '-';
          pos++; col++;
        }
        while (pos < content.length && /[0-9]/.test(content[pos])) {
          num += content[pos];
          pos++; col++;
        }
        tokens.push({ type: 'NUMBER', value: num, loc: { line, col: startCol } });
        continue;
      }

      // Em-dash (—) or en-dash (–) treated as word separator, skip
      if (content[pos] === '\u2014' || content[pos] === '\u2013') {
        pos++; col++;
        continue;
      }

      // Word (letters, digits, underscores, hyphens, apostrophes)
      if (/[a-zA-Z_']/.test(content[pos])) {
        const startCol = col;
        let word = '';
        while (pos < content.length && /[a-zA-Z0-9_'\-]/.test(content[pos])) {
          word += content[pos];
          pos++; col++;
        }
        tokens.push({ type: 'WORD', value: word, loc: { line, col: startCol } });
        continue;
      }

      // Skip unknown characters
      pos++; col++;
    }

    // End of line
    tokens.push({ type: 'NEWLINE', value: '', loc: { line, col } });
  }

  // Close remaining indents
  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push({ type: 'DEDENT', value: '', loc: { line: lines.length, col: 1 } });
  }

  tokens.push({ type: 'EOF', value: '', loc: { line: lines.length + 1, col: 1 } });
  return tokens;
}
