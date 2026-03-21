# Chord Implementation Plan

Phased roadmap mapping SPEC.md sections to concrete work. Each phase builds on
the previous. Phases are ordered by dependency — later phases assume earlier ones
are complete. See `doc/ISSUES.md` for gaps (§G) and inconsistencies (§H) that
must be resolved before or during implementation.

---

## Phase 0 — MVP (Done)

**Status:** Complete and tested.

**What exists:**
- **Compiler** (`compiler/src/`): lexer → parser → analyzer → codegen. Accepts
  Chord DSL (`.il` files), emits TypeScript.
- **Engine** (`engine/src/`): libsql-backed world model, 6-phase rule cascade
  (before → instead → check → carry_out → after → report), turn loop with
  savepoint rollback, input parser, scene system, every-turn rules.
- **9 built-in rulebooks** (`engine/src/rulebooks/`): taking, dropping, going,
  looking, examining, opening, closing, putting, inventory.
- **Test suite**: compiler tests, engine tests, 3 sample stories with gameplay
  validation.

**Key files:**
- `engine/src/engine.ts` — public API surface
- `engine/src/runtime.ts` — turn loop and cascade
- `engine/src/world-db.ts` — SQLite world model (7 tables)
- `compiler/src/parser.ts` — recursive-descent parser (1003 lines)
- `compiler/src/codegen.ts` — TypeScript code generator
- `MVP.md` — design principles and grammar sketches

---

## Phase 1 — Language Hardening

**Goal:** Solidify the language foundation before adding features on top of it.

**SPEC refs:** §2.1, §2.2, §12.1
**Resolves:** G.1 (structured syntax), G.16 (formal grammar), H.4 (Wasm vs TS),
H.6 (dual spec files)

### 1.1 Formal Grammar
- Write a BNF/EBNF grammar for the current Chord DSL in a `doc/GRAMMAR.md` or
  similar. Derive it from `MVP.md` sketches and `compiler/src/parser.ts`.
- Ensure the grammar is the single source of truth; update parser to match if
  they diverge.

### 1.2 Structured Syntax Design
- Define concrete syntax for structured mode: entry/exit delimiters, annotation
  grammar, interaction with NL surface.
- Unify the scattered `[annotation]` examples (§3.3.11, §3.4.6, §6.3.9) into a
  coherent syntax.
- Implement in `compiler/src/parser.ts` and `compiler/src/ast.ts`.

### 1.3 Spec Cleanup
- Resolve H.6: make root `SPEC.md` canonical. Either remove `doc/SPEC.md` or
  convert it to a brief pointer.
- Resolve H.4: add a note to §7 acknowledging TypeScript/Node as the initial
  target with Wasm as a future milestone.
- Resolve H.1: harmonize §1.2 and §12.1 compatibility language.

### 1.4 Error Model Concretization
- Extend D8 (fail-safe with provenance) into concrete runtime behavior:
  rule body exceptions, DB errors, malformed input.
- Implement error boundaries in `engine/src/runtime.ts`.
- Add compiler diagnostics for detectable error-prone patterns.

**Files to modify:** `compiler/src/parser.ts`, `compiler/src/ast.ts`,
`engine/src/runtime.ts`, `SPEC.md`, `doc/SPEC.md`

**Verification:** All existing tests pass. Grammar document parses cleanly.
Structured annotations accepted in compiler. Error cases produce provenance-
tagged diagnostics instead of crashes.

---

## Phase 2 — World Model Extensions

**Goal:** Implement open-world properties, journaling, and temporal state queries.

**SPEC refs:** §3.3, §3.4
**Resolves:** G.15 (phantom appendix refs for C.6, D.1), H.2 (overloaded absent),
H.7 (unknown vs. transition semantics)

### 2.1 Three-State Properties
- Add `state` column to `properties` table: `valued | absent | unknown`.
- Implement `open-world` declaration in parser and codegen.
- Implement fail-safe condition evaluation (§3.3.5): unknown → no match.
- Add `is known`, `is unknown`, `is absent`, `is present` condition forms.
- Default value syntax: `(or N if unknown)`.

### 2.2 Journaling
- Create `journal` table: `(property_id, object_id, value, turn, rule_source)`.
- Implement `journaled` keyword in parser.
- Implement retention depth (`with depth N`).
- History query expressions: previous, offset, existential, aggregate, change
  detection (§3.4.4 families 1–5).

