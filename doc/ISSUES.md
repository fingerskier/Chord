A. Resolve OPEN_QUESTIONS (5 items)
Each open question maps to a gap in ARCH.md. The fix is to add or amend a subsection.

A.1 — libsql for vectors and remote-sync (deferrable)
Gap: §3.1 and §4.4 hedge with "such as SQLite" / "such as sqlite-vec". No mention of remote sync.
Refinement: Add §3.5 Storage Engine committing to libsql. It unifies relational storage, native vector search, and opt-in remote sync (eventual consistency, conflict resolution owned by host). Journaled properties sync as append-only logs.

A.2 — Scheduling policy selection (implementation-blocking)
Gap: §6.2 lists four scheduling modes but provides zero mechanism for authors to select or configure them.
Refinement: Add §6.3 Policy Declaration. Policy is declared at story level with per-actor/per-region overrides via natural language ("Alice acts on a tick-based schedule.") and structured syntax (@schedule(policy: tick)). Define the containment hierarchy: turn > tick > event > continuous-time-step.

A.3 — Temporal expressions in natural language (high priority)
Gap: §3.4 and §6.2 reference temporal state and scheduled events but give no authoring syntax.
Refinement: Add §6.4 Temporal Expressions. Cover three categories:

Scheduling: "In 3 turns, [event]." / "After 2.5 seconds, [event]."
Querying: "the previous location of the player" / "whether trust has ever been below 3"
Configuring: journaling depth is per-property, defaults to unlimited
A.4 — Extension backward compatibility (medium priority)
Gap: §12.1 says extensions compile without modification but doesn't define what extensions structurally are or how they coexist with the new package system.
Refinement: Add §12.4 Extension Migration. Inform 7 extensions are plain text files with standard headers; the compiler treats them as implicit single-file packages. A chord migrate-extension tool converts to package format. Legacy extensions and packages can coexist; packages take precedence on name collision.

A.5 — Federated package marketplaces (deferrable)
Gap: §9.1 says "a package registry" (singular). Open question envisions multiple federated marketplaces.
Refinement: Revise §9.1 to describe federated marketplaces. Authors configure marketplace URLs in priority order. Package metadata stored in local libsql table for queryability. Start with a single default Chord Registry; the protocol allows third-party registries.

B. Fix Internal Inconsistencies (4 items)
B.1 — "No runtime dependency" vs FFI for embeddings
Conflict: §4.4 claims "no runtime dependency on external services" but allows runtime embedding generation via FFI (§11.2).
Fix: Reword §4.4 to distinguish the vector index (always local, no dependency for queries) from vector computation (may use external services via FFI). The no-dependency guarantee applies to similarity lookups, not embedding generation.

B.2 — Optional values vs open-world vs closed-world (high-impact)
Conflict: §2.3 introduces optional values ("explicitly no value") while §3.3 introduces open-world ("unknown truth value"). These overlap confusingly.
Fix: Add clarification distinguishing three states:

Valued — definite value (normal)
Absent (optional) — explicitly no value ("X has no Y")
Unknown (open-world) — truth not established ("we don't know if X has Y")
Closed-world: unset = absent. Open-world: unset = unknown. Optionals allow absent in both modes.

B.3 — Backward compat vs enhanced type system
Conflict: §12.1 claims "superset" but new type features (optionals, sum types) could change semantics of existing code if applied to legacy Standard Rules.
Fix: Add constraint to §12.1: compatibility mode disables new type features for legacy Standard Rules kinds/properties. New types available only for author-defined and Chord-versioned package types.

B.4 — Semantic output stream vs behavioral fidelity
Conflict: §8.1 mandates semantic output (typed events). §12.2 requires "identical behavior" to Glulx. Raw text != semantic events.
Fix: Clarify §12.2: "identical" means player-observable narrative content and state transitions, not byte-level output. A compatibility presentation layer that renders semantic stream to plain text must produce output indistinguishable from original Glulx output for same inputs.

C. Fill Architectural Gaps (7 items)
C.1 — No error model (implementation-blocking)
Gap: No failure semantics anywhere in the spec.
Add §5.5 Error Handling:

Preserve Inform 7's succeed/fail/no-decision rule outcomes
FFI failures return absent (optional) values
Empty similarity queries return empty lists
Reactive rule cycles: break after configurable max depth (default 10), emit diagnostic
Exhaustive pattern matching on sum types enforced at compile time; accessing absent optional = runtime panic with source map
C.2 — No memory model or resource limits
Gap: §3.2 promises tens of thousands of objects + journaled histories + vectors with no resource discussion.
Add §7.4 Resource Management:

Arena allocation per turn + libsql for persistent state
Configurable WASM memory budget (default 256MB)
Journaled properties: configurable retention depth (default unlimited)
Vector indices: declared embedding dimension, warnings at scale thresholds
C.3 — No compilation model (implementation-blocking)
Gap: §7.2 handwaves "directly or through a thin IR." No compiler architecture.
Add §7.4 Compiler Architecture (or note a separate doc/COMPILER.md is needed):

Four phases: PARSE → RESOLVE → LOWER → EMIT
Grammar extensible by packages (new NL patterns for new kinds/actions)
Structured syntax uses fixed context-free grammar
Chord IR: typed, register-based, world model queries compiled to SQL
Incremental compilation at declaration level for LSP support
C.4 — No parser specification (implementation-blocking)
Gap: The NL parser is the hardest technical problem; the spec says nothing about it.
Add §2.5 Parser Architecture:

Grammar-driven; core grammar + package-extended patterns
Ambiguity resolution: specificity first, locality second
NL/structured syntax boundary delimiter (flag as TBD — candidates: indentation, braces, keyword)
Backward compat validated by comprehensive Inform 7 source text test suite
C.5 — No concurrency model (implementation-blocking)
Gap: §6 has composable scheduling; §8.4 has multiplayer; §5.4 has reactive rules. No ordering semantics.
Add §6.5 Concurrency and Ordering:

Within a turn, all state changes serialized
Tick-based actors: deterministic order (alphabetical default, author-overridable)
Reactive rules resolve immediately within current actor's action
Multiplayer: commands collected and ordered by host (FIFO / simultaneous / priority)
World model uses serializable transactions; conflicting writes resolved by rule system
C.6 — No save/restore specification (implementation-blocking)
Gap: Save/restore is core IF functionality; only mentioned in passing in §3.1.
Add §3.6 Save, Restore, and Undo:

Save = database snapshot (all tables including journal history)
Restore = replace database with snapshot
Undo = revert to pre-turn state using journaling
Vector indices rebuilt on restore (derived, not primary state)
Output transcript is presentation-layer concern, not saved
C.7 — No FFI security model
Gap: §11.2 says "sandboxed and capability-gated" with no details.
Add §11.4 Capability Model:

Standard capabilities: network, filesystem, embedding, llm, hardware — each scoped
Declared in project manifest or package header
Denied capability → FFI returns absent value (ties to §5.5 error model)
Packages declare required capabilities; story grants them
D. Specify Feature Interactions (7 items)
D.1 — Reactive rules + temporal state (high)
Add to §5.4: reactive rule mutations are journaled. All intermediate states recorded. Journal entries carry rule provenance. Temporal conditions permitted in reactive triggers (they reference concrete journaled values).

D.2 — Vector similarity + open-world state (medium)
Add to §4.1: embeddings computed from declaration-time content by default (static). Authors can declare recomputation triggers for dynamic embeddings.

D.3 — Structured syntax + NL surface interop (high)
Add to §2.2: both modes compile to same AST. Names defined in either mode visible in both. Cross-referencing is bidirectional.

D.4 — Package namespacing + rule cascade ordering (high)
Add to §5.1 or §9.2: in shared rulebooks, author rules > package rules (in manifest order) > standard library. Authors can explicitly reorder cross-package rules, extending Inform 7's existing mechanism.

D.5 — Multiplayer + turn model (medium)
Add to §8.4: "the player" becomes "the current actor" in multiplayer. Players act sequentially or simultaneously per host policy. "Every turn" fires per-round; "every player-turn" fires per-actor.

D.6 — Embeddability + output protocol (deferrable)
Add to §11.1: semantic stream is JSON objects, delivered async. "Prompt" event signals input needed. Separate query channel for world state inspection (aligned with §10.2 REPL).

D.7 — Standard library extraction + backward compat (high-impact)
Add to §9.3: compiler implicitly includes standard library. Compatibility mode pins to frozen "legacy" version. New projects default to latest. Authors can declare version in manifest.