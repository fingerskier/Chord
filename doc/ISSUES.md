# Issues and Gaps in SPEC.md

This document catalogs problems found in `SPEC.md` — contradictions, missing
specifications, underspecified features, and unresolved interactions. Items that
were resolved are kept as a decision record. Items that described design questions
for unbuilt Phase 1/2/3 features have been removed — they will be addressed when
those phases are designed. See `doc/SPEC.md` for the phase roadmap.

---

## A. Open Questions — ALL RESOLVED

### A.1 — Storage engine commitment ✓ RESOLVED

**SPEC refs:** §3.1, §4.4
**Resolution:** See [ARCH.md — D1](ARCH.md#d1--storage-engine-libsql). Decision: **libsql**.

### A.2 — How authors select scheduling policies ✓ RESOLVED

**SPEC refs:** §6.1, §6.2, §6.3
**Resolution:** See [SPEC.md — §6.3](../SPEC.md). Decision: **inferred scheduling**.

Authors never declare a scheduling mode. The compiler infers the required scheduling
infrastructure from natural-language temporal expressions in rules. Turn-based is the
zero-configuration default.

### A.3 — Natural-language syntax for temporal features ✓ RESOLVED

**SPEC refs:** §3.4, §6.2, §6.3
**Resolution:** All three categories now specified: scheduling (§6.3.3), history
queries (§3.4.4), journaling configuration (§3.4.3).

### A.4 — Extension migration path ✓ RESOLVED

**Decision:** Chord does not natively support Inform 7 `.i7x` extension files. The package system (§9) is the sole extension mechanism.

### A.5 — Package registry federation ✓ RESOLVED

**Decision:** See [ARCH.md — D3](ARCH.md#d3--package-registry-federation-url-identified-provider-managed). URL-identified registries, provider-managed auth, author-declared priority order.

---

## B. Internal Contradictions — ALL RESOLVED

### B.1 — "No runtime dependency" vs. FFI for embeddings ✓ RESOLVED

**Resolution:** See [ARCH.md — D4](ARCH.md#d4--embeddings-design-time-and-compile-time-only). Embeddings at design/compile time only, never runtime.

### B.2 — Optional values vs. open-world "unknown" ✓ RESOLVED

**Resolution:** See [ARCH.md — D5](ARCH.md#d5--open-world-semantics-fail-safe-with-graduated-diagnostics). Three-state model (valued / absent / unknown), fail-safe with graduated diagnostics.

### B.3 — Backward compatibility vs. enhanced type system ✓ RESOLVED

**Resolution:** See [ARCH.md — D7](ARCH.md#d7--backward-compatibility-softened-guarantee-no-compatibility-modes). Softened guarantee, no compatibility modes.

### B.4 — Semantic output stream vs. behavioral fidelity ✓ RESOLVED

**Resolution:** See [ARCH.md — D6](ARCH.md#d6--output-boundary-semantic-stream-only). Semantic stream is sole output interface.

---

## C. Missing Specifications — ALL RESOLVED

### C.1 — Error model ✓ RESOLVED

**Resolution:** See [ARCH.md — D8](ARCH.md#d8--error-model-fail-safe-with-provenance). Fail-safe with provenance.

### C.3 — Compilation model ✓ RESOLVED

**Resolution:** Resolved by implementation. See `compiler/src/compiler.ts`.
Four phases: tokenize → parse → analyze → generate.

### C.4 — Parser specification ✓ RESOLVED

**Resolution:** Resolved by implementation. See `compiler/src/parser.ts`.
Deterministic recursive-descent parser handles the Chord DSL. Grammar defined in
`MVP.md`. NL parsing is a Phase 1 design task.

### C.5 — Concurrency model ✓ RESOLVED

**Resolution:** See [ARCH.md — D9](ARCH.md#d9--concurrency-serialized-turns-deterministic-tick-order). Serialized turns, deterministic tick order.

### C.6 — Save/restore specification ✓ RESOLVED

**Resolution:** See [ARCH.md — D10](ARCH.md#d10--saverestore-full-state-snapshots-via-libsql). Full-state libsql snapshots.

---

## D. Feature Interactions — 3 RESOLVED, 1 OPEN

### D.1 — Reactive rules + temporal state ✓ RESOLVED

**Resolution:** §3.4.5 confirms reactive rule mutations are journaled with full
provenance. Reactive rule timing specified by D9 (resolve immediately).

### D.3 — Structured syntax + natural language interop ✓ RESOLVED

**Resolution:** Resolved by implementation. Single DSL compiles through one AST to
one representation. All names visible throughout.

### D.7 — Standard library extraction (open — Phase 3)

**SPEC refs:** §9.3, §12.1, §12.2

The engine's built-in rules (`engine/src/rulebooks/`) are the proto-standard-library:
taking, dropping, going, looking, examining, inventory, opening, closing, putting.

**Workaround:** The engine already supports pluggable rules:
- `new Engine({ skipDefaultRules: true })` — skip all built-in rules
- `engine.registerRule('verb', rule)` — register custom rules
- The compiled story's `loadStory(engine)` function registers rules via this API

Extraction to a formal package is Phase 3 scope. Per D7, the standard library evolves
and authors adapt — no frozen legacy edition.

---

## E. Authoring Surface Gaps — ALL RESOLVED

### E.2 — Structured syntax design ✓ RESOLVED

**Resolution:** Resolved by implementation. The Chord DSL defined in `MVP.md` and
implemented in `compiler/src/parser.ts`. Examples in `engine/src/demo-story.ts` and
`engine/test/stories/`.

---

## F. Deferred to Phase Roadmap

The following items were removed from this document because they describe design
questions for features that do not yet exist. They will be addressed as part of their
respective phase designs. See `doc/SPEC.md` for the phase roadmap.

- **Phase 1:** NL parser ambiguity resolution, progressive disclosure defaults
- **Phase 2:** NL syntax for enhanced types (sum types, optionals, parameterized
  kinds), vector similarity + open-world interaction, advanced feature composition
  examples
- **Phase 3:** Package namespacing + rule cascade ordering, FFI security model
- **Deferred indefinitely:** Resource model (Wasm memory budgets, vector dimension
  thresholds), multiplayer turn semantics, async embeddability protocol

---

## G. Spec Gaps — Underspecified Features

Features described conceptually in SPEC.md but lacking the concrete syntax,
protocol definitions, or detail needed to implement them.

### G.1 — Structured Syntax Mode

**SPEC refs:** §2.2
The spec describes an "escape hatch" where authors drop into structured syntax
alongside natural language. Scattered `[annotation]` examples appear in §3.3.11,
§3.4.6, and §6.3.9, but there is no unified grammar for structured mode — no
entry/exit delimiters, no formal syntax, no interaction rules with the NL surface.

### G.2 — Sum Types (Enumerations with Associated Data)

**SPEC refs:** §2.3
The spec says a "response" might be "an agreement carrying a belief" or "a refusal
carrying a reason." No declaration syntax, no pattern-matching syntax, no examples
of how sum types compose with the rule system or conditions.

### G.3 — Parameterized Kinds

**SPEC refs:** §2.3
"A list of beliefs" and "a relation between people and arguments" are mentioned as
desirable types. No declaration syntax for kind parameters, no instantiation syntax,
no type-checking rules.

### G.4 — First-Class Rules and Phrases

**SPEC refs:** §2.3
Rules and phrases should be "passable as values." No syntax for declaring a
rule-typed variable, passing a rule to a phrase, or invoking a rule value.

### G.5 — Ontological Namespacing

**SPEC refs:** §2.4
"Contextual disambiguation or author-chosen aliases" are mentioned. No syntax for
declaring a namespace, importing a namespaced vocabulary, resolving collisions, or
defining aliases. Critical dependency for the package system (§9).

### G.6 — Vector Similarity Query Syntax

**SPEC refs:** §4.1–§4.5
The spec defines the conceptual model (embeddings as index, not property; no fuzzy
conditions) but provides no language-level syntax for: attaching embeddings to
objects, writing similarity queries ("the 5 concepts most similar to X"), or
integrating query results into rule conditions.

### G.7 — Rule Provenance Query Syntax

**SPEC refs:** §5.2
Provenance metadata (source location, library, specificity score, rulebook position)
is described. No syntax for inspecting this at runtime or in authored conditions.
No specification of what the tooling API looks like.

### G.8 — Compositional Rulebooks

**SPEC refs:** §5.3
"A social interaction rulebook might consult etiquette rules, then relationship
rules, then personality rules." No syntax for declaring a composite rulebook,
specifying consultation order, or controlling fall-through behavior.

### G.9 — Semantic Output Stream Protocol

**SPEC refs:** §8.1, §8.2
The spec says the story emits "typed output events" — room descriptions, dialogue
lines, prompts, etc. No format is defined: no event type catalog, no encoding
(JSON, binary, protobuf), no transport mechanism, no versioning strategy.

### G.10 — Structured Input Event Format

**SPEC refs:** §8.3
"Structured input events rather than raw text strings." No event schema, no
enumeration of event types (text command, click, voice transcript), no
normalization rules.

### G.11 — Package Registry API and Format

**SPEC refs:** §9.1, §9.2, §9.4
Registries are URL-identified and provider-managed (per D3/A.5). But there is no
package manifest format, no registry HTTP API, no dependency resolution algorithm,
no versioning scheme (semver? something else?), and no package file structure.

### G.12 — Foreign Function Interface

**SPEC refs:** §11.2
"Sandboxed and capability-gated." No calling convention, no capability declaration
syntax, no sandbox implementation strategy, no host-side binding API. The FFI is
referenced by §4.4 (embeddings) and §11.1 (embeddability) but never defined.

### G.13 — Data Import/Export Format

**SPEC refs:** §11.3
"JSON, CSV, or similar." No schema for exported world state, no import validation
rules, no round-trip guarantees.

### G.14 — Continuous Time

**SPEC refs:** §6.2, §6.3.5
Mentioned as an opt-in mode requiring `[continuous-time: enabled]`. No detail on
clock increment configuration, integration with the tick/turn hierarchy, or how
continuous-time rules interact with discrete state changes.

### G.15 — Phantom Appendix Sections

**SPEC refs:** throughout
The spec references §C.5 (reactive rule resolution order), §C.6 (save/restore),
§C.8 (progressive disclosure), §D.1 (reactive rules + temporal state), and §D.5
(multiplayer) — but these sections were never written into SPEC.md. Some are
partially addressed by ARCH.md decisions (C.5→D9, C.6→D10) but the spec text
itself has dangling cross-references.

### G.16 — Formal Grammar

**SPEC refs:** §2 (entire section)
The main SPEC.md describes language features in prose but never provides a formal
grammar (BNF/EBNF). MVP.md contains grammar sketches, but these are in a separate
document and cover only the MVP subset.

### G.17 — Runtime Error Handling

**SPEC refs:** §5.2 (provenance), ARCH.md D8 (fail-safe principle)
D8 establishes the principle (fail-safe with provenance) but the spec doesn't
address concrete runtime failure modes: what happens when a rule body throws an
exception, when the database is corrupted, when an FFI call fails, or when the
event queue overflows.

### G.18 — Multiplayer

**SPEC refs:** §8.4, §6.3.4 (D.5 reference), §6.3.5
Multiplayer is referenced in scheduling ("when all players in a round have acted"),
clock rules ("execute authoritatively on the server"), and I/O ("multiple clients
can connect"). None of these are specified beyond a single sentence each.

---

## H. Spec Inconsistencies

Internal contradictions or tensions within SPEC.md that need resolution.

### H.1 — Compatibility Claims

**SPEC refs:** §1.2, §12.1
§1.2 says "The Chord compiler accepts valid Inform 7 source texts and aims for
broad behavioral compatibility." §12.1 says "Enhanced type features (optionals,
sum types, parameterized kinds) apply uniformly and may require minor adaptation
of legacy code." These are in tension: the compiler cannot both accept all valid
I7 source and require adaptation. D7 (softened guarantee) resolves the design
intent but the spec text itself still contains both claims.

### H.2 — Overloaded "Absent" Semantics

**SPEC refs:** §3.3 (three-state model), §3.4.5 (beyond retention depth)
§3.3 defines "absent" as "the author explicitly said has no X" — a deliberate
narrative statement. §3.4.5 says history queries beyond retention depth return
"absent." These are semantically different: one is authorial intent, the other is
data loss from a sliding window. Reusing the same state conflates them.

### H.3 — Compile-Time Embeddings vs. Runtime Similarity

**SPEC refs:** §4.4, §4.5
§4.4 says embeddings are generated at design/compile time, not runtime, with no
runtime dependency on external services. §4.5 describes finding "the most
conceptually adjacent beliefs in an NPC's mind when the player introduces a new
idea." If embeddings are baked in at compile time, dynamically created objects or
player-introduced concepts cannot have embeddings. The spec doesn't address this.

### H.4 — WebAssembly Target vs. TypeScript Implementation

**SPEC refs:** §7.1, §7.2
The spec names WebAssembly as the primary compilation target. The actual
implementation compiles Chord source to TypeScript that runs on Node.js with
libsql. This is a pragmatic MVP choice but the spec and implementation diverge.
The spec should acknowledge TypeScript/Node as the initial target with Wasm as
a future goal, or the implementation roadmap should include a Wasm migration.

### H.5 — No Default Frontend

**SPEC refs:** §8.2
"Chord does not include or specify a default frontend." For the platform to be
usable, at least one reference reader must exist. The spec should distinguish
between "Chord the compiler/runtime doesn't bundle a frontend" and "no frontend
will be provided at all." A reference CLI reader is a practical necessity.

### H.6 — Dual SPEC Files

**SPEC refs:** root `SPEC.md`, `doc/SPEC.md`
Two spec documents exist with overlapping but inconsistent scope. `doc/SPEC.md`
is a brief phase roadmap (Phases 0–3). Root `SPEC.md` is the comprehensive
specification. The phase numbers in `doc/SPEC.md` don't map cleanly to the section
numbers in root `SPEC.md`. One should be canonical; the other should be removed
or clearly subordinated.

### H.7 — "Unknown Never Matches" vs. Reactive Transition Semantics

**SPEC refs:** §3.3.5, §3.3.9
§3.3.5 establishes that unknown values never match conditions. §3.3.9 says
"becomes [condition]" fires when a property transitions from unknown to a
satisfying value — because the *transition* is what's being tested, not the
current value alone. This is logically consistent but the interaction is subtle.
The spec doesn't explicitly reconcile these two rules or explain why they don't
conflict. An author reading §3.3.5 in isolation would reasonably expect that
unknown→2 would not fire "becomes less than 3."
