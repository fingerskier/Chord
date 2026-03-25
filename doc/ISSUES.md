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

## F. Deferred to Phase Roadmap ✓ RESOLVED

The following items have been specified at the spec level. Concrete syntax,
semantics, and protocols are documented in the referenced sections.
Implementation proceeds according to the phase roadmap in `IMPLEMENT.md`.

- **Phase 1 (NL parser ambiguity, progressive disclosure):** ✓ Resolved.
  See SPEC.md §2.1.1 (ambiguity resolution strategy), §2.2.1 (structured syntax
  grammar), §1.3.1 (progressive disclosure mechanism), ARCH.md D11.

- **Phase 2 (enhanced types, vector similarity, feature composition):** ✓ Resolved
  at spec level. See `doc/TYPES.md` (sum types, optionals, parameterized kinds,
  first-class rules), SPEC.md §4.2.1–§4.2.3 (vector similarity syntax),
  SPEC.md §3.5 (feature composition worked example).

- **Phase 3 (namespacing, rulebook composition, FFI):** ✓ Resolved at spec level.
  See SPEC.md §2.4.1–§2.4.4 (ontological namespacing), SPEC.md §5.3.1–§5.3.3
  (compositional rulebooks), SPEC.md §11.2.1–§11.2.5 (FFI security model),
  ARCH.md D12.

- **Deferred indefinitely (resource model, multiplayer, async):** ✓ Partially
  resolved. Resource model constraints documented in SPEC.md §7.4 (ARCH.md D13).
  Multiplayer turn semantics specified in SPEC.md §8.4.1–§8.4.4 (ARCH.md D14);
  transport deferred to host. Async embeddability API documented in SPEC.md
  §11.1.1; implementation depends on Phases 5–6.

---

## G. Spec Gaps — Underspecified Features

Features described conceptually in SPEC.md but lacking the concrete syntax,
protocol definitions, or detail needed to implement them.

### G.1 — Structured Syntax Mode ✓ RESOLVED

**SPEC refs:** §2.2
**Resolution:** SPEC.md §2.2.1 now defines the unified structured syntax grammar:
`[key: value]` inline annotations, `[begin structured]`/`[end structured]` block
annotations, entry/exit delimiters, precedence rules, and consolidation of all
scattered annotation examples. ARCH.md D11 records the decision.

### G.2 — Sum Types (Enumerations with Associated Data) ✓ RESOLVED

**SPEC refs:** §2.3
**Resolution:** `doc/TYPES.md` §1 specifies complete sum type syntax: declaration
(`[Kind] can be [variant] carrying [type]`), pattern matching (NL and structured),
exhaustiveness enforcement per D8, integration with rule conditions, and nested
sum types.

### G.3 — Parameterized Kinds ✓ RESOLVED

**SPEC refs:** §2.3
**Resolution:** `doc/TYPES.md` §3 specifies parameterized kinds: three built-in
constructors (`list of [K]`, `relation between [K₁] and [K₂]`, `mapping from
[K₁] to [K₂]`), instantiation syntax, manipulation phrases, type checking, and
storage representation.

### G.4 — First-Class Rules and Phrases ✓ RESOLVED

**SPEC refs:** §2.3
**Resolution:** `doc/TYPES.md` §4 specifies first-class rules: rule-typed variables,
`apply [rule] to [value]` invocation syntax, rule references in conditions, why
anonymous rules are not supported, and higher-order patterns (strategy pattern).

### G.5 — Ontological Namespacing ✓ RESOLVED

**SPEC refs:** §2.4
**Resolution:** SPEC.md §2.4.1–§2.4.4 now specifies: package-header namespace
declaration, `Include` import syntax, qualified name prefix and alias
disambiguation, collision precedence rules, and structured syntax equivalents.

### G.6 — Vector Similarity Query Syntax ✓ RESOLVED

**SPEC refs:** §4.1–§4.5
**Resolution:** SPEC.md §4.2.1–§4.2.3 now specifies: embedding attachment syntax
(NL and structured), implicit vs. explicit embeddings, similarity query syntax
(`the N [kind] most similar to [reference]`), text-based queries, and integration
with parameterized lists from `doc/TYPES.md`.

### G.7 — Rule Provenance Query Syntax

