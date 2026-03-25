/**
 * Core type definitions for the Chord engine.
 *
 * These types represent the runtime world model: objects, actions,
 * rules, and the phase cascade. They mirror the database schema
 * but provide typed access for compiled rules and the runtime.
 */

// ---------------------------------------------------------------------------
// World objects
// ---------------------------------------------------------------------------

export interface Thing {
  id: string;
  kind: string;
  location: string | null;
  description: string;
}

export interface Room extends Thing {
  kind: 'room';
}

export interface Container extends Thing {
  kind: 'container';
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface Action<V extends string = string> {
  verb: V;
  actor: string;
  noun?: string;
  second?: string;
}

export type TakeAction = Action<'take'>;
export type DropAction = Action<'drop'>;
export type GoAction = Action<'go'> & { noun: string };
export type LookAction = Action<'look'>;
export type ExamineAction = Action<'examine'>;
export type OpenAction = Action<'open'>;
export type CloseAction = Action<'close'>;
export type InventoryAction = Action<'inventory'>;
export type PutAction = Action<'put'> & { noun: string; second: string };

// ---------------------------------------------------------------------------
// Rule system
// ---------------------------------------------------------------------------

/** The six phases of the rule cascade, plus special phases. */
export type Phase = 'before' | 'instead' | 'check' | 'carry_out' | 'after' | 'report';

/** Result returned by a rule body. */
export interface RuleResult {
  /** 'continue' = keep going; 'stop' = halt this phase; 'replace' = redirect. */
  outcome: 'continue' | 'stop' | 'replace';
  /** Text output to show the player. */
  output?: string;
  /** For 'replace' outcome: the action to try instead. */
  redirect?: Action;
}

/** A compiled rule that participates in the cascade. */
export interface Rule<A extends Action = Action> {
  /** Higher priority = checked first. Computed from specificity. */
  priority: number;
  /** Which phase this rule belongs to. */
  phase: Phase;
  /** Name for debugging. */
  name?: string;
  /** Return true if this rule applies. */
  condition(db: WorldDBInterface, action: A): boolean;
  /** Execute the rule body. */
  body(db: WorldDBInterface, action: A): RuleResult;
}

/** An every-turn rule (runs after the main cascade). */
export interface EveryTurnRule {
  name?: string;
  priority: number;
  condition(db: WorldDBInterface, action: Action): boolean;
  body(db: WorldDBInterface, action: Action): RuleResult;
}

/** A scene definition. */
export interface SceneDefinition {
  name: string;
  beginsWhen(db: WorldDBInterface): boolean;
  endsWhen(db: WorldDBInterface): boolean;
  onBegin?(db: WorldDBInterface): string | undefined;
  onEnd?(db: WorldDBInterface): string | undefined;
}

// ---------------------------------------------------------------------------
// WorldDB interface (so rules don't depend on the concrete class)
// ---------------------------------------------------------------------------

export interface WorldDBInterface {
  getObject(id: string): Thing | null;
  getProperty(objectId: string, key: string): string | null;
  setProperty(objectId: string, key: string, value: string): void;
  getLocation(objectId: string): string | null;
  moveTo(objectId: string, locationId: string): void;
  removeFrom(objectId: string): void;
  getContents(locationId: string): Thing[];
  getExit(roomId: string, direction: string): string | null;
  getScope(actorId: string): Thing[];
  isKindOf(objectId: string, kindName: string): boolean;
  exec(sql: string): void;
  queryValue(sql: string, ...params: unknown[]): unknown;
  queryRow(sql: string, ...params: unknown[]): Record<string, unknown> | null;
  queryAll(sql: string, ...params: unknown[]): Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Rulebook registry types
// ---------------------------------------------------------------------------

export interface Rulebook {
  verb: string;
  rules: Rule[];
}

export interface RulebookRegistry {
  getRulebook(phase: Phase, verb: string): Rule[];
  getEveryTurnRules(): EveryTurnRule[];
  getSceneDefinitions(): SceneDefinition[];
  registerRule(verb: string, rule: Rule): void;
  registerEveryTurnRule(rule: EveryTurnRule): void;
  registerScene(scene: SceneDefinition): void;
}

// ---------------------------------------------------------------------------
// Direction constants
// ---------------------------------------------------------------------------

export const DIRECTIONS = [
  'north', 'south', 'east', 'west',
  'up', 'down',
  'northeast', 'northwest', 'southeast', 'southwest',
] as const;

export type Direction = typeof DIRECTIONS[number];

// ---------------------------------------------------------------------------
// Error context (provenance tracking per ARCH.md D8)
// ---------------------------------------------------------------------------

export interface ErrorContext {
  ruleName?: string;
  phase?: Phase;
  verb?: string;
  turnNumber?: number;
  detail: string;
}

export const REVERSE_DIRECTIONS: Record<Direction, Direction> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  up: 'down',
  down: 'up',
  northeast: 'southwest',
  southwest: 'northeast',
  northwest: 'southeast',
  southeast: 'northwest',
};
