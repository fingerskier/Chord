/**
 * AST node types for the Chord story compiler.
 *
 * Every node carries a SourceLocation for error reporting.
 */

// ---------------------------------------------------------------------------
// Source location
// ---------------------------------------------------------------------------

export interface SourceLocation {
  line: number;
  col: number;
}

// ---------------------------------------------------------------------------
// Top-level story file
// ---------------------------------------------------------------------------

export interface StoryFile {
  title?: string;
  author?: string;
  declarations: Declaration[];
  rules: RuleNode[];
  everyTurnRules: EveryTurnRuleNode[];
  scenes: SceneNode[];
  sceneHandlers: SceneHandlerNode[];
  playerStart?: string; // room name
}

// ---------------------------------------------------------------------------
// Declarations
// ---------------------------------------------------------------------------

export type Declaration =
  | KindDecl
  | PropertyDecl
  | DefaultDecl
  | ObjectDecl
  | RelationDecl;

export interface KindDecl {
  type: 'kind_decl';
  name: string;
  parent: string;
  loc: SourceLocation;
}

export interface PropertyDecl {
  type: 'property_decl';
  kindName: string;
  propertyType: 'truth_state' | 'number' | 'text';
  propertyName: string;
  loc: SourceLocation;
}

export interface DefaultDecl {
  type: 'default_decl';
  kindName: string;
  propertyName: string;
  value: string;
  negated: boolean; // "is usually not lit" → negated=true, value="lit"
  loc: SourceLocation;
}

export interface ObjectDecl {
  type: 'object_decl';
  name: string;
  kind: string;
  location?: string;      // "in The Dark Cave" → "The Dark Cave"
  description?: string;   // quoted string
  loc: SourceLocation;
}

export interface RelationDecl {
  type: 'relation_decl';
  subjectName: string;
  direction: string;
  objectName: string;
  loc: SourceLocation;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export type Phase = 'before' | 'instead' | 'check' | 'carry_out' | 'after' | 'report';

export interface RuleNode {
  type: 'rule';
  phase: Phase;
  verb: string;
  nounPattern: NounPattern;
  conditions: Condition[];
  body: Statement[];
  loc: SourceLocation;
}

export type NounPattern =
  | { type: 'any' }           // "something"
  | { type: 'specific'; name: string }  // "the brass lamp"
  | { type: 'none' };         // bare verb, no noun

// ---------------------------------------------------------------------------
// Every-turn rules
// ---------------------------------------------------------------------------

export interface EveryTurnRuleNode {
  type: 'every_turn_rule';
  conditions: Condition[];
  body: Statement[];
  loc: SourceLocation;
}

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

export interface SceneNode {
  type: 'scene_decl';
  name: string;
  beginsWhen: SceneCondition;
  endsWhen: SceneCondition;
  loc: SourceLocation;
}

export type SceneCondition =
  | { type: 'play_begins' }
  | { type: 'property_test'; objectName: string; propertyName: string; value: string; negated: boolean }
  | { type: 'player_location'; roomName: string }
  | { type: 'always' };

export interface SceneHandlerNode {
  type: 'scene_handler';
  sceneName: string;
  event: 'begins' | 'ends';
  body: Statement[];
  loc: SourceLocation;
}

// ---------------------------------------------------------------------------
// Conditions (used in rule when-clauses)
// ---------------------------------------------------------------------------

export type Condition =
  | PropertyTestCondition
  | LocationTestCondition
  | PlayerLocationTestCondition
  | ComparisonCondition;

export interface PropertyTestCondition {
  type: 'property_test';
  objectName: string;
  value: string;
  negated: boolean;
  loc: SourceLocation;
}

export interface LocationTestCondition {
  type: 'location_test';
  objectName: string;
  containerName: string;
  loc: SourceLocation;
}

export interface PlayerLocationTestCondition {
  type: 'player_location_test';
  roomName: string;
  loc: SourceLocation;
}

export interface ComparisonCondition {
  type: 'comparison';
  property: string;
  objectName: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: string;
  loc: SourceLocation;
}

// ---------------------------------------------------------------------------
// Statements (rule bodies)
// ---------------------------------------------------------------------------

export type Statement =
  | SayStatement
  | NowStatement
  | MoveStatement
  | RemoveStatement
  | StopStatement;

export interface SayStatement {
  type: 'say';
  text: string;
  loc: SourceLocation;
}

export interface NowStatement {
  type: 'now';
  objectName: string;
  propertyName: string;
  value: string;
  loc: SourceLocation;
}

export interface MoveStatement {
  type: 'move';
  objectName: string;
  destinationName: string;
  loc: SourceLocation;
}

export interface RemoveStatement {
  type: 'remove';
  objectName: string;
  loc: SourceLocation;
}

export interface StopStatement {
  type: 'stop';
  loc: SourceLocation;
}