### 2.3 Resolve Absent Overloading (H.2)
- Distinguish "absent by author intent" from "absent by retention expiry."
  Options: (a) return a distinct `expired` state for beyond-depth queries,
  (b) document the conflation as intentional and add a `was ever known` query
  for authors who need the distinction.

### 2.4 Open-World + Journaling Interaction
- Unknown as a journalable state (§3.4.5 / §3.3).
- Reactive rule transition semantics for unknown→valued and valued→unknown.
- Compiler diagnostics (§3.3.10, §3.4.7).

**Files to modify:** `engine/src/world-db.ts` (schema + queries),
`engine/src/schema.ts`, `compiler/src/parser.ts`, `compiler/src/ast.ts`,
`compiler/src/codegen.ts`, `compiler/src/analyzer.ts`

**Verification:** Unit tests for three-state property CRUD. Tests for each of the
5 history query families. Integration test: the espionage example from §3.3.12.
Compiler emits correct diagnostics for open-world and journaling misuse.

---

## Phase 3 — Advanced Type System

**Goal:** Sum types, optionals, parameterized kinds, first-class rules.

**SPEC refs:** §2.3
**Resolves:** G.2 (sum types), G.3 (parameterized kinds), G.4 (first-class rules)

### 3.1 Design Phase (Before Code)
- These features need syntax design before implementation. Write a
  `doc/TYPES.md` specifying:
  - Sum type declaration syntax (NL and structured)
  - Pattern matching / case analysis syntax
  - Parameterized kind declaration and instantiation
  - Rule-typed variables and invocation syntax
- Get design review before proceeding.

### 3.2 Optional Values
- Likely the simplest to implement — extend the three-state model from Phase 2.
  The `absent` state already provides the semantic foundation.
- Add `optional` keyword: `The weapon of a person is an optional thing.`
- Compiler enforces guarded access.

### 3.3 Sum Types
- Extend `kinds` table to support variant declarations.
- Implement in parser, AST, analyzer, codegen.
- Pattern matching in rule conditions.

### 3.4 Parameterized Kinds
- Kind parameters in declarations: `A list of [K]`, `A relation between [K1] and [K2]`.
- Type checking at compile time.

### 3.5 First-Class Rules
- Rule references as values.
- Higher-order phrases: `apply [rule] to each [list]`.

**Dependencies:** Phase 2 (three-state model provides optionals foundation).

**Verification:** Type-checking tests for each new type form. Compilation of
example stories using sum types and parameterized kinds. Round-trip: author
source → compiled output → engine execution.

---

## Phase 4 — Rule System Enhancements

**Goal:** Compositional rulebooks, reactive rules, provenance inspection.

**SPEC refs:** §5.2, §5.3, §5.4
**Resolves:** G.7 (provenance queries), G.8 (compositional rulebooks)

### 4.1 Reactive Rules
- Event-driven rule triggers: `when [property] becomes [condition]`.
- State-change watchers in `engine/src/runtime.ts`.
- Integration with open-world transition semantics (§3.3.9, Phase 2).
- Cascade ordering for reactive rules within a turn (D9).

### 4.2 Compositional Rulebooks
- Syntax for composing rulebooks: `The social-interaction rules consult the
  etiquette rules, then the relationship rules.`
- Implementation in `engine/src/rulebook-registry.ts`.

### 4.3 Rule Provenance
- Attach source location, library origin, specificity score to every rule.
- Already partially implemented (priority scoring in `compiler/src/analyzer.ts`).
- Expose metadata via engine API for tooling/debugging.
- Define query syntax for runtime inspection.

**Dependencies:** Phase 2 (reactive rules need open-world + journaling).

**Verification:** Reactive rule tests: property change triggers, unknown
transitions, cascading reactive rules. Compositional rulebook tests.
Provenance metadata accessible at runtime.

---

## Phase 5 — Time and Scheduling

**Goal:** Tick cycles, wall clock, event queue, per-rule temporal binding.

**SPEC refs:** §6.1–§6.3
**Resolves:** G.14 (continuous time)

