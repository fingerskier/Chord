# Architecture Decisions

This document records concrete implementation decisions for the Chord platform.
Where `SPEC.md` describes design intent and desired capabilities, this document
commits to specific technologies, patterns, and tradeoffs. Each decision
resolves an open question or refines an underspecified area of the spec.

---

## Decision Format

Each entry follows this structure:

- **ID** — sequential, prefixed `D` (e.g., D1)
- **Status** — `decided` or `exploring`
- **Date** — when the decision was made or last revised
- **SPEC/Issue refs** — links to relevant spec sections and issues
- **Context** — the problem or question being resolved
- **Decision** — what we chose
- **Rationale** — why this choice over alternatives

---

## D1 — Storage engine: libsql

**Status:** decided
**Date:** 2026-02-22
**SPEC refs:** §3.1, §4.4
**Issue refs:** A.1

**Context:**
SPEC §3.1 calls for an embedded relational engine ("such as SQLite") to back the
world model, and §4.4 requires a vector index ("such as sqlite-vec") for the
similarity query layer. Issue A.1 flagged the hedged language — the choice of
storage engine has downstream consequences for journaled properties, save/restore,
and vector queries.

**Decision:**
Use **libsql** (the Turso fork of SQLite) as the embedded relational engine.

**Rationale:**
- SQLite wire-compatible — sqlite-vec and the existing SQLite ecosystem work
  without modification
- Embedded mode suitable for WebAssembly compilation target (§7)
- Built-in replication support enables multiplayer and cloud scenarios (§8.4)
  without bolting on a separate sync layer
- Actively maintained open-source project (MIT license, compatible with
  Apache 2.0)
- Virtual table and extension support for future needs (custom indexes,
  full-text search)

---

## D2 — Scheduling: real-time wall clock with per-rule temporal binding

**Status:** decided
**Date:** 2026-02-22
**SPEC refs:** §6.3
**Issue refs:** A.2

**Context:**
SPEC §6.2 defines four scheduling modes (turn-based, tick-based, event-driven,
continuous time) and says they are composable, but provides no mechanism for authors
to select or configure them. Issue A.2 flagged this as blocking.

**Decision:**
Scheduling is compiler-inferred from natural-language temporal expressions, not
author-declared. Each rule carries its own temporal binding (turn, clock, tick, or
event). The engine activates only the scheduling layers that are actually referenced.
Turn-based is the zero-configuration default.

Clock-scheduled rules ("every 2 minutes the speaker squawks") fire in real time via
the host environment's event loop. The semantic output stream (§8.1) delivers
clock-rule output asynchronously. In constrained environments (terminal, batch CI),
the engine falls back to batch-on-input mode.

**Rationale:**
- Inference-based activation preserves §1.1 ("describing a world is programming it")
  — authors never write meta-declarations about scheduling modes
- Per-rule binding implements progressive disclosure (§1.3, C.8): simple stories see
  no scheduling machinery; complex stories activate it by describing their world
- Real-time clock execution produces the most immersive author experience for
  time-based rules, matching the author's intent when they write "every 2 minutes"
- Fallback mode ensures portability across host environments
- The semantic output stream already supports asynchronous delivery, so clock output
  requires no new protocol

---

## D3 — Package registry federation: URL-identified, provider-managed

**Status:** decided
**Date:** 2026-02-22
**SPEC refs:** §9.1, §13.2
**Issue refs:** A.5

**Context:**
SPEC §9.1 described "a package registry" (singular). Issue A.5 flagged that
federation — the ability to query multiple registries — is a design-time decision
that is cheap to make now and expensive to retrofit. As the ecosystem grows,
authors and organizations will want private or domain-specific registries.

**Decision:**
Registries are URL-identified services. Authors declare one or more registry URLs
in their project configuration, listed in priority order. The tooling queries them
sequentially during dependency resolution. Authentication and access control are
the responsibility of each registry provider, not the platform itself. A default
public registry serves the open ecosystem.

**Rationale:**
- Provider-managed auth keeps the platform simple and avoids centralizing access
  control decisions that vary by organization
