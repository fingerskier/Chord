/**
 * Chord Engine — entry point and public API.
 *
 * Re-exports everything needed by compiled stories and consumers.
 */

// Core engine
export { Engine } from './engine.js';
export type { EngineOptions } from './engine.js';

// World database
export { WorldDB } from './world-db.js';

// Runtime
export { Runtime } from './runtime.js';

// Registry
export { RulebookRegistry } from './rulebook-registry.js';

// Default rules
export { registerDefaultRules } from './rulebooks/index.js';

// Parser
export { parse } from './parser.js';

// Schema
export { SCHEMA_SQL, SEED_SQL } from './schema.js';

// Types
export type {
  Thing,
  Room,
  Container,
  Action,
  TakeAction,
  DropAction,
  GoAction,
  LookAction,
  ExamineAction,
  OpenAction,
  CloseAction,
  InventoryAction,
  PutAction,
  Phase,
  RuleResult,
  Rule,
  EveryTurnRule,
  SceneDefinition,
  WorldDBInterface,
  Rulebook,
  RulebookRegistry as RulebookRegistryInterface,
  Direction,
} from './types.js';

export { DIRECTIONS, REVERSE_DIRECTIONS } from './types.js';