### 5.1 Tick Scheduler
- Sub-turn discrete steps.
- Per-actor tick frequency: `Alice acts every tick`, `Bob acts every third tick`.
- Deterministic ordering (D9): declaration order, overridable.
- Ticks-per-turn configuration.

### 5.2 Wall Clock
- Real-time timer layer using host event loop.
- Clock-scheduled rules: `every 2 minutes the parrot squawks`.
- Pause/resume on story suspension.
- Fallback batch-on-input mode for constrained environments.

### 5.3 Event Queue
- Reactive rule triggers registered as event watchers.
- Event queue checked after every state change at every scheduling layer.
- Integration with reactive rules from Phase 4.

### 5.4 Scheduling Inference
- Compiler analyzes temporal expressions and activates minimum infrastructure.
- Per-rule temporal binding metadata (extending §5.2 provenance).
- Composability constraints and compiler diagnostics (§6.3.8, §6.3.10).

### 5.5 Continuous Time (Stretch)
- Real-valued clock with configurable increments.
- Requires explicit `[continuous-time: enabled]` declaration.
- Defer until a concrete use case demands it.

**Dependencies:** Phase 4 (reactive rules → event queue).

**Verification:** Mixed-scheduling story: turn-based player + tick-based NPC +
clock-based ambient events. Compiler diagnostics for conflicting intervals.
Batch-on-input fallback test.

---

## Phase 6 — I/O Architecture

**Goal:** Define and implement the semantic output stream and input event protocol.
Build a reference CLI reader.

**SPEC refs:** §8.1–§8.4
**Resolves:** G.9 (output protocol), G.10 (input protocol), H.5 (no default
frontend)

### 6.1 Semantic Output Stream
- Define event type catalog: `room_description`, `object_listing`, `dialogue`,
  `narrative`, `prompt`, `error`, `debug`, etc.
- Choose encoding: JSON-lines (simplest, debuggable, streamable).
- Version the protocol.
- Implement in engine: replace raw `say` text accumulation with typed events.

### 6.2 Structured Input Events
- Define input event schema: `text_command`, `click_object`, `direction`, etc.
- Normalization pipeline: input event → parsed action.
- Implement in `engine/src/parser.ts` (extend current text parser).

### 6.3 Reference CLI Reader
- Minimal terminal frontend that consumes the semantic stream and renders
  traditional IF text output.
- Proves the protocol works end-to-end.
- Ship as a separate package or `reader/` directory.

### 6.4 Async Output (for Wall Clock)
- Semantic stream must support push delivery for clock-scheduled rule output.
- Event-loop integration for real-time output.

**Dependencies:** Phase 5 (wall clock → async output).

**Verification:** Existing demo stories playable through the reference reader.
Semantic stream parseable by a third-party consumer. Async output renders
correctly for clock-scheduled rules.

---

## Phase 7 — Package Ecosystem

**Goal:** Packages, namespaces, registries, standard library extraction.

**SPEC refs:** §2.4, §9.1–§9.4
**Resolves:** G.5 (namespacing), G.11 (registry API), D.7 (standard library
extraction)

### 7.1 Package Format
- Define manifest format (e.g., `chord.toml` or `chord.json`): name, version,
  dependencies, entry point, namespace.
- Define package file structure.

### 7.2 Namespace System
- Implement namespaced identifiers in parser and analyzer.
- Disambiguation rules: explicit prefix, author-chosen alias, contextual.
- Integrate with kind/property/relation resolution.

### 7.3 Registry Protocol
- HTTP API for package discovery, download, versioning.
- Dependency resolution algorithm.
- Default public registry design.

### 7.4 Standard Library Extraction
- Extract `engine/src/rulebooks/` into a Chord package.
- Package declares the 9 standard actions as overridable rules.
- Engine loads the standard library package by default; authors can exclude it
  with `skipDefaultRules`.

### 7.5 Inline Test Cases
- Syntax for test scenarios within packages.
- Test runner integrated with build tooling.

**Dependencies:** Phase 1 (structured syntax for annotations), Phase 3
(parameterized kinds for generic library types).

**Verification:** A sample library package (e.g., "social dynamics") installable
from a local registry. Namespace collision properly disambiguated. Standard
library extracted and all existing tests still pass.

---

## Phase 8 — Interoperability

**Goal:** FFI, embeddability, data import/export, vector similarity.