- URL identification is a universal, extensible addressing scheme that works for
  public registries, private corporate servers, and local file-based registries
- Priority ordering gives authors explicit control over resolution precedence
  without complex merge logic
- The model mirrors established patterns (npm + private registries, Claude plugin
  marketplace, Docker registry federation) that have proven to scale

---

## D4 — Embeddings: design-time and compile-time only

**Status:** decided
**Date:** 2026-02-22
**SPEC refs:** §4.4, §11.2
**Issue refs:** B.1

**Context:**
§4.4 claimed "no runtime dependency on external services" for the vector index, but
also said embeddings could be "generated at runtime for dynamic content" via FFI
(§11.2). Issue B.1 flagged this as an internal contradiction — runtime embedding
generation inherently depends on an external service.

**Decision:**
Embeddings are generated only at design time and compile time, never at runtime.
Authors may use external tools and services (via FFI) during the design cycle to
produce or regenerate embeddings, but the resulting vectors are baked into the
compiled artifact. The no-runtime-dependency guarantee holds without qualification.

**Rationale:**
- Eliminates the contradiction cleanly rather than carving out exceptions
- Compiled artifacts are self-contained and portable — no network calls at play time
- Aligns with the platform's offline-first, author-centric philosophy
- Design-time regeneration still supports large or evolving concept spaces without
  compromising runtime independence

---

## D6 — Output boundary: semantic stream only

**Status:** decided
**Date:** 2026-02-22
**SPEC refs:** §8.1, §8.2, §12.2
**Issue refs:** B.4, D.6

**Context:**
§8.1 defines a structured semantic output stream of typed events. The original
Inform 7/Glulx output is raw text. Issue B.4 asked how Chord handles this gap —
whether it provides a compatibility presentation layer to approximate legacy text
output.

**Decision:**
Chord's output boundary is the semantic stream. The engine emits typed semantic
events (room descriptions, dialogue, prompts, etc.) and nothing else. All
rendering — text, graphical, voice, legacy-compatible — is the reader/player
application's responsibility. Chord does not include, bundle, or specify a default
frontend or presentation layer.

**Rationale:**
- Clean separation of concerns: the engine simulates, the reader presents
- Enables diverse frontends without Chord carrying presentation baggage
- Aligns with §11.1 (embeddability) — an embedding host consumes the same stream
- Eliminates the ambiguity about who owns "compatibility" rendering
- The semantic stream already carries enough structure for any reader to
  reconstruct text output

---

## D5 — Open-world semantics: fail-safe with graduated diagnostics

**Status:** decided
**Date:** 2026-02-22
**SPEC refs:** §2.3, §3.3, §5.4
**Issue refs:** B.2

**Context:**
§2.3 introduces optional values ("a property may explicitly have no value") and §3.3
introduces open-world properties ("truth value may be unknown"). Issue B.2 flagged the
overlap: if a person's "loyalty" is unset, is that "no loyalty" (optional/absent) or
"loyalty unknown" (open-world)? The core design question: when a condition encounters
an unknown value at runtime, should the system require the author to handle it
explicitly, or should it fail safe?

**Decision:**
The system fails safe by default — unknown values cause conditions to evaluate to
"no match" (the rule does not fire). The compiler provides graduated diagnostics
(informational → suggestion → warning → error) to guide authors toward explicit
handling when it matters. The three-state model (valued / absent / unknown) is
specified in full, with "absent is known" as the key semantic distinction.

Arithmetic on unknown is a compile error (no sensible fail-safe exists). Say phrases
on unknown produce a compiler warning. Conditions on unknown silently don't match.
Authors can test for known-ness (`if X is known`), provide defaults
(`or 0 if unknown`), or suppress suggestions (`even if unknown`).

**Rationale:**
- Follows the progressive-disclosure pattern established by journaling (§3.4) and
  scheduling inference (§6.3): zero-configuration default, single-word opt-in,
  compiler-inferred infrastructure, graduated diagnostics
