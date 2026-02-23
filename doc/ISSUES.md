# Issues and Gaps in SPEC.md

This document catalogs problems in `SPEC.md` — contradictions, missing specifications,
underspecified features, and unresolved interactions between features. Each item is
framed from the author's perspective: what would a person writing a story or building
a library encounter?

Every issue references the relevant SPEC section(s) and is tagged with priority:
**blocking** (must resolve before implementation), **high** (affects core authoring
experience), **medium** (affects library authors or advanced use), or **deferrable**
(can be resolved post-1.0).

---

## A. Open Questions (5 items)

These are gaps where SPEC.md is silent or hedges. Each needs a concrete answer.

### A.1 — Storage engine commitment (deferrable)

**SPEC refs:** §3.1, §4.4

§3.1 hedges with "such as SQLite" and §4.4 with "such as sqlite-vec." The choice of
storage engine has downstream consequences for journaled properties (§3.4),
save/restore, and vector similarity queries, but it is ultimately an implementation
decision. The SPEC should either commit to a specific engine or define the abstract
capabilities the engine must provide (relational queries, vector indexing, transactional
snapshots, journal storage) so that the choice can be made during implementation without
revising the spec.

### A.2 — How authors select scheduling policies (blocking)

**SPEC refs:** §6.1, §6.2

§6.2 lists four scheduling modes (turn-based, tick-based, event-driven, continuous time)
and says they are "composable," but provides no mechanism for an author to select or
configure them. An author writing a story with NPC agents on a tick schedule and
player interaction on turns has no way to express this.

The SPEC should add a subsection (§6.3 or similar) covering:

- **Story-level default.** How does an author declare the primary scheduling mode?
  In natural language this might be: "This story uses tick-based scheduling."
- **Per-actor overrides.** "Alice acts every third tick." / "The market updates once
  per round."
- **Containment hierarchy.** What is the nesting relationship between turns, ticks,
  events, and continuous-time steps? When a turn contains multiple ticks, what
  determines the tick count?
- **Composability rules.** §6.2 says modes are composable but gives no constraints.
  Can an author mix continuous time and turn-based in the same region? What happens
  at boundaries?

### A.3 — Natural-language syntax for temporal features (high)

**SPEC refs:** §3.4, §6.2

§3.4 introduces journaled properties and §6.2 introduces event scheduling, but neither
provides authoring syntax. An author who wants to say "the previous location of the
player" or "in three turns, the bridge collapses" has no specified way to do so.

The SPEC should define three categories of temporal expression:

- **Scheduling:** "In 3 turns, [event]." / "After 10 seconds, [event]." /
  "Every other tick, [action]."
- **Querying history:** "the previous location of the player" /
  "whether trust has ever been below 3" / "the value of suspicion two turns ago"
- **Journaling configuration:** How does an author opt a property into journaling?
  What is the default retention depth? A natural phrasing might be:
  "The suspicion of a person is a journaled number."

### A.4 — Extension migration path (medium)

**SPEC refs:** §12.1, §9.1, §9.3

§12.1 says existing Inform 7 extensions "compile without modification" but doesn't
define what an extension structurally is in the new system, or how legacy extensions
coexist with the new package system (§9.1). An author who has a library of Inform 7
extensions needs to understand:

- Are legacy extensions treated as implicit single-file packages?
- What happens on name collision between a legacy extension and a package?
- Is there a migration tool or guide for converting extensions to packages?
- Can a package depend on a legacy extension, or vice versa?

### A.5 — Package registry federation (deferrable)

**SPEC refs:** §9.1

§9.1 describes "a package registry" (singular). If the ecosystem grows, authors and
organizations will want private or domain-specific registries. The SPEC should note
whether the registry protocol is designed to allow federation (multiple registries
queried in priority order) even if the initial implementation is a single registry.
This is a design-time decision that's cheap to make now and expensive to retrofit.

---

## B. Internal Contradictions (4 items)

These are places where SPEC.md contradicts itself. Each needs a resolution.

### B.1 — "No runtime dependency" vs. FFI for embeddings (medium)

**SPEC refs:** §4.4, §11.2

§4.4 states that once vectors are stored, there is "no runtime dependency on external
services." But it also says embeddings may be "generated at runtime for dynamic content"
via the FFI (§11.2), which by definition is an external service call.

