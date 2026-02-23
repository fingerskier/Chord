# Chord Lite \u2014 MVP Specification

*A minimal interactive fiction engine that compiles a natural-language DSL to TypeScript + SQLite.*

---

## 1. Design Principles

1. **World state is a database.** All objects, properties, relations, and containment live in SQLite. There is no separate in-memory world model.
2. **Rules are typed functions.** Each rule compiles to a TypeScript function with a SQL condition and an imperative body. Rules are not data \u2014 they are code that queries data.
3. **The turn is a transaction.** Each player action opens a DB transaction. If the action succeeds, commit. If it fails or is blocked, rollback. Undo is free.
4. **Save is a file copy.** The story's runtime state is the `.db` file. Saving the game means copying it.
5. **The compiler emits readable code.** The output is a TypeScript project a human can inspect, debug, and extend.

---

## 2. Source Language

The source language is a constrained English DSL. It is **not** natural language processing \u2014 it is a formal grammar that reads like English. The parser is a PEG or similar deterministic parser, not an NLP pipeline.

### 2.1 World Declarations

Declarations define kinds, objects, properties, relations, and spatial layout. They compile to SQL schema and seed data.

```
A room is a kind of thing.
A container is a kind of thing.
A lamp is a kind of thing.
A lamp has a truth state called lit. A lamp is usually not lit.

The Dark Cave is a room. "You are in a damp, dark cave."
The Sunlit Clearing is a room. "Bright sunlight filters through the canopy."
The Sunlit Clearing is north of the Dark Cave.

The brass lamp is a lamp in the Dark Cave. "An old brass lamp sits here."
The wooden chest is a container in the Sunlit Clearing. "A sturdy wooden chest rests against a tree."
The silver key is a thing in the wooden chest.
```

#### Grammar sketch

```
declaration     := kind_decl | property_decl | object_decl | relation_decl | default_decl
kind_decl       := article IDENT "is a kind of" IDENT "."
property_decl   := article IDENT "has" type "called" IDENT "."
default_decl    := article IDENT "is usually" value "."
object_decl     := "The" IDENT "is" article IDENT location? "." description?
location        := "in" "The"? IDENT | direction "of" "The"? IDENT
direction       := "north" | "south" | "east" | "west" | "up" | "down"
                 | "northeast" | "northwest" | "southeast" | "southwest"
description     := QUOTED_STRING
type            := "truth state" | "number" | "text"
article         := "A" | "An" | "The" | "Some"
```

### 2.2 Rules

Rules follow the pattern: `<rulebook phrase> <action> <conditions>: <body>`.

```
Before taking something when the noun is in a locked container:
    say "You can't reach that \u2014 the [holder of the noun] is locked.";
    stop.

Instead of taking the brass lamp when the brass lamp is lit:
    say "The lamp is too hot to grab with bare hands."

Check taking something when the weight of the noun > 50:
    say "That's far too heavy to lift.";
    stop.

Carry out taking something:
    now the noun is carried by the player;
    remove the noun from its holder.

Report taking something:
    say "Taken."

After taking the silver key:
    say "The key glints with an unusual shimmer as you pick it up."
```

#### Rule grammar sketch

```
rule            := rule_head ":" NEWLINE rule_body
rule_head       := phase action_pattern conditions?
phase           := "Before" | "Instead of" | "Check" | "Carry out" | "After" | "Report"
                 | "Every turn" | "When play begins"
action_pattern  := VERB noun_pattern?
noun_pattern    := "something" | "The"? IDENT
conditions      := "when" condition ("and" condition)*
condition       := property_test | location_test | comparison
property_test   := "The"? IDENT "is" value
                 | "The"? IDENT "is" "not" value
location_test   := "The"? IDENT "is in" "The"? IDENT
                 | "the player is in" "The"? IDENT
comparison      := "the" IDENT "of" "The"? IDENT COMPARATOR value

rule_body       := (statement NEWLINE)+
statement       := say_stmt | now_stmt | move_stmt | stop_stmt | try_stmt | if_stmt
say_stmt        := "say" QUOTED_STRING ";"
now_stmt        := "now" property_assignment ";"
move_stmt       := "remove" "The"? IDENT "from" expression ";"
                 | "move" "The"? IDENT "to" "The"? IDENT ";"
stop_stmt       := "stop" "."
try_stmt        := "try" action_pattern ";"
if_stmt         := "if" condition ":" NEWLINE INDENT rule_body (DEDENT "otherwise:" NEWLINE INDENT rule_body)?
```

### 2.3 Text Substitutions

Quoted strings in `say` statements support bracketed substitutions:

```
say "You can see [a list of things in the location] here."
say "The lamp is [if the brass lamp is lit]glowing brightly[otherwise]dark[end if]."
say "You are carrying [the number of things carried by the player] item[s]."
```

These compile to template functions that query the DB at runtime.

```
substitution    := "[" sub_expr "]"
sub_expr        := list_sub | if_sub | property_sub | description_sub
list_sub        := "a list of" IDENT "in" expression
if_sub          := "if" condition "]" text "[otherwise]" text "[end if"
property_sub    := "the" IDENT "of" expression
description_sub := "The"? IDENT
```

### 2.4 Every Turn and Scenes

```
Every turn when the player is in the Dark Cave and the brass lamp is not lit:
    say "You hear something skittering in the darkness."

Darkness is a scene. Darkness begins when play begins. Darkness ends when the brass lamp is lit.

When Darkness ends:
    say "The shadows retreat. You feel safer now."
```

---

## 3. Compilation Target

The compiler reads a `.il` source file (or multiple files) and emits:

```
dist/
  story.db            \u2014 SQLite database with schema + seed data
  types.ts            \u2014 generated kind interfaces
  rulebooks/
    taking.ts         \u2014 rules for the taking action
    dropping.ts
    opening.ts
    ...
    every-turn.ts
    scene-changes.ts
  actions.ts          \u2014 action type definitions + parser mapping
  runtime.ts          \u2014 the turn loop, cascade, text engine
  index.ts            \u2014 entry point
  package.json
  tsconfig.json
```

### 3.1 Schema (story.db)

```sql
-- Kind hierarchy
CREATE TABLE kinds (
    name        TEXT PRIMARY KEY,
    parent      TEXT REFERENCES kinds(name)
);

-- All game objects
CREATE TABLE objects (
    id          TEXT PRIMARY KEY,
    kind        TEXT NOT NULL REFERENCES kinds(name),
    location    TEXT REFERENCES objects(id),  -- containment parent
    description TEXT DEFAULT ''
);

-- Flexible property store
CREATE TABLE properties (
    object_id   TEXT NOT NULL REFERENCES objects(id),
    key         TEXT NOT NULL,
    value       TEXT,  -- stored as text, cast at query time
    type        TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'number' | 'truth_state'
    PRIMARY KEY (object_id, key)
);

-- Map connections between rooms
CREATE TABLE exits (
    from_room   TEXT NOT NULL REFERENCES objects(id),
    direction   TEXT NOT NULL,
    to_room     TEXT NOT NULL REFERENCES objects(id),
    PRIMARY KEY (from_room, direction)
);

-- Arbitrary named relations
CREATE TABLE relations (
    subject_id  TEXT NOT NULL REFERENCES objects(id),
    rel_type    TEXT NOT NULL,
    object_id   TEXT NOT NULL REFERENCES objects(id),
    PRIMARY KEY (subject_id, rel_type, object_id)
);

-- Scene state
CREATE TABLE scenes (
    name        TEXT PRIMARY KEY,
    active      INTEGER NOT NULL DEFAULT 0
);

-- Turn counter
CREATE TABLE meta (
    key         TEXT PRIMARY KEY,
    value       TEXT
);
```

### 3.2 Generated Types (types.ts)

From the example source:

```typescript
// Base types
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

export interface Lamp extends Thing {
  kind: 'lamp';
  lit: boolean;
}

// Action types
export interface Action<V extends string = string> {
  verb: V;
  actor: string;   // object id
  noun?: string;    // object id
  second?: string;  // object id (for two-noun actions like "put X in Y")
}

export type TakeAction = Action<'take'>;
export type DropAction = Action<'drop'>;
export type GoAction = Action<'go'> & { noun: string }; // direction
export type LightAction = Action<'light'>;
export type OpenAction = Action<'open'>;
export type ExamineAction = Action<'examine'>;
```

### 3.3 Compiled Rule (example)

The source rule:

```
Instead of taking the brass lamp when the brass lamp is lit:
    say "The lamp is too hot to grab with bare hands."
```

Compiles to:

```typescript
import { Rule, RuleResult, WorldDB } from '../runtime';
import { TakeAction } from '../types';

export const insteadTakingBrassLampWhenLit: Rule<TakeAction> = {
  priority: 130,  // specific object + property condition = high priority
  phase: 'instead',

  condition(db: WorldDB, action: TakeAction): boolean {
    if (action.noun !== 'brass_lamp') return false;
    const row = db.prepare(
      `SELECT 1 FROM properties WHERE object_id = ? AND key = 'lit' AND value = 'true'`
    ).get('brass_lamp');
    return row !== undefined;
  },

  body(db: WorldDB, action: TakeAction): RuleResult {
    return {
      outcome: 'stop',
      output: 'The lamp is too hot to grab with bare hands.'
    };
  }
};
```