- Fail-safe preserves §1.1 ("building a world, not writing software") — an author
  who opts into open-world properties for narrative reasons should not face a wall
  of compiler errors
- Graduated diagnostics preserve §1.3 ("expand the ceiling without raising the
  floor") — simple stories are unaffected, advanced authors get guidance
- The "absent is known" distinction respects narrative intent: "Bob has no loyalty"
  is a characterization; silence about Bob's loyalty is uncertainty
- Closed-world mode (the default) is completely unaffected — unknown never exists,
  `is unknown` always returns false, `is known` always returns true

---

## D7 — Backward compatibility: softened guarantee, no compatibility modes

**Status:** decided
**Date:** 2026-03-20
**SPEC refs:** §2.3, §12.1, §12.2
**Issue refs:** B.3

**Context:**
§12.1 claims the natural language surface is "a superset of the existing language,"
but enhanced type features from §2.3 (optionals, sum types, parameterized kinds)
could change the semantics of existing code. If a built-in property becomes optional
where it wasn't before, existing code that assumes it always has a value could break.
Issue B.3 flagged this contradiction between backward compatibility promises and the
enhanced type system.

**Decision:**
Chord's backward-compatibility guarantee is softened: Chord aims for broad
compatibility with existing Inform 7 source texts but does not guarantee exact
reproduction of legacy behavior. Enhanced type features apply uniformly — there
are no compatibility modes, flags, or per-story version selectors. Authors of
existing stories should expect minor adaptation when moving to Chord.

**Rationale:**
- Compatibility modes fragment the language and create a permanent maintenance burden
- The enhanced type system is a core design goal (§2.3), not optional — carving out
  a legacy mode would mean maintaining two semantic models indefinitely
- Most existing Inform 7 code will work as-is; the cases that break are precisely the
  ones where legacy semantics were underspecified or surprising
- A clean, uniform type system is more valuable to the ecosystem than byte-for-byte
  legacy fidelity

---

## D8 — Error model: fail-safe with provenance

**Status:** decided
**Date:** 2026-03-20
**SPEC refs:** §5 (rule system), §5.2 (provenance), §11.2 (FFI), §4.2 (similarity)
**Issue refs:** C.1

**Context:**
The SPEC never defines what happens when things go wrong. Issue C.1 flagged this as
blocking: FFI call failures, empty similarity queries, reactive rule cycles, and
non-exhaustive pattern matches all need defined behavior. Without an error model,
implementors must guess and authors cannot reason about failure.

**Decision:**
Chord's error model follows the platform's fail-safe philosophy with full provenance:

1. **Rule outcomes:** Preserve Inform 7's three-outcome semantics — succeed, fail, or
   no decision. The six-phase cascade (before → instead → check → carry out → after →
   report) processes outcomes as specified in §5.1.

2. **FFI failures:** A failed FFI call returns an absent (optional) value, never
   crashes the story. The failure is logged with provenance (calling rule, source
   location, error detail) for tooling to surface.

3. **Empty similarity queries:** Return an empty list. Rules that iterate over
   similarity results simply produce no matches — consistent with the fail-safe
   pattern.

4. **Reactive rule cycles:** The engine breaks after a configurable depth limit
   (default: 20). When the limit is reached, the engine emits a diagnostic that
   traces the cycle using rule provenance (§5.2), naming each rule in the chain.
   The triggering state change is committed; the cycle-breaking halt is not silent.

5. **Sum type exhaustiveness:** Enforced at compile time. A non-exhaustive match is
   a compile error. Accessing an absent optional at runtime produces a clear error
   with source location (§10.4).

**Rationale:**
- Fail-safe is consistent with D5 (open-world semantics) and the platform's
  progressive-disclosure philosophy
- Provenance on every failure enables the REPL (§10.2) and LSP (§10.1) to surface
  actionable diagnostics without requiring authors to add error-handling boilerplate
- Compile-time enforcement for exhaustiveness catches the most dangerous errors early
- The configurable cycle depth limit avoids infinite loops while allowing legitimate
  multi-step reactive chains

---

## D9 — Concurrency: serialized turns, deterministic tick order

**Status:** decided
**Date:** 2026-03-20
**SPEC refs:** §5.4, §6.2, §6.3, §8.4
**Issue refs:** C.5

**Context:**
Three features imply concurrent or interleaved execution — tick-based scheduling
(§6.2), multiplayer (§8.4), and reactive rules (§5.4) — but the SPEC provides no
ordering semantics. Issue C.5 flagged this as blocking: when Alice and Bob both act
on the same tick, who goes first? When a reactive rule fires during another actor's
action, does it resolve immediately or queue?

**Decision:**

1. **Within a turn:** All state changes are serialized. There is no true concurrency
   within the engine — the world model is single-threaded. This holds even in
   multiplayer: the host serializes all player commands before processing.

2. **Tick ordering:** Actors within a tick execute in a deterministic order. The
   default is declaration order (the order in which actors appear in the source text).
   Authors can override: "Alice acts before Bob" inserts an explicit ordering
   constraint. The compiler validates that ordering constraints are acyclic.

3. **Reactive rule timing:** Reactive rules triggered by a state change resolve
   immediately, within the current action's processing, before the next action begins.
   This means a state change in a carry-out phase can trigger a reactive rule that
   modifies state before the after phase runs. Cycle detection (D8, depth limit)
   prevents infinite chains.

4. **Multiplayer command ordering:** Commands from multiple players are collected by
   the host and ordered before processing. The default policy is FIFO (first received,
   first processed). A simultaneous policy (all commands processed as a batch within
   one turn, each seeing the pre-turn state) is supported as an author opt-in.
   The choice is per-story, not per-turn.

**Rationale:**
- Serialized execution eliminates race conditions and makes the world model
  deterministic — critical for save/restore fidelity and debugging
- Declaration-order default is predictable and requires no author configuration for
  simple cases
- Immediate reactive rule resolution matches Inform 7's existing "when" semantics
  and produces the most intuitive behavior for narrative authors
- Two multiplayer policies (FIFO and simultaneous) cover the vast majority of
  interactive fiction use cases without overcomplicating the model

---

## D10 — Save/restore: full-state snapshots via libsql

**Status:** decided
**Date:** 2026-03-20
**SPEC refs:** §3.1, §3.4
**Issue refs:** C.6

**Context:**
Save, restore, and undo are fundamental to interactive fiction. Issue C.6 flagged
that the SPEC mentions the relational store but never specifies how these core
operations work. The choice of libsql (D1) directly enables the implementation.

**Decision:**

1. **Save** = a complete snapshot of the libsql database state. All tables (objects,
   properties, exits, relations, scenes, meta) including journal history are captured.
   The snapshot is a single portable file (libsql's native serialization).

2. **Restore** = replace the current in-memory database state with a saved snapshot.
   The engine reloads all tables from the snapshot file.

3. **Undo** = revert to the state before the most recent turn. The engine maintains
   a single-turn checkpoint (savepoint) that is refreshed at the start of each turn.
   Undo restores this checkpoint and decrements the turn counter.

4. **Vector indices** are derived state — they can be rebuilt from the stored embeddings
   after a restore. They are not part of the snapshot. This keeps snapshots compact
   and avoids serializing index-specific data structures.

5. **Output transcript** is a presentation-layer concern. It is not part of saved state.
   Reader applications that want to preserve transcript history manage it independently.

6. **Multiplayer save/restore** is deferred. The single-player save/restore design
   does not preclude multiplayer extensions (the host could coordinate a save across
   all connected clients), but the protocol is not specified here.

**Rationale:**
- libsql's native serialization produces compact, portable snapshots with no custom
  serialization code
- Single-turn checkpoints provide undo with minimal overhead — a single savepoint per
  turn, no unbounded history
- Excluding vector indices keeps snapshots small; rebuilding is fast for typical story
  sizes (embeddings are already in the database, only the index structure is rebuilt)
- Deferring multiplayer save avoids overspecifying a protocol before multiplayer
  semantics (D9) are battle-tested

