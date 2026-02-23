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
- **Alternatives considered** — what we evaluated and why we passed

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

**Alternatives considered:**
- **SQLite** — proven and ubiquitous, but no native replication story; would
  require a separate solution for multiplayer sync
- **DuckDB** — strong analytical query performance, but oriented toward OLAP
  workloads rather than transactional world-model updates; heavier footprint
- **Custom engine** — maximum flexibility but unjustified engineering cost when
  an existing engine meets all requirements

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

**Alternatives considered:**
- **Explicit mode declarations** ("This story uses tick-based scheduling") — rejected
  because it violates §1.1 and adds authoring friction for the common case
- **Simulated wall clock** (batch-process accumulated firings on next player input) —
  simpler to implement but less immersive; retained as the fallback for constrained
  environments
- **Global scheduling mode** (entire story is either turn-based or tick-based) —
  rejected because per-rule binding is more flexible and naturally composes

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

**Alternatives considered:**
- **Single centralized registry** — simpler to implement, but creates a
  bottleneck and makes private/institutional packages awkward; would require
  retrofitting federation later
- **Peer-to-peer / DHT-based discovery** — decentralized, but adds significant
  complexity and latency for a use case where curated registries serve authors
  better
- **Platform-managed auth with registry tokens** — gives a unified auth
  experience, but pushes access-policy complexity into the platform where it
  doesn't belong

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

**Alternatives considered:**
- **Runtime generation with declared capability** — allow stories to opt into runtime
  embedding via FFI capability declarations; preserves flexibility but weakens the
  no-dependency guarantee to a conditional promise and complicates the runtime
- **Hybrid model** (precomputed + runtime fallback) — use cached embeddings where
  available, call external service only for novel inputs; adds caching complexity
  and still breaks the no-dependency guarantee for edge cases

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

**Alternatives considered:**
- **Built-in text renderer** — provide a reference text-mode frontend within
  Chord; rejected because it blurs the output boundary and creates maintenance
  burden for a concern that belongs to consumers
- **Dual output** (semantic stream + raw text) — emit both formats; rejected
  because it doubles the output contract and the text output would still not
  match Glulx byte-for-byte

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

**Alternatives considered:**
- **Strict: require explicit handling** — compiler requires `is known` guards before
  any condition on an open-world property; maximum safety but raises the floor
  significantly for open-world authors, creates verbose boilerplate, and feels like
  "writing software" rather than "building a world"
- **Pure fail-safe, no diagnostics** — unknown silently doesn't match, no compiler
  feedback at all; simplest model but makes debugging difficult when rules
  unexpectedly don't fire due to unknown values
- **SQL NULL three-valued logic** — propagate unknown through boolean operators
  (NOT unknown = unknown); formally elegant but notoriously confusing even for
  professional programmers, and inappropriate for a narrative authoring medium