### 3.4 Priority Scoring

Rules are sorted at compile time by specificity. The scoring system:

| Factor                        | Points |
|-------------------------------|--------|
| Names a specific object       | +100   |
| Names a specific kind         | +50    |
| Uses "something"              | +10    |
| Each `when` condition         | +20    |
| Property test on specific obj | +30    |
| Location test                 | +15    |

Higher score = higher priority = checked first. Ties broken by source order.

---

## 4. Runtime

### 4.1 The Turn Loop

```typescript
function turn(input: string, db: WorldDB): string[] {
  const action = parse(input, db);   // resolve to Action
  if (!action) return ["I didn't understand that."];

  const output: string[] = [];
  db.exec('SAVEPOINT turn');

  try {
    const cascade: Phase[] = ['before', 'instead', 'check', 'carry_out', 'after', 'report'];

    for (const phase of cascade) {
      const rulebook = getRulebook(phase, action.verb);
      for (const rule of rulebook) {          // pre-sorted by priority
        if (rule.condition(db, action)) {
          const result = rule.body(db, action);
          if (result.output) output.push(result.output);

          if (result.outcome === 'stop') {
            if (phase === 'instead' || phase === 'check') {
              db.exec('ROLLBACK TO turn');    // action blocked
              return output;
            }
            break;                            // stop this phase, continue cascade
          }
          if (result.outcome === 'replace') {
            db.exec('ROLLBACK TO turn');
            return turn(result.redirect!, db); // try a different action
          }
        }
      }
    }

    // Every-turn rules
    for (const rule of getEveryTurnRules()) {
      if (rule.condition(db, action)) {
        const result = rule.body(db, action);
        if (result.output) output.push(result.output);
      }
    }

    // Scene transitions
    processScenes(db, output);

    db.exec('RELEASE turn');                    // commit
    incrementTurn(db);
  } catch (e) {
    db.exec('ROLLBACK TO turn');
    throw e;
  }

  return output;
}
```

### 4.2 WorldDB Helpers

```typescript
import Database from 'better-sqlite3';

class WorldDB {
  private db: Database.Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
  }

  // Query helpers
  getObject(id: string): Thing | null { ... }
  getProperty(objectId: string, key: string): string | null { ... }
  setProperty(objectId: string, key: string, value: string): void { ... }
  getLocation(objectId: string): string | null { ... }
  moveTo(objectId: string, locationId: string): void { ... }
  getContents(locationId: string): Thing[] { ... }
  getExit(roomId: string, direction: string): string | null { ... }

  // Scope: what can the player interact with?
  getScope(actorId: string): Thing[] {
    // Player's location + everything in it + player's inventory
    // Uses recursive CTE for nested containers
    return this.db.prepare(`
      WITH RECURSIVE reachable(id) AS (
        SELECT location FROM objects WHERE id = ?
        UNION ALL
        SELECT o.id FROM objects o
        JOIN reachable r ON o.location = r.id
      )
      SELECT o.* FROM objects o
      JOIN reachable r ON o.id = r.id
      UNION
      SELECT o.* FROM objects o WHERE o.location = ?
    `).all(actorId, actorId);
  }

  // Raw access for compiled rules
  prepare(sql: string) { return this.db.prepare(sql); }
  exec(sql: string) { this.db.exec(sql); }
}
```

### 4.3 The Parser (MVP)

The MVP parser is a simple verb-noun matcher, not a full natural language parser. It resolves words against objects currently in scope.

```typescript
function parse(input: string, db: WorldDB): Action | null {
  const words = input.trim().toLowerCase().split(/\s+/);
  const verb = resolveVerb(words[0]);        // "take" | "get" | "pick" \u2192 'take'
  if (!verb) return null;

  if (isDirection(words[0])) {
    return { verb: 'go', actor: 'player', noun: words[0] };
  }

  const scope = db.getScope('player');
  const nounWords = words.slice(1).join(' ');
  const noun = resolveNoun(nounWords, scope);  // fuzzy match against scope

  return { verb, actor: 'player', noun: noun?.id };
}
```

### 4.4 Text Engine

Text substitutions compile to functions:

```typescript
// "You can see [a list of things in the location] here."
// compiles to:
function text_0(db: WorldDB, action: Action): string {
  const loc = db.getLocation('player');
  const