**SPEC refs:** §4, §11.1–§11.3
**Resolves:** G.6 (vector query syntax), G.12 (FFI), G.13 (import/export),
H.3 (compile-time embeddings vs. runtime similarity)

### 8.1 Foreign Function Interface
- Define capability declaration syntax: `This story requires [capability].`
- Host-side binding API: host registers functions, story calls them.
- Sandbox model: allowlist of granted capabilities.
- Implementation via Wasm imports (if Wasm target) or Node.js function
  registration (current TS target).

### 8.2 Embeddability API
- Package the engine as an embeddable library.
- Stable API: `instantiate(story) → handle`, `send(handle, input) → output`.
- Already partially there via `Engine` class; formalize and document.

### 8.3 Data Import/Export
- Define JSON schema for world model export (objects, properties, relations,
  journal entries).
- Import validation: type checking against story's kind hierarchy.
- CSV export for tabular data (property tables, journal history).

### 8.4 Vector Similarity
- Resolve H.3: define which objects can have embeddings (compile-time only vs.
  runtime-computed via FFI).
- Integrate sqlite-vec or similar for vector storage alongside world-db.
- Language syntax: `the 5 things most similar to [X]` → returns a list.
- Compile-time embedding generation via external tools.
- No fuzzy conditions (§4.3) — similarity queries return discrete object lists.

**Dependencies:** Phase 7 (FFI is the mechanism for compile-time embedding
generation), Phase 6 (embeddability needs the semantic stream).

**Verification:** FFI round-trip: story calls host function, receives result,
uses it in a rule. World model export → reimport produces identical state.
Vector similarity query returns correct ranked results.

---

## Phase 9 — Tooling

**Goal:** LSP server, REPL/inspector, world visualization, source mapping.

**SPEC refs:** §10.1–§10.4
**Resolves:** G.7 (provenance in tooling)

### 9.1 Language Server Protocol
- LSP server built on the compiler's parser and analyzer.
- Features: diagnostics, autocomplete (kind names, property names, verbs),
  go-to-definition, hover documentation.
- Extend `compiler/src/analyzer.ts` to support incremental analysis.

### 9.2 REPL and Interactive Inspector
- Load a compiled story, advance to a state, query the world model.
- Commands: inspect object, list relations, test rule, advance N turns.
- Built on the engine API.

### 9.3 World State Visualization
- Graph rendering of objects, containment, relations.
- Rule trace visualization: which rules consulted → matched → fired.
- Output as DOT/graphviz, JSON graph, or interactive HTML.

### 9.4 Source Mapping
- Map compiled TypeScript output back to Chord source locations.
- Source maps for runtime error reporting.
- Integrate with LSP for click-to-source in editors.

**Dependencies:** All previous phases (tooling wraps the full system).

**Verification:** LSP provides diagnostics in VS Code for a sample story.
REPL can inspect world state mid-story. Source map traces a runtime error
back to the correct Chord source line.

---

## Cross-Reference: Issues → Phases

| Issue | Phase | Notes |
|-------|-------|-------|
| G.1  | 1     | Structured syntax design |
| G.2  | 3     | Sum types |
| G.3  | 3     | Parameterized kinds |
| G.4  | 3     | First-class rules |
| G.5  | 7     | Namespacing |
| G.6  | 8     | Vector similarity syntax |
| G.7  | 4, 9  | Provenance: engine in 4, tooling in 9 |
| G.8  | 4     | Compositional rulebooks |
| G.9  | 6     | Semantic output stream |
| G.10 | 6     | Input event format |
| G.11 | 7     | Package registry |
| G.12 | 8     | FFI |
| G.13 | 8     | Data import/export |
| G.14 | 5     | Continuous time |
| G.15 | 2, 4  | Appendix sections filled by implementation |
| G.16 | 1     | Formal grammar |
| G.17 | 1     | Error model |
| G.18 | defer | Multiplayer — deferred indefinitely |
| H.1  | 1     | Compatibility language cleanup |
| H.2  | 2     | Absent semantics |
| H.3  | 8     | Embeddings design |
| H.4  | 1     | Wasm vs TS acknowledgment |
| H.5  | 6     | Reference reader |
| H.6  | 1     | Dual spec cleanup |
| H.7  | 2     | Unknown transition documentation |