**SPEC refs:** §5.2
Provenance metadata (source location, library, specificity score, rulebook position)
is described. No syntax for inspecting this at runtime or in authored conditions.
No specification of what the tooling API looks like.

### G.8 — Compositional Rulebooks ✓ RESOLVED

**SPEC refs:** §5.3
**Resolution:** SPEC.md §5.3.1–§5.3.3 now specifies: consultation order syntax
(`consults ... then ...`), sequential semantics with stop-on-halt default,
fall-through control annotation `(with fall-through)`, structured syntax, and
composite priority rules for cascade integration.

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

### G.12 — Foreign Function Interface ✓ RESOLVED

**SPEC refs:** §11.2
**Resolution:** SPEC.md §11.2.1–§11.2.5 now specifies: capability declaration syntax
(NL and structured), five standard capabilities, host binding API (TypeScript
interface), calling convention (`the result of calling [fn] with [args]`), and
sandbox/failure model (absent on denial per D8). ARCH.md D12 records the decision.

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

### G.16 — Formal Grammar ✓ RESOLVED

**SPEC refs:** §2 (entire section)
**Resolution:** `doc/GRAMMAR.md` provides a complete EBNF grammar for the Phase 0 / MVP
Chord DSL, derived from `MVP.md` sketches and `compiler/src/parser.ts`. The grammar
document is designated as the single source of truth; the parser should be updated to
match when they diverge.

### G.17 — Runtime Error Handling

**SPEC refs:** §5.2 (provenance), ARCH.md D8 (fail-safe principle)
D8 establishes the principle (fail-safe with provenance) but the spec doesn't
address concrete runtime failure modes: what happens when a rule body throws an
exception, when the database is corrupted, when an FFI call fails, or when the
event queue overflows.

### G.18 — Multiplayer ✓ PARTIALLY RESOLVED

**SPEC refs:** §8.4, §6.3.4 (D.5 reference), §6.3.5
**Resolution:** SPEC.md §8.4.1–§8.4.4 now specifies: connection model (clients
assigned player entities), two turn resolution policies (FIFO and simultaneous),
observer mode, and scope boundary (Chord provides turn semantics; transport/auth
deferred to host). ARCH.md D14 records the decision. Networking protocol remains
host-dependent and intentionally unspecified.

---

## H. Spec Inconsistencies

Internal contradictions or tensions within SPEC.md that need resolution.

### H.1 — Compatibility Claims ✓ RESOLVED

**SPEC refs:** §1.2, §12.1
**Resolution:** §1.2 now explicitly references §12.1 and states that full backward
compatibility is not guaranteed. Both sections use consistent language: "broad
source-level compatibility" with "minor adaptation" expected. The softened guarantee
from D7 is reflected in the spec text.

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

### H.4 — WebAssembly Target vs. TypeScript Implementation ✓ RESOLVED

**SPEC refs:** §7.1, §7.2
**Resolution:** SPEC.md §7.1 renamed to "Compilation Targets" and now acknowledges
TypeScript/Node.js as the current shipping target, with WebAssembly documented as
a future design goal. §7.4 resource constraints are explicitly scoped to the
future Wasm phase.

### H.5 — No Default Frontend

**SPEC refs:** §8.2
"Chord does not include or specify a default frontend." For the platform to be
usable, at least one reference reader must exist. The spec should distinguish
between "Chord the compiler/runtime doesn't bundle a frontend" and "no frontend
will be provided at all." A reference CLI reader is a practical necessity.

### H.6 — Dual SPEC Files ✓ RESOLVED

**SPEC refs:** root `SPEC.md`, `doc/SPEC.md`
**Resolution:** Root `SPEC.md` is canonical. `doc/SPEC.md` has been rewritten as a
brief roadmap summary that explicitly points to the root spec and to `IMPLEMENT.md`
for detailed phase plans. No overlapping content remains.

### H.7 — "Unknown Never Matches" vs. Reactive Transition Semantics

**SPEC refs:** §3.3.5, §3.3.9
§3.3.5 establishes that unknown values never match conditions. §3.3.9 says
"becomes [condition]" fires when a property transitions from unknown to a
satisfying value — because the *transition* is what's being tested, not the
current value alone. This is logically consistent but the interaction is subtle.
The spec doesn't explicitly reconcile these two rules or explain why they don't
conflict. An author reading §3.3.5 in isolation would reasonably expect that
unknown→2 would not fire "becomes less than 3."
