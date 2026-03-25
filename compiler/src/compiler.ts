/**
 * Compiler — public API that wires lexer → parser → analyzer → codegen.
 */

import { tokenize } from './lexer.js';
import { Parser, CompileError } from './parser.js';
import { analyze } from './analyzer.js';
import { generate } from './codegen.js';
import type { StoryFile, Diagnostic } from './ast.js';

export interface CompileResult {
  /** Generated TypeScript source code. Empty string if errors occurred. */
  code: string;
  /** The parsed AST (available even with errors for partial results). */
  ast: StoryFile | null;
  /** Compilation errors. */
  errors: CompileError[];
  /** Graduated diagnostics (informational, suggestion, warning, error). */
  diagnostics: Diagnostic[];
}

export interface CompileOptions {
  /** If true, only parse and validate — don't generate code. */
  checkOnly?: boolean;
}

/**
 * Compile a Chord story source file to TypeScript.
 *
 * @param source - The story DSL source text
 * @param options - Compilation options
 * @returns The compilation result with generated code and/or errors
 */
export function compile(source: string, options: CompileOptions = {}): CompileResult {
  const allErrors: CompileError[] = [];

  // Lex
  const tokens = tokenize(source);

  // Parse
  const parser = new Parser(tokens);
  const { ast, errors: parseErrors } = parser.parse();
  allErrors.push(...parseErrors);

  if (allErrors.length > 0 && !ast) {
    return { code: '', ast: null, errors: allErrors, diagnostics: [] };
  }

  // Analyze
  const analysis = analyze(ast);
  allErrors.push(...analysis.errors);

  if (options.checkOnly || allErrors.length > 0) {
    return { code: '', ast, errors: allErrors, diagnostics: analysis.diagnostics };
  }

  // Generate
  const code = generate(ast, analysis);

  return { code, ast, errors: [], diagnostics: analysis.diagnostics };
}
