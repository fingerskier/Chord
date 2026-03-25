/**
 * Analyzer — name resolution, symbol table, and priority scoring.
 *
 * Validates the AST and enriches it with resolved IDs and computed priorities.
 */

import type {
  StoryFile,
  Declaration,
  RuleNode,
  EveryTurnRuleNode,
  NounPattern,
  Condition,
  Diagnostic,
  Annotation,
} from './ast.js';
import { nameToId } from './utils.js';
import { CompileError } from './parser.js';

// ---------------------------------------------------------------------------
// Symbol table
// ---------------------------------------------------------------------------

export interface SymbolTable {
  /** kind name → parent kind name */
  kinds: Map<string, string>;
  /** display name → { id, kind, location? } */
  objects: Map<string, { id: string; kind: string; location?: string }>;
  /** All declared property names per kind */
  properties: Map<string, { propType: string; propName: string }[]>;
  /** Default values: kindName → propName → { value, negated } */
  defaults: Map<string, Map<string, { value: string; negated: boolean }>>;
}

export interface AnalysisResult {
  symbols: SymbolTable;
  rulePriorities: Map<RuleNode, number>;
  everyTurnPriorities: Map<EveryTurnRuleNode, number>;
  errors: CompileError[];
  diagnostics: Diagnostic[];
}

// ---------------------------------------------------------------------------
// Analyze
// ---------------------------------------------------------------------------

export function analyze(ast: StoryFile): AnalysisResult {
  const errors: CompileError[] = [];
  const diagnostics: Diagnostic[] = [];
  const symbols: SymbolTable = {
    kinds: new Map([
      ['thing', ''],
      ['room', 'thing'],
      ['container', 'thing'],
      ['person', 'thing'],
    ]),
    objects: new Map(),
    properties: new Map(),
    defaults: new Map(),
  };

  // Pass 1: Collect kinds
  for (const decl of ast.declarations) {
    if (decl.type === 'kind_decl') {
      symbols.kinds.set(decl.name.toLowerCase(), decl.parent.toLowerCase());
    }
  }

  // Pass 2: Collect properties and defaults
  for (const decl of ast.declarations) {
    if (decl.type === 'property_decl') {
      const kindKey = decl.kindName.toLowerCase();
      if (!symbols.properties.has(kindKey)) {
        symbols.properties.set(kindKey, []);
      }
      symbols.properties.get(kindKey)!.push({
        propType: decl.propertyType,
        propName: decl.propertyName.toLowerCase(),
      });
    }
    if (decl.type === 'default_decl') {
      const kindKey = decl.kindName.toLowerCase();
      if (!symbols.defaults.has(kindKey)) {
        symbols.defaults.set(kindKey, new Map());
      }
      symbols.defaults.get(kindKey)!.set(decl.propertyName.toLowerCase(), {
        value: decl.value,
        negated: decl.negated,
      });
    }
  }

  // Pass 3: Collect objects
  for (const decl of ast.declarations) {
    if (decl.type === 'object_decl') {
      const id = nameToId(decl.name);
      const kind = decl.kind.toLowerCase();
      if (!symbols.kinds.has(kind)) {
        errors.push(new CompileError(
          `Unknown kind "${decl.kind}". Did you declare it with "A ${decl.kind} is a kind of thing."?`,
          decl.loc,
        ));
        diagnostics.push({
          severity: 'error',
          message: `Unknown kind "${decl.kind}".`,
          loc: decl.loc,
          suggestion: `Declare it with: A ${decl.kind} is a kind of thing.`,
        });
      }
      symbols.objects.set(decl.name.toLowerCase(), {
        id,
        kind,
        location: decl.location ? nameToId(decl.location) : undefined,
      });
    }
  }

  // Pass 4: Validate annotations
  const validKeys = new Set([
    'open-world', 'journal', 'depth', 'schedule', 'interval',
    'unknown-default', 'name', 'import', 'alias', 'block',
  ]);
  for (const decl of ast.declarations) {
    validateAnnotations(decl.annotations, validKeys, diagnostics);
  }
  for (const rule of ast.rules) {
    validateAnnotations(rule.annotations, validKeys, diagnostics);
  }
  for (const rule of ast.everyTurnRules) {
    validateAnnotations(rule.annotations, validKeys, diagnostics);
  }
  for (const scene of ast.scenes) {
    validateAnnotations(scene.annotations, validKeys, diagnostics);
  }

  // Pass 5: Compute rule priorities
  const rulePriorities = new Map<RuleNode, number>();
  for (const rule of ast.rules) {
    rulePriorities.set(rule, computeRulePriority(rule, symbols));
  }

  const everyTurnPriorities = new Map<EveryTurnRuleNode, number>();
  for (const rule of ast.everyTurnRules) {
    everyTurnPriorities.set(rule, computeEveryTurnPriority(rule));
  }

  return { symbols, rulePriorities, everyTurnPriorities, errors, diagnostics };
}

// ---------------------------------------------------------------------------
// Priority scoring (per MVP.md §3.4)
// ---------------------------------------------------------------------------

function computeRulePriority(rule: RuleNode, symbols: SymbolTable): number {
  let score = 0;

  // Noun pattern scoring
  switch (rule.nounPattern.type) {
    case 'specific': {
      const name = rule.nounPattern.name.toLowerCase();
      // Is it a known object?
      if (symbols.objects.has(name)) {
        score += 100;
      } else if (symbols.kinds.has(name)) {
        score += 50;
      } else {
        score += 100; // assume specific object
      }
      break;
    }
    case 'any':
      score += 10;
      break;
    case 'none':
      break;
  }

  // Condition scoring
  score += scoreConditions(rule.conditions);

  return score;
}

function computeEveryTurnPriority(rule: EveryTurnRuleNode): number {
  return 10 + scoreConditions(rule.conditions);
}

function scoreConditions(conditions: Condition[]): number {
  let score = 0;
  for (const cond of conditions) {
    score += 20; // each when-condition
    switch (cond.type) {
      case 'property_test':
        score += 30;
        break;
      case 'location_test':
        score += 15;
        break;
      case 'player_location_test':
        score += 15;
        break;
      case 'comparison':
        score += 20;
        break;
    }
  }
  return score;
}

// ---------------------------------------------------------------------------
// Annotation validation
// ---------------------------------------------------------------------------

function validateAnnotations(
  annotations: Annotation[] | undefined,
  validKeys: Set<string>,
  diagnostics: Diagnostic[],
): void {
  if (!annotations) return;
  for (const ann of annotations) {
    for (const entry of ann.entries) {
      if (!validKeys.has(entry.key.toLowerCase())) {
        diagnostics.push({
          severity: 'warning',
          message: `Unknown annotation key "${entry.key}".`,
          loc: ann.loc,
          suggestion: `Known keys: ${[...validKeys].filter(k => k !== 'block').join(', ')}`,
        });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers for codegen
// ---------------------------------------------------------------------------

/** Resolve a name reference (from the DSL) to an object ID. */
export function resolveObjectId(name: string, symbols: SymbolTable): string {
  const lower = name.toLowerCase();
  const entry = symbols.objects.get(lower);
  if (entry) return entry.id;
  // Special names
  if (lower === 'noun' || lower === 'the noun') return '__noun__';
  if (lower === 'second noun' || lower === 'the second noun') return '__second__';
  if (lower === 'player' || lower === 'the player') return 'player';
  // Fallback: convert name to ID
  return nameToId(name);
}