**Resolution:** Clarify that the no-dependency guarantee applies to *similarity queries*
(lookups against the local vector index), not to *embedding generation* (which may
require external services via FFI). A story that only uses precomputed embeddings has
no runtime dependencies. A story that generates embeddings at runtime depends on
whatever service the FFI calls — and should declare this as a capability (§11.2).

### B.2 — Optional values vs. open-world "unknown" (high)

**SPEC refs:** §2.3, §3.3

§2.3 introduces optional values ("a property may explicitly have no value") and §3.3
introduces open-world properties ("truth value may be unknown"). These overlap
confusingly. Consider: if a person's "loyalty" is unset, is that "no loyalty"
(optional/absent) or "loyalty unknown" (open-world)?

**Resolution:** The SPEC should explicitly distinguish three states:

- **Valued** — the property has a definite value (the normal case).
- **Absent** — the property explicitly has no value. The author has said "X has no Y."
  This is the optional-value feature from §2.3.
- **Unknown** — the truth or value has not been established. The author has not said
  anything about X's Y. This is the open-world feature from §3.3.

In **closed-world** mode (the default): unset = absent. There is no "unknown."
In **open-world** mode: unset = unknown. Absent is still available via explicit statement.
Optionals allow absent in both modes.

The natural language surface needs examples for each:
- "The loyalty of Bob is 5." → valued
- "Bob has no loyalty." → absent
- (nothing said about Bob's loyalty, open-world) → unknown
- "whether the loyalty of Bob is known" → tests for unknown

### B.3 — Backward compatibility vs. enhanced type system (high)

**SPEC refs:** §12.1, §2.3

§12.1 claims the natural language surface is "a superset of the existing language."
But the new type features from §2.3 (optionals, sum types, parameterized kinds) could
change the semantics of existing code if they affect the Standard Rules. For example,
if a built-in property becomes optional where it wasn't before, existing code that
assumes it always has a value could break.

**Resolution:** The SPEC should add a constraint: when compiling legacy Inform 7 source
texts, the Standard Rules behave exactly as they did in Inform 7 — new type features
do not retroactively apply to legacy kinds or properties. New type features are
available for author-defined kinds, new packages, and Chord-native versions of the
Standard Rules. This might mean shipping two versions of the Standard Rules (legacy-
compatible and Chord-native) or using a compatibility flag.

### B.4 — Semantic output stream vs. behavioral fidelity (high)

**SPEC refs:** §8.1, §12.2

§8.1 says the story emits a "structured semantic stream" of typed output events.
§12.2 requires "identical behavior" to the original Inform 7/Glulx output. But the
original output is raw text, not semantic events. These cannot both be literally true.

**Resolution:** Clarify that "identical behavior" in §12.2 means identical
*player-observable narrative content and state transitions*, not identical bytes.
A compatibility presentation layer renders the semantic stream to plain text that is
indistinguishable from original Glulx output for the same inputs. The semantic stream
is the canonical output; the text rendering is a compatibility view.

---

## C. Missing Specifications (8 items)

These are areas where SPEC.md is silent but shouldn't be.

### C.1 — No error model (blocking)

**SPEC refs:** §5 (rule system), §11.2 (FFI), §4.2 (similarity queries)

The SPEC never says what happens when things go wrong. What does the author see when
an FFI call fails? When a similarity query finds no matches? When reactive rules form
a cycle? When a sum type isn't exhaustively matched?

Needed:

- **Rule outcomes:** Preserve Inform 7's succeed/fail/no-decision semantics.
- **FFI failures:** Return an absent (optional) value, never crash the story.
- **Empty similarity queries:** Return an empty list.
- **Reactive rule cycles:** Break after a configurable depth limit, emit a diagnostic
  that traces the cycle using rule provenance (§5.2).
- **Sum type matching:** Exhaustive matching enforced at compile time. Accessing an
  absent optional at runtime produces a clear error with source location (§10.4).

### C.2 — No resource model (medium)

**SPEC refs:** §3.2, §3.4, §4.4

§3.2 promises tens of thousands of objects. §3.4 adds journaled histories for
properties. §4.4 adds vector embeddings. Together these could consume substantial
memory, but the SPEC says nothing about limits, budgets, or what happens when
resources are exhausted.

Needed:

- Configurable memory budget for the WebAssembly runtime, with a sensible default.
- Journaled properties: configurable retention depth (how many past values to keep).
  Default could be unlimited, but the author needs a way to say "keep only the last
  10 values."
- Vector indices: declared embedding dimensions. Warnings or errors when object count
  × dimension exceeds practical thresholds.
- Clear error behavior when any limit is hit (graceful degradation, not silent
  corruption).

### C.3 — No compilation model (blocking)

**SPEC refs:** §7.2, §10.1

§7.2 says compilation is "direct" and may use "a thin IR" but provides no further
detail. §10.1 promises LSP support with real-time diagnostics and autocomplete.
These are deeply connected — the compiler architecture determines what the LSP can do
and how fast it can respond.

The SPEC should define (or explicitly defer to a separate compiler design document):

- **Compilation phases** at a conceptual level (parsing, name resolution, type
  checking, code generation) — not to prescribe implementation, but to establish
  vocabulary for discussing incremental compilation, error reporting, and LSP
  integration.
- **Incremental compilation granularity.** What is the unit of recompilation — a
  declaration, a section, a file, a package? This directly affects LSP responsiveness.
- **Grammar extensibility.** §9 implies packages can define new natural-language
  patterns. How does this interact with the parser? Can packages extend the grammar,
  and if so, at what phase?

### C.4 — No parser specification (blocking)

**SPEC refs:** §2.1, §2.2, §2.4

The natural language parser is the hardest technical problem in the system, and the
SPEC says almost nothing about it. For an author, parser behavior determines whether
their sentences are understood. For a library author, it determines whether their
new vocabulary integrates cleanly.

Needed:

- **Ambiguity resolution strategy.** When a sentence could be parsed multiple ways,
  what decides? Specificity? Locality (prefer the nearest scope)? Author declaration?
- **NL/structured syntax boundary.** §2.2 says authors can drop into structured syntax
  "without ceremony" but doesn't specify the delimiter. Indentation? Braces? A keyword
  like "formally:"? This affects every author who uses both modes.
- **Package-contributed grammar.** If a rhetoric library defines "X argues that Y,"
  how does the parser learn this pattern? Is it declared in the package? Does it
  require compiler support?
- **Backward compatibility validation.** How is the parser verified against existing
  Inform 7 source texts? A comprehensive test suite of parseable sentences is needed.

### C.5 — No concurrency model (blocking)

**SPEC refs:** §6.2, §8.4, §5.4

Three features imply concurrent or interleaved execution — tick-based scheduling
(§6.2), multiplayer (§8.4), and reactive rules (§5.4) — but the SPEC provides no
ordering semantics. When Alice and Bob both act on the same tick, who goes first?
When a reactive rule fires during another actor's action, does it resolve immediately
or queue?

Needed:

- **Within a turn:** All state changes are serialized (no true concurrency).
- **Tick ordering:** Deterministic order for actors within a tick. Default could be
  declaration order; authors should be able to override ("Alice acts before Bob.").
- **Reactive rule timing:** Reactive rules triggered by a state change resolve
  immediately, within the current action's processing, before the next action begins.
- **Multiplayer ordering:** Commands from multiple players are collected and ordered
  by the host. The SPEC should name at least two policies (sequential/FIFO and
  simultaneous) without mandating one.

### C.6 — No save/restore specification (blocking)

**SPEC refs:** §3.1

Save, restore, and undo are fundamental to interactive fiction. The SPEC mentions the
relational store but never specifies how these core operations work.

Needed:

- **Save** = snapshot of the full world model state (all tables, including journal
  history).
- **Restore** = replace current state with a saved snapshot.
- **Undo** = revert to the state before the most recent turn, using the journal.
- **Vector indices** are derived (recomputable from embeddings), not primary state.
  They may be rebuilt on restore rather than stored.
- **Output transcript** is a presentation-layer concern, not part of saved state.
- **Multiplayer save/restore:** Who can save? Does it require consensus? (May be
  deferred, but the single-player design shouldn't preclude it.)

### C.7 — No FFI security model (high)

**SPEC refs:** §11.2

§11.2 says the FFI is "sandboxed and capability-gated" but provides no details.
Authors and players need to understand: when I run a story that uses an LLM extension,
what can it access? When I install a package that declares FFI capabilities, what am
I granting?

Needed:

- **Named capabilities** with clear scopes (e.g., network access, file system read,
  file system write, LLM inference, hardware sensors).
- **Declaration requirement:** Packages declare required capabilities in their manifest.
  The story's project file grants or denies them.
- **Failure mode:** A denied capability causes the FFI call to return an absent value
  (tying into C.1's error model), not a crash.
- **Player visibility:** When running a story, the player (or host) should be able to
  see what capabilities the story uses and deny any of them.

### C.8 — No progressive disclosure strategy (high)

**SPEC refs:** §1.3

§1.3 states the guiding principle: "expand the ceiling without raising the floor."
But the SPEC introduces substantial new complexity — sum types, reactive rules,
tick-based scheduling, vector similarity, open-world properties, journaled state —
without describing how these features stay invisible to authors who don't need them.

A simple story about a house with a locked door (§1.3's own example) must remain
simple. The SPEC should articulate:

- **Default behavior.** What is active in a new, minimal story? (Presumably: closed-
  world, turn-based, no journaling, no vectors, no FFI.) This should be stated
  explicitly.
- **Opt-in mechanisms.** How does an author activate advanced features? Per-property
  ("suspicion is a journaled number"), per-story ("this story uses open-world
  properties"), or per-package (importing a package activates its features)?
- **Error messages for accidental encounters.** If an author accidentally uses syntax
  from an advanced feature they didn't opt into, the error message should guide them
  rather than confuse them.

---

## D. Feature Interactions (7 items)

These are pairs of features whose interaction isn't specified. Each could produce
surprising behavior if left to implementation discretion.

### D.1 — Reactive rules + temporal state (high)

**SPEC refs:** §5.4, §3.4

When a reactive rule fires ("when trust becomes less than 3"), does the state change
that triggered it get journaled? Do intermediate states during reactive rule resolution
get journaled? If a chain of reactive rules changes trust from 5→2→7→1, the journal
should record all four values with their provenance (which rule caused each change).

The SPEC should confirm: reactive rule mutations are journaled. Journal entries carry
rule provenance metadata (§5.2). Temporal conditions ("whether trust was previously
below 3") may appear in reactive rule triggers because they reference concrete
journaled values, not fuzzy conditions.

### D.2 — Vector similarity + open-world state (medium)

**SPEC refs:** §4.1, §3.3

What embedding does an object get when some of its properties are "unknown"? If a
character's loyalty is unknown (open-world), does the embedding reflect "person with
unknown loyalty" differently from "person with no loyalty" (absent/optional)?

The SPEC should clarify: embeddings are computed from an object's *declared* content.
Unknown values are simply absent from the embedding input. Authors who want "unknown"
to carry semantic weight must model it explicitly (e.g., as a sum type: loyalty is
either "known loyalty" or "unknown loyalty"). Additionally, the SPEC should specify
when embeddings are recomputed — on every property change? Only on explicit request?
On a schedule?

### D.3 — Structured syntax + natural language interop (high)

**SPEC refs:** §2.1, §2.2

The SPEC says authors can use both modes in the same file "without ceremony" but
doesn't specify how names cross the boundary. If an author defines a kind in
structured syntax, can they refer to it in natural language prose? If a natural-language
sentence defines a room, can structured syntax reference it?

The SPEC should confirm: both modes compile to the same underlying representation.
Names defined in either mode are visible in both. The NL surface can refer to
structured-syntax definitions by name, and vice versa.

### D.4 — Package namespacing + rule cascade ordering (high)

**SPEC refs:** §2.4, §5.1, §9.2

When two packages contribute rules to the same rulebook, what determines their order?
The cascade (§5.1) is well-defined for a single author's rules, but the SPEC doesn't
say how package-contributed rules interleave.

The SPEC should define a default ordering: author rules take precedence over package
rules, which take precedence over standard library rules. Among packages, the order
is determined by the project manifest (first-listed = highest priority). Authors can
explicitly reorder rules, extending Inform 7's existing mechanism for rule placement
("the etiquette rule is listed before the personality rule in the social interaction
rules").

### D.5 — Multiplayer + turn model (medium)

**SPEC refs:** §8.4, §6.1

§6.1 says "the turn" is the default scheduling unit. §8.4 says multiple players can
share a world. But "the player" is a singular concept in Inform 7's model. What
happens to "the player" in multiplayer? What about "every turn" rules — do they fire
once per round or once per player-action?

The SPEC should define: "the player" becomes "the current actor" during each player's
action (similar to how Inform 7 handles NPCs acting via "try"). "Every turn" fires
once per round (after all players have acted). A new "every player-turn" fires once
per player-action. Existing Inform 7 stories, being single-player, behave identically.

### D.6 — Embeddability + output protocol (deferrable)

**SPEC refs:** §11.1, §8.1, §8.2

§11.1 says stories are embeddable as libraries. §8.1 says output is a semantic stream.
But the SPEC doesn't define the protocol for an embedding host to consume this stream.
A chatbot framework embedding a Chord story needs to know: how do I send input? How
do I receive output? How do I know when the story is waiting for input?

The SPEC should define: the semantic stream is delivered asynchronously as typed
events. A "prompt" event signals the story is waiting for input. A separate query
channel allows the host to inspect world state (aligned with §10.2's REPL). The
specific serialization format (JSON, protobuf, etc.) may be deferred, but the event
types and lifecycle should be specified.

### D.7 — Standard library extraction + backward compatibility (high)

**SPEC refs:** §9.3, §12.1, §12.2

§9.3 says the Standard Rules should become a package. §12.1 says legacy source texts
compile without modification. But if the Standard Rules are a package, who includes
them? Does the author have to declare a dependency, or is it implicit?

The SPEC should define: the compiler implicitly includes the standard library (just as
Inform 7 implicitly includes the Standard Rules). For legacy compatibility, the
compiler pins to a frozen "legacy" version of the standard library that preserves
Inform 7 semantics exactly. New Chord projects default to the latest version. Authors
can declare a version in their project manifest. This means two editions of the
standard library are maintained: legacy (frozen) and current (evolving).

---

## E. Authoring Surface Gaps (3 items)

These are features the SPEC introduces at the *model* level but never shows at the
*authoring* level. The SPEC's central commitment is that authors write natural language;
these features currently have no natural-language face.

### E.1 — No natural language syntax for new type features (blocking)

**SPEC refs:** §2.3

§2.3 introduces sum types, optional values, parameterized kinds, and first-class rules.
These are powerful model-level features, but the SPEC provides no examples of how an
author would define or use them in natural language. What does a sum type definition
look like? How does an author pattern-match on one?

Examples that need to exist in the SPEC:

- **Sum type definition:** "A response is a kind of value. A response is either an
  agreement carrying a belief or a refusal carrying a reason."
- **Pattern matching:** "If the response is an agreement carrying a familiar belief..."
- **Optional value:** "The hidden motive of a person is an optional text."
- **Testing absence:** "If the hidden motive of Bob is absent..."
- **Parameterized kind:** "A list of beliefs" / "a relation between people and
  arguments" — are these just used in prose, or is there a definition syntax?

Without these examples, the type system is specified at the engine level but
unspecified at the authoring level, which violates §1.1 (the author should feel they
are building a world, not writing software).

### E.2 — Structured syntax has no concrete design (high)

**SPEC refs:** §2.2

§2.2 says structured syntax should be "minimal and declarative in character — closer
to a configuration language or a logic language than to an imperative programming
language." It says it should coexist with natural language "without ceremony." But
it gives no examples of what structured syntax looks like.

This is a major gap because the structured syntax is the escape hatch for every
situation where natural language is insufficient. Its design determines:

- How rules with complex conditions are written.
- How library authors define precise APIs.
- What the NL/structured boundary delimiter is.
- Whether it feels like part of the same system or a foreign intrusion.

At minimum, the SPEC should provide one or two examples of the same rule expressed in
both natural language and structured syntax, showing the interplay.

### E.3 — How do advanced features compose in a real story? (medium)

**SPEC refs:** §13.1

§13.1 aspires to support "rich simulations of conceptual, social, and rhetorical
systems." The SPEC introduces the building blocks (enhanced types, reactive rules,
vector similarity, open-world properties, temporal state) but never shows them working
together.

A single extended example — even a sketch — of how an author would write a story
involving, say, a belief system with journaled trust, reactive rules on belief change,
and vector similarity for finding related beliefs, would ground the entire spec. It
would reveal whether the features compose naturally or create a complexity cliff that
contradicts §1.3.

This doesn't need to be fully specified, but even a page of example source text in the
SPEC would be enormously clarifying.
