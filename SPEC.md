# Chord: A Modernization Spec for the Inform 7 Platform

**Status:** Conceptual  
**Scope:** Architecture, language evolution, tooling, and ecosystem  
**Goal:** Broad source-level compatibility with existing Inform 7 source texts; enhanced type features may require minor updates to legacy code

---

## 0. Derivation

This system is derived from the original Inform 7 architecture, which is licensed under the Artistic License 2.0.
It is a reimagining and modernization of Inform 7, not a fork or extension.
The guiding principles and design decisions are informed by the history of Inform 7, the needs of contemporary authors, and the possibilities enabled by modern technology.

This project will be licensed Apache 2.0, with the intention of fostering an open ecosystem of libraries and tools built on top of the core platform.

---

## 1. Guiding Principles

### 1.1 Preserve the Medium

Inform 7 is not merely a programming language — it is an authoring medium in which describing a world *is* programming it.
Every modernization decision must preserve this property.
The author should always feel that they are building a world, not writing software.

### 1.2 Source Compatibility, Not Machinery

The Chord compiler aims for broad source-level compatibility with Inform 7 source texts: the natural language surface is a superset of the existing language and the world model preserves equivalent state transitions and rule firings.
However, enhanced type features (optionals, sum types, parameterized kinds) apply uniformly and may require minor adaptation of legacy code — full backward compatibility is not guaranteed (see §12.1).
Compatibility is with the *language and world model*, not with the Z-machine, Glulx, Glk, or the Inform 6 intermediate representation.
These are implementation details of a prior era.

### 1.3 Expand the Ceiling Without Raising the Floor

New capabilities should be available to authors who need them without increasing complexity for authors who don't.
A simple story about a house with a locked door should be no harder to write than it is today.

#### 1.3.1 Progressive Disclosure Mechanism

The ceiling/floor principle is enforced through a three-part progressive disclosure pattern that applies uniformly to all features across all phases:

1. **Zero-configuration default.** Every feature has a sensible default that requires no author action. Turn-based scheduling, closed-world properties, no journaling, no embeddings, no tick cycles, no namespacing. A story that uses none of these words operates exactly like a classic Inform 7 story.

2. **Single-keyword opt-in.** Activating a feature requires adding one word or phrase to a declaration: `journaled`, `open-world`, `tick`, `optional`, clock-time phrases. No configuration files, no mode flags, no import statements. The keyword is the complete opt-in.

3. **Graduated diagnostics.** The compiler uses four severity levels to guide authors toward features rather than presenting them as obstacles:
   - **Informational** — what the compiler inferred ("'suspicion' is journaled with unlimited retention").
   - **Suggestion** — an alternative the author might prefer ("did you mean to declare this as journaled?").
   - **Warning** — a potential logic issue ("printing an unknown value produces '[unknown]'").
   - **Error** — a definite mistake ("unknown values cannot participate in arithmetic").

This is a pattern specification, not a feature. It applies universally and is documented here once rather than repeated per feature. The per-feature diagnostics in §3.3.10, §3.4.7, and §6.3.10 are instances of this pattern.

### 1.4 The World Model Is the Source of Truth

All behavior flows from the state of the world and the rules that govern it.
This principle is non-negotiable and should be strengthened, not diluted, by modernization.

---

## 2. The Language

### 2.1 The Natural Language Surface

The English-like syntax remains the primary authoring mode.
It is Inform's most distinctive contribution and the quality that makes it accessible to non-programmers and natural for world-building.

However, the natural language surface should be recognized as exactly that — a surface.
It is one way of expressing declarations and rules, not the only way.

#### 2.1.1 Ambiguity Resolution Strategy

The NL parser uses a deterministic resolution strategy when the natural language surface admits multiple interpretations:

1. **Longest-match principle.** When multiple parse interpretations are possible, the parser selects the longest matching constituent. "The large brass lamp" is one noun phrase, not "the large" followed by "brass lamp." This applies to all phrase-level parsing: noun phrases, condition clauses, temporal expressions.

2. **Specificity ordering.** When multiple rule patterns match the same input, specificity determines which fires first. A rule matching "taking the brass lamp" is more specific than "taking something." This extends the existing rule-cascade specificity (§5.2) to the parser level: the parser prefers the most specific interpretation of ambiguous input.

3. **Structured annotation fallback.** When the compiler cannot resolve ambiguity, it emits a graduated diagnostic (§1.3.1) requesting the author to add a structured annotation (§2.2.1). The annotations serve as the disambiguation mechanism — they are not required for unambiguous input but are always available.

4. **Reserved words.** Phase keywords (`Before`, `Instead of`, `Check`, `Carry out`, `After`, `Report`, `Every turn`, `When play begins`), type keywords (`truth state`, `number`, `text`, `optional`, `journaled`, `open-world`), and scheduling keywords (`tick`, `every N minutes/seconds`) are reserved. They cannot appear as object names without quoting. The quoting mechanism uses the structured syntax: `[name: "Every Turn"]` forces literal interpretation.

5. **Error recovery.** On parse failure, the parser skips to the next sentence boundary (period followed by newline or end-of-file). Skipped text is reported as an error diagnostic with the source location. Parsing resumes at the next sentence.

### 2.2 Structured Syntax Mode

Authors may drop into a structured syntax within any source text for situations where the natural language becomes ambiguous or unwieldy.
The structured mode is not a replacement; it is an escape hatch.

The relationship between the two modes should feel like prose and code coexisting in a literate document.
An author might describe a room in natural language and then express a complex conditional rule in structured syntax, within the same file, without ceremony.

The structured syntax should be minimal and declarative in character — closer to a configuration language or a logic language than to an imperative programming language.

#### 2.2.1 Structured Syntax Grammar

The structured syntax uses a unified grammar based on bracket-delimited annotations:

**Inline annotations.** A single annotation on one line:

    [key: value]
    [key: value, key2: value2]

An inline annotation applies to the immediately following NL sentence. It modifies the compiler's interpretation of that sentence without changing its NL meaning.

**Block annotations.** A multi-sentence structured region:

    [begin structured]
    ... structured content ...
    [end structured]

All sentences within a block annotation are interpreted in structured mode. Block annotations may nest.

**Entry and exit.** The `[` character at the start of a line or after a sentence boundary opens an annotation. The `]` character followed by a newline closes it. Within an annotation, the syntax is `key: value` pairs separated by commas.

**Precedence.** When a structured annotation and the NL phrasing of the following sentence conflict, the annotation wins. The compiler emits an informational diagnostic noting the override.

**Existing annotation patterns.** The scattered annotation examples throughout this specification are instances of this grammar:

- `[open-world: true]` (§3.3.11)
- `[journal: enabled, depth: 10]` (§3.4.6)
- `[schedule: clock, interval: 120s]` (§6.3.9)
- `[unknown-default: 0]` (§3.3.11)
- `[name: "literal string"]` (§2.1.1 reserved word quoting)

All follow the same `[key: value]` grammar and obey the same precedence rules.

### 2.3 Enhanced Type System

The kind system should be extended to support:

- **Sum types (enumerations with associated data).** A "response" might be either an "agreement carrying a belief" or a "refusal carrying a reason."  This allows world model states to be precise without proliferating boolean flags.
- **Optional values.** A property may explicitly have no value (absent).  Combined with open-world properties (§3.3), the type system distinguishes three states — valued, absent, and unknown — giving authors precise control over incomplete information without workarounds.
- **Parameterized kinds.** A "list of beliefs" or a "relation between people and arguments" should be expressible as types, enabling libraries to define generic structures.
- **First-class rules and phrases.** Rules and phrases should be passable as values, enabling higher-order patterns like "apply this evaluation strategy to each belief" without requiring the author to enumerate cases.

The complete type system specification — including concrete declaration syntax, pattern matching, manipulation phrases, storage representation, and compiler behavior — is defined in `doc/TYPES.md`.

### 2.4 Ontological Namespacing

As libraries grow in sophistication, name collisions become inevitable.
The language should support namespaced vocabularies so that a rhetoric library's "claim" and a legal library's "claim" can coexist.
The natural language surface should handle this gracefully — perhaps through contextual disambiguation or author-chosen aliases.

#### 2.4.1 Namespace Declaration

Every package declares its namespace via its header:

    "Social Dynamics" by Jane Author begins here.

The package name becomes the namespace. All kinds, properties, relations, and rules defined within the package belong to this namespace.

#### 2.4.2 Importing Packages

    Include Social Dynamics by Jane Author.

This imports all exported names from the package into the current story's scope. If no collisions exist, imported names are used directly without qualification.

#### 2.4.3 Collision Resolution

When two imported packages define the same name, the compiler emits an error requiring disambiguation. The author resolves collisions using one of two mechanisms:

**Qualified name prefix:**

    The Social Dynamics claim is a kind of thing.
    The Legal Framework claim is a kind of thing.

The package name serves as the disambiguating prefix.

**Alias declaration:**

    Use "argument" to mean the Legal Framework claim.

This creates a local alias. Within the current source, "argument" refers to the Legal Framework's "claim" kind.

**Structured syntax equivalent:**

    [import: Social Dynamics]
    [import: Legal Framework, alias: {claim: legal-claim}]

#### 2.4.4 Collision Precedence Rules

1. Names defined in the current story take precedence over imported names.
2. If two imports define the same name and neither is aliased, the compiler emits an error.
3. Aliases resolve collisions at the source level — they are purely syntactic and carry no runtime cost.
4. A package may re-export names from its own imports, creating transitive visibility.

---

## 3. The World Model

### 3.1 Relational Core

The world model should be understood and implemented as a relational data store.
Objects, properties, and relations already form a de facto relational schema; making this explicit brings substantial benefits in query performance, state inspection, and save/restore mechanics.

An embedded relational engine (such as SQLite) is the suggested backing store.
The author never interacts with it directly — the language surface remains unchanged — but the runtime benefits from indexing, efficient joins across relations, and transactional state updates.

### 3.2 Scale

The current practical limit of a few hundred active objects should be raised to tens of thousands.
This is necessary for simulations involving large conceptual spaces, social networks, or procedurally generated content.
The relational backing store and compiled queries make this feasible.

### 3.3 Open-World Properties

#### 3.3.1 Principle: What the Author Hasn't Said, the World Doesn't Know

By default, the world model remains closed-world: if a fact is not stated, it is false.
However, authors may designate specific properties or relations as open-world, meaning their value may be "unknown" — not yet established by the narrative.
This is essential for modeling epistemic states, incomplete information, and mysteries.

Open-world is an opt-in per property, using natural language.
A story that never uses the word "open-world" operates in pure closed-world mode with zero additional overhead.
This is the floor.
It does not rise.

#### 3.3.2 The Three-State Model

Every property in the world model exists in one of three states:

- **Valued** — the property has a definite value (the normal case).
- **Absent** — the property explicitly has no value. The author has said "X has no Y."
  This is the optional-value feature from §2.3.
- **Unknown** — the truth or value has not been established. The author has not said
  anything about X's Y. This state exists only for open-world properties.

In **closed-world mode** (the default): unset = absent. There is no "unknown."
In **open-world mode**: unset = unknown. Absent is still available via explicit statement.

The distinction matters narratively: "Bob has no loyalty" (absent) is a characterization — the author has established that Bob lacks loyalty. Saying nothing about Bob's loyalty (unknown) means the story has not yet revealed where Bob stands. These are different narrative statements and the system treats them differently.

#### 3.3.3 Declaring Open-World Properties

An author opts a property into open-world semantics by adding "open-world" to its declaration:

    The loyalty of a person is an open-world number.

This single phrase is the complete opt-in.
The compiler activates the three-state model for this property: instances start as unknown unless the author establishes a value.

A property may be both open-world and journaled:

    The loyalty of a person is an open-world journaled number.

Relations may also be open-world:

    The allegiance relation between people is open-world.

#### 3.3.4 Setting and Clearing Values

    The loyalty of Bob is 5.                → valued
    Bob has no loyalty.                     → absent (explicitly removed)
    Now the loyalty of Bob is unknown.      → unknown (explicitly made unknown)
    (nothing said about Carol's loyalty)    → unknown (open-world default)

In closed-world mode, "Now X is unknown" is a compile error — closed-world properties cannot be unknown.

#### 3.3.5 Fail-Safe Semantics: Unknown Never Matches

When a condition in a rule tests an open-world property whose value is unknown, the condition evaluates to "no match" — the rule does not fire for that reason.
No crash, no runtime error.
The rule simply does not apply.

This applies uniformly to all condition types:

- `if the loyalty of Bob is greater than 3` — no match when loyalty is unknown.
- `if the loyalty of Bob is less than 3` — no match when loyalty is unknown.
- `if Bob is loyal` (truth-state) — no match when loyalty is unknown.
- `if Bob is not loyal` — no match when loyalty is unknown.

The last case is important: "not loyal" means "confirmed not loyal," not "not confirmed loyal."
An author who has not established Bob's loyalty has not established its negation either.
Unknown is the absence of knowledge, not the presence of a negation.

**Boolean logic:**
`if X and Y` fails if either is unknown.
`if X or Y` succeeds only if at least one is known-and-true.

**Arithmetic:**
`the loyalty of Bob + 5` when loyalty is unknown is a compile error.
Unknown values cannot participate in arithmetic.
The author must provide a default (see §3.3.7).

**Say phrases:**
Printing an unknown value produces a compiler warning.
If the author proceeds, the output renders as "[unknown]" at runtime.

#### 3.3.6 Testing for Known-ness

Authors can test the known-ness of any open-world property using natural language:

    whether the loyalty of Bob is known
    whether the loyalty of Bob is unknown
    if the loyalty of Bob is known:
    unless the loyalty of Bob is known:

These are truth-state expressions that return true or false — never unknown.
The question "is this known?" always has a definite answer.

The full set of state-testing expressions:

| Expression | True when |
|-----------|-----------|
| `is known` | valued or absent (the author has said *something*) |
| `is unknown` | unknown (the author has said nothing) |
| `is absent` | absent (the author said "has no X") |
| `is present` | valued (has a concrete value, neither absent nor unknown) |

**Pattern for guarded access:**

    if the loyalty of Bob is known:
        if the loyalty of Bob is greater than 3:
            say "Bob is deeply loyal."

#### 3.3.7 Default Values for Unknown

For cases where the author wants a rule to proceed with a substitute value when the real value is unknown, the language provides a default-value phrase:

    let effective-loyalty be the loyalty of Bob (or 0 if unknown);

This assigns 0 when loyalty is unknown and the actual value otherwise.
The parenthetical is the opt-in — without it, the fail-safe rules from §3.3.5 apply.

#### 3.3.8 Suppressing Compiler Suggestions

When the author intends the fail-safe behavior and does not want compiler suggestions about unhandled unknowns, they may annotate:

    if the loyalty of Bob is greater than 3 (even if unknown):
        say "Bob is loyal."

This annotation is documentation: it tells the reader "I know this might be unknown and I want the no-match behavior."
It silences the compiler suggestion for that specific rule without changing semantics.

#### 3.3.9 Reactive Rules and Unknown Transitions

Reactive rules (§5.4) interact with unknown values through transition semantics:

**Unknown → valued (property becomes known):**
"When the loyalty of Bob becomes less than 3" fires if loyalty transitions from unknown to 2.
The condition was not satisfied (unknown is not less than 3) and is now satisfied (2 is less than 3).
The condition has become true.

**Valued → unknown (property becomes unknown):**
"When the loyalty of Bob becomes at least 3" does not fire if loyalty transitions from 2 to unknown.
Unknown is not "at least 3."
The condition has not become true; it has ceased to be evaluable.

**Dedicated transition triggers:**
Authors can react specifically to knowledge transitions:

    When the loyalty of Bob becomes known:
        say "We finally learn where Bob stands."

    When the loyalty of Bob becomes unknown:
        say "Bob's allegiance becomes murky."

These fire on the transition itself, regardless of the value.

#### 3.3.10 Compiler Diagnostics for Open-World Properties

The compiler reports open-world decisions transparently, following the pattern established by journaling diagnostics (§3.4.7) and scheduling diagnostics (§6.3.10):

- **Informational:** "The property 'loyalty' of kind 'person' is open-world. Conditions testing loyalty will evaluate to 'no match' when loyalty is unknown."
- **Suggestion:** "The rule 'if the loyalty of Bob is greater than 3' tests the open-world property 'loyalty,' which may be unknown. If loyalty is unknown, this condition will not match. To handle the unknown case explicitly: 'if the loyalty of Bob is known and the loyalty of Bob is greater than 3.' To suppress this suggestion, add: (even if unknown)."
- **Warning:** "The rule 'say the loyalty of Bob' accesses 'loyalty,' which may be unknown. Printing an unknown value will produce '[unknown]'. Consider testing: 'if the loyalty of Bob is known.'"
- **Error:** "The expression 'the loyalty of Bob + 5' performs arithmetic on 'loyalty,' which is open-world and may be unknown. Unknown values cannot participate in arithmetic. Use: 'let L be the loyalty of Bob (or 0 if unknown)' to provide a default."

#### 3.3.11 Structured Syntax for Open-World Properties

For authors who prefer precision, structured syntax provides explicit annotations:

    [open-world: true]
    The loyalty of a person is a number.

    [unknown-default: 0]
    if the loyalty of Bob is greater than 3:

    [unknown-handling: no-match]
    When the loyalty of Bob becomes less than 3:

These annotations mirror the journaling (§3.4.6) and scheduling (§6.3.9) structured-syntax patterns.
When present, structured annotations override inference.

#### 3.3.12 Integrated Example

    The Safehouse is a room. "A dimly lit apartment. Maps cover the walls."

    The Handler is a person in the Safehouse.
    The Agent is a person in the Safehouse.

    The loyalty of a person is an open-world number.
    The cover story of a person is an open-world text.

    The loyalty of the Handler is 8.
    The cover story of the Handler is "Import/export business."
    [Nothing said about the Agent's loyalty or cover story — both are unknown.]

    Every turn when the loyalty of the Handler is known:
        if the loyalty of the Handler is less than 3:
            say "The Handler glances toward the exit."

    Instead of asking the Agent about "loyalty":
        if the loyalty of the Agent is unknown:
            say "'That's classified,' the Agent says flatly.";
        otherwise:
            say "'My loyalty is [loyalty of the Agent],' the Agent replies."

    When the loyalty of the Agent becomes known:
        say "Something shifts in the room. You know where the Agent stands now."

    Every turn:
        let effective-loyalty be the loyalty of the Agent (or 5 if unknown);
        if effective-loyalty is less than 3:
            say "Tension fills the air."

### 3.4 Temporal State

#### 3.4.1 Principle: The World Remembers What the Author Tells It To

The world model should natively support a concept of history.
Rather than only tracking current state, an author should be able to opt into journaled properties — properties whose past values are accessible.
"The conviction of the suspect was previously uncertain" should be a queryable condition without the author manually maintaining shadow variables.

Journaling follows from §1.1: if describing a world is programming it, then describing a property as having a history is programming the world to remember.
It follows from §1.3: a story that doesn't need history pays no cost for it.
The author opts in per property, using natural language.
The compiler activates the journaling infrastructure only for the properties the author names.

#### 3.4.2 The Default: No Journaling, Zero Configuration

A new Chord story with no journaled declarations operates identically to a classic Inform 7 story:

    The Kitchen is a room.
    The suspicion of a person is a number.
    Bob is a person in the Kitchen. The suspicion of Bob is 3.

    Every turn:
        increase the suspicion of Bob by 1.

This story tracks the current value of suspicion.
No history is stored, no journal table is created, no overhead is incurred.
The word "journaled" never appears.

This is the floor.
It does not rise.

#### 3.4.3 Journaling Configuration

An author opts a property into journaling by adding the word "journaled" to its declaration:

    The suspicion of a person is a journaled number.

This single word is the complete opt-in.
The compiler creates a journal for the property, recording each value change with its turn number and the rule that caused the change (§5.2 rule provenance).

**Retention depth.**
By default, all past values are kept for the lifetime of the story.
An author who wants to limit storage can specify a retention depth:

    The suspicion of a person is a journaled number with depth 10.

This keeps the 10 most recent values.
Older values are discarded silently — the journal is a sliding window, not an archive.

**What is recorded.**
Each journal entry stores:

- The new value of the property.
- The turn number (or tick number, if the change occurs within a tick cycle — see §6.3.4).
- The rule that caused the change (§5.2 provenance metadata).

If a property changes multiple times within a single turn (for example, during a chain of reactive rules — see §5.4), each intermediate value is recorded as a separate journal entry.
This is essential for rule debugging and for temporal conditions in reactive rule triggers (D.1).

**Journaling relations.**
Relations can be journaled in the same way:

    The friendship relation between people is journaled.
    The trust of a person toward a person is a journaled number.

A journaled relation records each change to the relation's extension: additions, removals, and (for valued relations) value changes.

**What can be journaled.**
Any property type may be journaled: numbers, text, truth states, kinds, and custom value types.
Relations (both binary and valued) may also be journaled.
There is no restriction on the type of a journaled property.

#### 3.4.4 History Query Expressions

The compiler recognizes five families of natural-language expressions for querying the journal of a property.
Each family corresponds to a different kind of historical question an author might ask.

**Family 1: Immediate previous.**
Access the value that a property held before its most recent change.

    the previous location of the player
    the previous suspicion of Bob

"Previous" means the value before the current one — the most recent journal entry that differs from the present value.

**Family 2: Offset access.**
Access the value at a specific number of changes or turns in the past.

    the suspicion of Bob 2 turns ago
    the location of the player 3 turns ago

The phrase "N turns ago" retrieves the value the property held N turns before the current turn.
If the property changed multiple times within a turn, the value at the *end* of that turn is returned.

For tick-level granularity (when the story uses tick scheduling, §6.3):

    the suspicion of Bob 5 changes ago

The phrase "N changes ago" retrieves the Nth most recent journal entry, regardless of turn boundaries.

**Family 3: Existential.**
Test whether a condition has ever (or never) been true across the property's entire journal.

    whether trust has ever been below 3
    if the player has ever been in the Kitchen
    whether suspicion has never exceeded 5
    if the mood of Alice has ever been "angry"

These expressions evaluate to a truth state.
"Ever" scans the full journal (within retention depth).
"Never" is the logical complement of "ever."

**Family 4: Aggregate.**
Compute a summary over the journal's history.

    the highest value suspicion has ever reached
    the lowest value trust has ever been
    the number of times the player has visited the Kitchen
    the number of times suspicion has changed

Aggregates scan the journal within retention depth.
Numeric aggregates (highest, lowest) apply only to numeric journaled properties.
The compiler reports an error if an aggregate is used on an incompatible type.

**Family 5: Change detection.**
Test whether a property has changed recently.

    whether the suspicion of Bob has changed
    whether the location of the player has changed this turn
    whether trust has changed since the last turn

"Has changed" (without qualifier) tests whether the current value differs from the previous value.
"Has changed this turn" tests whether any change occurred during the current turn.

**Integrated example.**
These families compose naturally in a story:

    The Interview Room is a room. "Harsh fluorescent light. A metal table."

    The Detective is a person in the Interview Room.
    The Suspect is a person in the Interview Room.

    The trust of a person is a journaled number. The trust of the Suspect is 5.
    The story of a person is a journaled text. The story of the Suspect is "I was home all night."

    Every turn when the trust of the Suspect has changed this turn:
        if trust has ever been below 2:
            say "The Suspect's composure cracks. You've seen this before."

    Instead of asking the Suspect about something:
        if the previous story of the Suspect is not the story of the Suspect:
            say "'That's not what you said before,' the Detective notes.";
        otherwise:
            say "The Suspect repeats the same account."

    After examining the evidence:
        say "Trust has dropped [the number of times trust has changed] times during questioning."

#### 3.4.5 Edge Cases and Interactions

**Beyond retention depth.**
When a history query reaches beyond the journal's retention depth, the result is absent — not an error.
This ties into the optional value system (§2.3): an author can test for absence with "if the suspicion of Bob 100 turns ago is absent."
For existential queries ("has ever been"), only the retained history is searched.
A "has ever been" query on a shallow journal may return false even if the condition was once true but has since been discarded.

**Querying a non-journaled property.**
If an author writes "the previous location of the player" but location is not declared as journaled, the compiler reports an error:
"The phrase 'the previous location of the player' references history, but 'location' is not a journaled property.
To journal it, declare: 'The location of a person is a journaled object.'"

**Reactive rule interaction (D.1).**
When a reactive rule fires and modifies a journaled property, the intermediate value is recorded in the journal.
If a chain of reactive rules changes trust from 5 to 2 to 7 to 1, the journal records all four values, each tagged with the rule that caused the change (§5.2 provenance).
Temporal conditions such as "whether trust was previously below 3" may appear in reactive rule triggers because they reference concrete journaled values, not fuzzy conditions.

**Save and restore (C.6).**
The journal is part of the world model's saved state.
A save operation snapshots the complete journal for all journaled properties.
A restore operation replaces the current journal with the saved version.
No journal entries are lost or fabricated during save/restore.

**Undo.**
Undo reverts the journal to its state at the beginning of the most recent turn.
Any journal entries created during the undone turn are removed.
The undo operation itself does not create journal entries.

**Journaling and open-world properties (§3.3).**
A property may be both journaled and open-world.
"Unknown" is a valid historical value — the journal records it like any other state.
When loyalty transitions from unknown to 2, the journal records the change with "unknown" as the prior state and the rule that caused the establishment as provenance.
An author can query: "whether the loyalty of Bob has ever been unknown."
History queries that reach into a period when the property was unknown return unknown (which is absent per §3.4.5 above — not an error).
This integrates cleanly: "the loyalty of Bob 5 turns ago" returns absent if loyalty was unknown at that time, and the author can test for this with "if the loyalty of Bob 5 turns ago is absent."

#### 3.4.6 Structured Syntax for Journaling and History

For authors who prefer precision, structured syntax provides explicit journaling annotations:

    [journal: enabled, depth: 10]
    The suspicion of a person is a number.

This is equivalent to "The suspicion of a person is a journaled number with depth 10."
The structured annotation overrides any natural-language phrasing when both are present.

For history queries in complex conditions:

    [history: previous]
    let past-suspicion be the suspicion of Bob;

    [history: offset, turns: 2]
    let old-location be the location of the player;

The structured annotations are optional.
They serve disambiguation and documentation, mirroring the role of temporal annotations in §6.3.9.

#### 3.4.7 Compiler Diagnostics for Journaling

The compiler reports journaling decisions transparently:

- **Informational:** "The property 'suspicion' of kind 'person' is journaled with unlimited retention." — emitted during compilation so the author can verify intent.
- **Informational:** "The property 'suspicion' of kind 'person' is journaled with depth 10. Values beyond 10 changes will be discarded."
- **Warning:** "The journaled property 'description' of kind 'thing' is of type text. Large text values may consume significant storage. Consider adding a retention depth."
- **Error:** "The phrase 'the previous suspicion of Bob' references history, but 'suspicion' is not a journaled property. Declare it as: 'The suspicion of a person is a journaled number.'"
- **Error:** "The phrase 'the suspicion of Bob 100 turns ago' uses an offset (100) that always exceeds the declared retention depth (10). This query will always return an absent value."
- **Suggestion:** "The property 'mood' is not journaled, but the story queries 'the previous mood of Alice.' Did you mean to declare: 'The mood of a person is a journaled text'?"

These diagnostics align with §10.1 (LSP integration) and the progressive disclosure strategy (C.8) — errors guide the author toward the journaling feature rather than presenting it as an obstacle.

### 3.5 Feature Composition: Integrated Example

The following story demonstrates how open-world properties, journaling, reactive rules, and scheduling compose within a single source text. Each feature is activated by its opt-in keyword; the compiler infers the required infrastructure.

    The Embassy is a room. "A high-ceilinged reception hall. Crystal chandeliers cast refracted light."
    The Ambassador is a person in the Embassy.
    The Spy is a person in the Embassy.

    [Open-world + journaled properties: both keywords compose naturally.]
    The loyalty of a person is an open-world journaled number.
    The cover story of a person is an open-world journaled text.

    [The Ambassador's loyalty is known; the Spy's is unknown.]
    The loyalty of the Ambassador is 7.
    The cover story of the Ambassador is "Cultural attache."

    [Reactive rule: fires on knowledge transition (§5.4 + §3.3.9).]
    When the loyalty of the Spy becomes known:
        say "The room shifts. You now know where the Spy stands."

    [Reactive rule with journaling: uses temporal query in condition.]
    When the loyalty of the Ambassador becomes less than 3:
        if the loyalty of the Ambassador has ever been greater than 6:
            say "The Ambassador's loyalties have reversed completely."

    [Clock-scheduled rule: real-time tension (§6.3).]
    Every 30 seconds the chandelier flickers ominously.

    [Turn-based rule with open-world guard.]
    Every turn when the loyalty of the Spy is unknown:
        say "'I have nothing to declare,' the Spy says."

    [Turn-based rule with journaling query.]
    Every turn when the cover story of the Ambassador has changed this turn:
        say "You notice the Ambassador's story has shifted."

    [Tick-scheduled NPC behavior.]
    The Guard is a person in the Embassy.
    The Guard acts every tick.
    Every tick when the Guard is in the Embassy:
        if a random chance of 1 in 4 succeeds:
            say "The Guard scans the room."

This story activates four scheduling layers (turn, clock, tick, event queue), two property modifiers (open-world, journaled), and reactive rules — all through single-keyword opt-ins with zero configuration.

---

## 4. Vector Similarity as a Query Layer

### 4.1 Embeddings Are an Index, Not a Property

Objects in the world model may optionally carry vector embeddings — dense numeric representations derived from their descriptions, ontological positions, or other semantic content.
These embeddings are not properties in the world model sense. They do not participate in rule matching, cannot be tested in conditions, and do not appear in the object's state.
They are a query index over the world model, not part of it.

The world model remains fully discrete and decidable.
Embeddings provide a way of *finding* objects, not *defining* their behavior.

### 4.2 Similarity Queries Return Discrete Objects

The system provides phrases for querying by vector similarity — such as finding the N objects most similar to a given object or to an author-provided reference point.
The result is always a definite, ordered list of concrete world model objects.
Once returned, these objects participate in the rule system exactly like any other objects — through their kinds, properties, and relations.

This preserves the author's ability to reason about what happened and why.
The vector space selected the candidates; the discrete rule cascade determined the consequences.

#### 4.2.1 Attaching Embeddings

Embeddings are attached to objects at compile time using a description string:

    The brass lamp has an embedding from "old brass oil lamp, tarnished, warm light".

Or via structured annotation:

    [embedding: "old brass oil lamp, tarnished, warm light"]
    The brass lamp is a thing in the Dark Cave.

The compiler generates a vector from the description string using a configurable embedding provider (via the FFI at compile time, per D4 in `doc/ARCH.md`). The resulting vector is baked into the compiled artifact and stored in the sqlite-vec index alongside the world model.

**Implicit embeddings.** If no explicit embedding is provided and the object has a description property, the compiler may optionally generate an embedding from the description. This is controlled by a project-level setting: `[auto-embed: descriptions]`. By default, auto-embedding is off.

**Runtime-created objects.** Objects created at runtime cannot have embeddings (per D4: compile-time only). Authors who need similarity queries over dynamic objects should pre-embed a pool of template objects and assign them at runtime.

#### 4.2.2 Similarity Query Syntax

**Natural language form:**

    Let nearby-concepts be the 5 things most similar to the current-topic.

The pattern is: `the N [kind] most similar to [reference]`.

- `N` — a positive integer specifying the number of results.
- `[kind]` — the kind to search within (e.g., `things`, `beliefs`, `concepts`). The query only considers objects of this kind that have embeddings.
- `[reference]` — a world model object with an embedding, or a text literal (compiled to a vector at compile time).

**Text-based query:**

    Let related-items be the 3 things most similar to "ancient treasure".

When the reference is a text literal, the compiler generates an embedding from the text at compile time.

**Structured syntax:**

    [similarity: {kind: thing, reference: current-topic, limit: 5}]
    let nearby-concepts be the similar results;

#### 4.2.3 Using Query Results

The result is a `list of [kind]` (§2.3, `doc/TYPES.md` §3). It can be iterated, tested, and used in rule conditions like any other list:

    Let nearby-concepts be the 5 beliefs most similar to the new-evidence.
    Repeat with B running through nearby-concepts:
        say "[B] is relevant to this evidence."
        if B is a conviction:
            say "This belief is firmly held."

### 4.3 No Fuzzy Conditions

Vector similarity must never appear as a condition in a rule.
"Instead of examining something semantically near grief" is not a well-defined rule and cannot be debugged or reasoned about.
The natural threshold problem — where "related" shades into "unrelated" on a continuum — is irreconcilable with the rule system's requirement for crisp pattern matching.

If an author needs similarity-sensitive behavior, the pattern is: query for similar objects first, assign them to a concrete variable or list, then write rules against those concrete values.

### 4.4 Embedding Computation

The embeddings themselves may originate from an external source — a language model, a pretrained encoder, or an author-provided table of vectors.
This is a natural use of the foreign function interface described in Section 11.2.
However, once computed, the vectors are stored locally alongside the world model in an embedded vector index (such as sqlite-vec) with no runtime dependency on external services.

Embeddings are generated at design time or compile time, not at runtime.
Static content is embedded during compilation; authors working with large or evolving concept spaces may regenerate embeddings during the design cycle using external tools via the FFI (§11.2).
The resulting vectors are baked into the compiled artifact, preserving the no-runtime-dependency guarantee.

### 4.5 Use Case: Navigating Large Conceptual Spaces

The primary motivation is intellectual simulation at scale.
A world model containing hundreds of beliefs, concepts, or arguments becomes difficult to navigate through explicit enumeration alone.
Vector similarity allows the system to find the most conceptually adjacent beliefs in an NPC's mind when the player introduces a new idea, or to locate the arguments most relevant to a given claim, without the author hand-coding every possible adjacency.

The embeddings make the world model *searchable* in ways that discrete relations cannot — while the discrete relations and rules remain the sole authority on what happens with the results.

---

## 5. The Rule System

### 5.1 Preserve the Cascade

The existing action-processing cascade (before → instead → check → carry out → after → report) is well-understood and expressive.
It should be preserved exactly for backward compatibility and because it is genuinely good design.

### 5.2 Rule Provenance and Debugging

Every rule should carry metadata: its source location, the library or extension it came from, its specificity score, and its position in the rulebook.
This metadata should be inspectable at runtime and in tooling, making it possible to answer "why did this happen" by tracing which rules fired and in what order.

### 5.3 Compositional Rulebooks

Authors and library designers should be able to compose rulebooks — defining a new rulebook that consults several others in a specified order.
This supports the layered library model where a "social interaction" rulebook might consult "etiquette rules," then "relationship rules," then "personality rules."

#### 5.3.1 Consultation Order Syntax

**Natural language form:**

    The social-interaction rules consult the etiquette rules, then the relationship rules, then the personality rules.

The pattern is: `The [composite-rulebook] consults [rulebook₁], then [rulebook₂], ...`

**Semantics.** Consultation is sequential. The composite rulebook processes each sub-rulebook in the declared order. Within each sub-rulebook, normal specificity ordering applies (§5.2). If a sub-rulebook produces a `stop` outcome (a rule in that book succeeds with `stop the action` or `rule succeeds`), later sub-rulebooks are not consulted.

#### 5.3.2 Fall-Through Control

By default, a `stop` outcome in any consulted rulebook halts the composite. Authors may override this with a fall-through annotation:

    The social-interaction rules consult the etiquette rules (with fall-through), then the relationship rules.

With `(with fall-through)`, even if the etiquette rules produce a `stop`, processing continues to the relationship rules. The `stop` outcome is recorded but does not halt consultation.

**Structured syntax:**

    [rulebook: social-interaction, consults: [etiquette, relationship, personality], fall-through: [etiquette]]

The `fall-through` key lists the sub-rulebooks that should not halt the composite on `stop`.

#### 5.3.3 Composite Priority

When a composite rulebook is itself part of a larger cascade (e.g., the `before` phase of an action), it occupies a single priority slot. The composite's priority is the highest priority among its constituent rulebooks. This ensures predictable ordering when composites and non-composite rules coexist in the same phase.

### 5.4 Reactive Rules

In addition to the per-turn and per-action rules, the system should support reactive rules that trigger on state change: "when the trust between Alice and Bob becomes less than 3."
This eliminates the pattern of polling for conditions in every-turn rules and makes event-driven simulation natural.

**Reactive rules and open-world properties (§3.3).**
When a reactive rule's trigger condition involves an open-world property, the transition semantics follow the fail-safe model:

- **`becomes [condition]`** fires when the condition transitions from not-satisfied (including unknown) to satisfied.
  Example: "when loyalty becomes less than 3" fires if loyalty transitions from unknown to 2.
- **`stops being [condition]`** fires when the condition transitions from satisfied to not-satisfied (including unknown).
  Example: "when loyalty stops being less than 3" fires if loyalty transitions from 2 to unknown.
- **`becomes known`** and **`becomes unknown`** are dedicated triggers for knowledge transitions:
  "When the loyalty of Bob becomes known" fires when loyalty transitions from unknown to any definite value.
  "When the loyalty of Bob becomes unknown" fires when loyalty is explicitly made unknown.
- **Unknown → unknown:** No reactive rule fires.
  Nothing has changed.

---

## 6. Time and Scheduling

### 6.1 The Turn as Default

The classic turn-based cycle remains the default and the expected mode for traditional interactive fiction.
Nothing changes for stories that are happy with it.

### 6.2 Alternative Scheduling Policies

The turn is reframed as one scheduling policy among several.
The system should also support:

- **Tick-based simulation.** Multiple actors or processes take steps in a defined order within a single turn, enabling simultaneous action and parallel narrative.
- **Event-driven mode.** The simulation advances by processing a queue of events rather than a fixed cycle.  Events can be scheduled for future times, enabling delayed consequences and timed narrative beats.
- **Continuous time.** For simulations that need it, a real-valued clock that advances in configurable increments.  This is an opt-in departure from the discrete model.

These modes should be composable.
A story might use turn-based interaction for the player while running NPC behavior on a tick-based schedule.

### 6.3 Scheduling Inference and Composition

#### 6.3.1 Principle: The Author Describes Timing; the Compiler Infers the Mechanism

Authors never declare a scheduling mode.
Instead, they write rules that describe *when* things happen, using natural temporal language.
The compiler analyzes these temporal expressions and activates the minimum scheduling infrastructure required to honor them.

A story that contains no temporal expressions beyond Inform 7's existing "every turn" runs in pure turn-based mode with zero additional overhead.
A story that contains the sentence "every 2 minutes the speaker squawks" causes the compiler to activate a wall-clock layer for that rule, while everything else remains turn-based.

This follows from §1.1: if describing a world is programming it, then describing *when something happens* is programming the schedule.
No meta-language is needed.

#### 6.3.2 The Default: Turn-Based, Zero Configuration

A new Chord story with no temporal expressions operates identically to a classic Inform 7 story:

    The Kitchen is a room.
    The toaster is in the Kitchen.

    Every turn:
        if the toaster is switched on, say "The toaster hums quietly."

This story is purely turn-based.
The compiler emits no clock, no tick scheduler, no event queue.
The "every turn" phrasing is the existing Inform 7 construct and requires no new infrastructure.

This is the floor.
It does not rise.

#### 6.3.3 Temporal Phrases and Scheduling Triggers

The compiler recognizes four families of temporal expression in rule headers and scheduled-event declarations.
Each family triggers a specific scheduling capability.

**Family 1: Turn-relative.**
These use the existing turn as their time unit.
No scheduling inference is needed.

    Every turn: ...
    After taking the lamp for the third time: ...
    In 3 turns from now, the bridge collapses.

**Family 2: Clock-relative.**
These reference real-world durations.
The compiler activates a real-time wall clock that runs alongside the turn loop.

    Every 2 minutes the speaker squawks.
    After 30 seconds of idleness, the lights flicker.
    In 10 seconds, the bomb detonates.
    Every 5 seconds the clock face updates.

Recognized duration units: `seconds`, `minutes`, `hours` (and their singular forms).

**Family 3: Tick-relative.**
These reference a discrete sub-turn step, used when multiple actors or processes should advance in a defined order within a single turn.

    Alice acts every tick.
    The market updates every third tick.
    Every other tick, the guard patrols.

The word "tick" is the trigger.
Its presence in any rule causes the compiler to activate the tick scheduler for that turn phase.

**Family 4: Event-driven.**
These schedule actions in response to state thresholds or named conditions, leveraging the reactive rule system from §5.4.

    When the trust between Alice and Bob becomes less than 3, Alice leaves.
    When the water level reaches 10, the dam breaks.
    Whenever the player enters a dark room, the narrator whispers.

The triggers "when [condition] becomes," "when [property] reaches," and "whenever" cause the compiler to register event-queue watchers.
These are closely related to reactive rules (§5.4) but are distinguished by their scheduling semantics: they fire at the scheduling layer, not as inline rule-cascade interruptions.

#### 6.3.4 The Scheduling Hierarchy

When a story's rules trigger multiple scheduling families, they coexist in a defined hierarchy.
The hierarchy is not a nesting of modes but a layering of time sources that the engine interleaves:

    Outermost:   WALL CLOCK  (continuous, real-valued, measured in seconds)
        |
        v
    Middle:      TURN LOOP   (discrete, player-driven, the default pulse)
        |
        v
    Innermost:   TICK CYCLE  (discrete, sub-turn steps, runs within a turn)
        |
        v
    Throughout:  EVENT QUEUE  (reactive, fires when conditions are met at any layer)

**Interleaving rules:**

1. **The turn loop is the heartbeat.**
   It advances when the player acts (or, in multiplayer, when all players in a round have acted — see D.5).

2. **The wall clock runs in real time.**
   Clock-scheduled rules fire at their specified intervals via the host environment's event loop, independent of player input.
   If the player is idle for six minutes and a rule fires every two minutes, the player sees three outputs at the actual two-minute marks — not batched on next input.
   The semantic output stream (§8.1) delivers clock-rule output asynchronously to the presentation layer.

3. **Tick cycles run within a turn.**
   When tick-based rules exist, each turn contains one or more tick cycles.
   The number of ticks per turn is either:
   - Determined by the rules themselves (e.g., "Alice acts every tick" implies at least one tick per turn), defaulting to one tick per turn unless the author specifies otherwise.
   - Explicitly set: "Each turn contains 5 ticks."

4. **The event queue is checked after every state change**, at every layer.
   A state change during a tick can trigger an event-driven rule immediately (within that tick's processing), following the reactive rule resolution order from C.5.

#### 6.3.5 The Wall Clock: Real-Time Execution

Clock-scheduled rules fire in actual real time via the host environment's event loop (`requestAnimationFrame`, `setInterval`, or equivalent).
Output appears even while the player is idle.
"Every 2 minutes the speaker squawks" produces output at two-minute intervals regardless of player input.

**Design implications:**

- The engine maintains a background timer managed by the host environment.
- The semantic output stream (§8.1) delivers clock-rule output asynchronously to the presentation layer.
  The frontend is responsible for rendering these outputs as they arrive.
- **Save/restore** must snapshot the clock state: current time, pending timers, and the last-fire timestamp for each clock-scheduled rule.
  On restore, the clock resumes from the saved state.
- **Pause/resume:** the clock pauses when the story is suspended (tab hidden, save menu open, host signals pause) and resumes on return.
  Paused time does not count toward intervals.
- **Multiplayer (D.5):** clock rules execute authoritatively on the server.
  Clients receive output via the semantic stream.

**Fallback for constrained environments:**
In environments that cannot support background execution (pure terminal, batch testing, headless CI), the engine degrades gracefully to batch-on-input mode — on the player's next input, the engine calculates elapsed time and fires all due clock rules in chronological order.
Authors can force this mode with the structured annotation `[clock-mode: simulated]`.
The compiler logs an informational diagnostic when fallback mode is active.

**Continuous time (§6.2)** is a further opt-in beyond clock-scheduled rules.
It provides a real-valued clock advancing in configurable increments for physics-style simulation, rather than discrete timer firings.
Because background execution with continuous-time semantics has significant architectural implications (resource usage, host capabilities, multiplayer synchronization), it requires an explicit declaration: `[continuous-time: enabled]` or the natural-language statement "This story runs in continuous time."
This is the one case where an explicit mode declaration is required.

#### 6.3.6 Per-Rule Temporal Binding

Every temporal expression binds to the specific rule it appears in.
There is no global mode switch.
This means a single story can contain:

    The Jungle is a room. "Dense foliage surrounds you."

    The parrot is an animal in the Jungle.
    The river is a backdrop in the Jungle.

    Every turn:
        if the player is in the Jungle, say "Insects buzz around your head."

    Every 2 minutes the parrot squawks loudly.

    Every 5 seconds the river murmurs softly.

    The guide is a person in the Jungle.
    The guide acts every tick.
    Every tick when the guide is in the Jungle:
        if the player is in the Jungle, try the guide examining a random thing
        in the Jungle.

In this example, the compiler infers:

- The "insects buzz" rule: **turn-based**, no special scheduling.
- The "parrot squawks" rule: **wall-clock**, 120-second interval.
- The "river murmurs" rule: **wall-clock**, 5-second interval.
- The "guide examines" rule: **tick-based**, every tick within a turn.

Each rule carries its temporal binding as metadata (extending §5.2 rule provenance).
The engine knows exactly which scheduling layer drives each rule.

#### 6.3.7 Per-Actor Scheduling

When a temporal expression references a specific actor, the scheduling binds to that actor:

    Alice acts every tick.
    Bob acts every third tick.
    The market updates once per turn.
    Every 10 minutes, the weather changes.

This creates per-actor schedules without requiring the author to declare a global mode.
Alice and Bob are tick-scheduled (the compiler activates ticks because they reference ticks).
The market is turn-scheduled (the default).
The weather is clock-scheduled.

Actor ordering within a tick follows the deterministic ordering specified in C.5: declaration order by default, overridable by the author:

    Alice acts before Bob.

#### 6.3.8 Composability Constraints

Not all combinations are meaningful.
The compiler enforces these constraints and reports clear diagnostics when they are violated:

1. **Turn + wall-clock: always valid.**
   This is the expected common case.
   Clock rules fire in real time; turn rules fire when the player acts.

2. **Turn + tick: always valid.**
   Ticks subdivide turns.
   This is the model described in §6.2.

3. **Wall-clock + tick: valid, with caveat.**
   Tick-based rules run within turns.
   Clock rules fire independently in real time.
   If a clock rule and a tick rule both modify the same state, the standard rule-cascade conflict resolution applies.

4. **Conflicting intervals on the same rule: compile error.**
   "Every 2 minutes and every tick, Alice dances" is contradictory.
   The compiler reports: "A rule cannot be both clock-scheduled and tick-scheduled. Split this into two rules."

5. **Clock intervals shorter than one second: warning.**
   If an author writes "every 0.1 seconds the light blinks," the compiler warns that sub-second wall-clock scheduling may produce high-frequency output, and suggests considering tick-based scheduling instead.

#### 6.3.9 Temporal Expressions in Structured Syntax

For authors who prefer precision or whose temporal requirements are complex, structured syntax provides explicit temporal binding:

    [schedule: clock, interval: 120s]
    Every 2 minutes the parrot squawks.

    [schedule: tick, frequency: 3]
    Bob acts every third tick.

    [schedule: turn]
    Every turn the market updates.

The structured annotations are optional.
They serve two purposes:

- **Disambiguation.**
  If the compiler cannot confidently infer the scheduling intent, it requests clarification via a diagnostic, and the author can add a structured annotation.
- **Documentation.**
  An author reviewing complex scheduling logic can add annotations for clarity without changing behavior.

When present, structured annotations override inference.
If the natural-language phrasing and the annotation disagree, the annotation wins and the compiler emits an informational note.

#### 6.3.10 Compiler Diagnostics for Scheduling

The compiler reports scheduling decisions transparently:

- **Informational:** "The rule 'every 2 minutes the parrot squawks' activates wall-clock scheduling with a 120-second interval." — emitted during compilation so the author can verify intent.
- **Warning:** "The rule 'every 0.5 seconds the light blinks' uses a very short clock interval. This may produce high-frequency output. Consider using tick-based scheduling instead."
- **Error:** "The rule 'every 2 minutes and every tick, Alice dances' has conflicting temporal bindings. A rule can be bound to at most one scheduling layer."
- **Suggestion (on ambiguity):** "The phrase 'every moment, the fire crackles' is ambiguous — does 'moment' mean every turn, every tick, or a clock interval? Please clarify, for example: 'every turn, the fire crackles' or add a structured annotation."

These diagnostics align with §10.1 (LSP integration) and C.8 (progressive disclosure — errors guide rather than confuse).

---

## 7. The Compilation Target

### 7.1 Compilation Targets

**Current target: TypeScript / Node.js.** The Phase 0 implementation compiles Chord source to TypeScript that runs on Node.js with libsql for the world model. This is the shipping target today.

**Future target: WebAssembly.** A Wasm compilation target is a design goal that would provide:
- Browser-native execution with no plugins or interpreters required
- Near-native performance on all platforms
- A well-defined sandboxed execution model
- Access to the broader WebAssembly ecosystem and tooling

The Wasm target is not yet implemented. Resource constraints in §7.4 are specified as design intent for that future phase.

### 7.2 Direct Compilation

The two-stage pipeline through Inform 6 is eliminated.
The Chord compiler produces WebAssembly directly (or through a thin IR purpose-built for the system).
This removes an entire class of legacy constraints and simplifies the toolchain.

### 7.3 Native Numeric Types

The compilation target should support both integer and floating-point arithmetic.
Authors should not have to think about this for typical use, but libraries modeling continuous quantities, probabilities, or spatial reasoning should have access to real-valued computation.

### 7.4 Resource Constraints

Resource limits are target-dependent. The TypeScript/Node.js target (the current implementation) operates within the host runtime's memory management and has no Chord-specific resource model. The following constraints apply when a WebAssembly compilation target is implemented:

- **Memory budget.** Each story instance has a configurable maximum Wasm linear memory allocation. Default: 64 MB. The host application may override this via instantiation options. Exceeding the budget triggers a runtime error event via the semantic output stream (§8.1).

- **Vector dimension threshold.** Embeddings stored in the sqlite-vec index are limited to 2048 dimensions per vector by default. Higher dimensions require explicit opt-in: `[embedding-dimensions: N]` in the project configuration. This prevents accidental storage bloat from high-dimensional embedding models.

- **Turn time budget.** A configurable maximum execution time per turn. Default: 5 seconds. If a turn exceeds this limit, the engine halts execution, reverts to the savepoint (preserving world state integrity), and emits a timeout error event via the semantic output stream. The host may adjust this limit for stories with complex rule cascades.

These constraints are intentionally deferred from the TypeScript/Node.js implementation phase. Specifying Wasm resource limits before the Wasm target exists would be premature. The constraints documented here serve as design intent for the Wasm compilation phase.

---

## 8. The I/O Architecture

### 8.1 Semantic Output

The story does not emit raw text.
It emits a structured semantic stream — a sequence of typed output events such as "room description," "object listing," "dialogue line," "narrative passage," "prompt."
Each event carries structured data about its content and context.

The presentation layer interprets this stream and renders it.
A text-mode frontend renders it as traditional IF.
A graphical frontend renders it with images, layout, typography, and/or speech.
The story does not need to know which frontend is in use.

### 8.2 The Presentation Layer

Frontends are separate applications (or libraries) that consume the semantic output stream and produce a user experience.
Chord does not include or specify a default frontend — it produces the semantic stream and the presentation layer is entirely the reader/player application's responsibility.

A text-mode reader renders the stream as traditional IF.
A graphical reader renders it with images, layout, typography, and/or speech.
A compatibility-focused reader may approximate legacy Glulx text output.
None of these are part of Chord itself.

The protocol between story and frontend should be documented and stable, enabling third-party readers.

### 8.3 Input Abstraction

Player input should similarly be abstracted.
The parser receives structured input events rather than raw text strings.
A typing interface sends text commands.
A graphical interface might send commands from click events on objects.
A voice interface transcribes and sends commands.
The parser normalizes all of these into actions.

### 8.4 Multiplayer and Observer Modes

Because the I/O is a structured protocol rather than a text stream, multiple clients can connect to a single running story.
Players can share a world (with rules governing concurrent actions) or observers can watch a story unfold.
This is not a primary use case but should be architecturally possible rather than precluded.

#### 8.4.1 Connection Model

The host application opens a story instance. Clients connect via the semantic output stream protocol (§8.1) and structured input event format (§8.3). Each client is assigned a player entity in the world model — a thing of kind `person` (or a subkind) that serves as that player's actor for the rule cascade.

Client input events are tagged with the player entity ID. The engine routes each action to the correct actor.

#### 8.4.2 Turn Resolution Policies

The story author selects a turn resolution policy. Two policies are defined:

**FIFO mode (default).** Commands are processed in the order they are received by the host. Each command constitutes a full turn for that player. Other players' commands queue behind it. This is the simplest model and is appropriate for asynchronous or play-by-post scenarios.

**Simultaneous mode.** All player commands are collected within a configurable time window (set by the host). When the window closes, commands are processed as a batch. Each player's command is evaluated against the pre-batch world state for condition testing. State changes are applied in declaration order of players (the order in which player entities appear in the source text). This models simultaneous action for real-time or round-based multiplayer.

The policy is declared in the source text:

    This story uses simultaneous turns.

Or via structured annotation:

    [multiplayer: simultaneous, window: 30s]

The default (no declaration) is FIFO.

#### 8.4.3 Observer Mode

Observer clients receive the semantic output stream but cannot send input events. An observer sees all players' outputs. The host application may filter the stream per observer based on visibility rules (e.g., an observer might only see public events, not a specific player's internal monologue). Filtering is the host's responsibility, not Chord's.

#### 8.4.4 Scope Boundary

Multiplayer networking, transport protocol, discovery, and authentication are host-application concerns, not Chord concerns. Chord provides:

- Turn-serialization semantics (FIFO or simultaneous)
- Per-player actor routing via the structured I/O protocol
- Observer stream output

Everything else — WebSocket transport, matchmaking, authentication, latency compensation — is the host's responsibility. This boundary ensures Chord remains embeddable in diverse hosting environments without coupling to any specific networking stack.

---

## 9. The Extension and Library Ecosystem

### 9.1 Package Registries

Extensions are distributed through package registries — URL-identified services that host, version, and serve packages.
Authors declare which registries to query, and in what order, within their project configuration.
The tooling queries each registry in priority order, resolves dependency graphs across all sources, detects conflicts, and manages updates.

Any organization or individual can host a registry.
Authentication and access control are the responsibility of each registry provider, not the platform.
A default public registry serves the open ecosystem; authors may add private, institutional, or domain-specific registries alongside or instead of it.

### 9.2 Namespaced Packages

Each package occupies its own namespace.
When two packages define a kind or property with the same name, the system requires the author to disambiguate, either through explicit namespace prefixes or by declaring an alias.

### 9.3 Standard Library Extraction

Much of Inform 7's built-in behavior — the Standard Rules — should be refactored into a standard library distributed as a package.
This makes it possible to update, override, or replace standard behavior without modifying the compiler, and it gives library authors a model to follow.

### 9.4 Testing and Specification

Packages should support inline test cases — short scenarios with expected outcomes.
The tooling runs these as part of a package's build and validation process.
This is essential for library reliability as the ecosystem grows.

---

## 10. Tooling

### 10.1 Language Server Protocol

The compiler should expose an LSP server, enabling real-time diagnostics, autocomplete, go-to-definition, and hover documentation in any editor.
The dedicated IDE remains available but is no longer the only option.

### 10.2 REPL and Interactive Inspector

An interactive mode should allow authors to load a story, advance to a specific state, and then query the world model, test rule application, and inspect objects — without playing through the story manually.
Think of it as a debugger for the world rather than for code.

### 10.3 World State Visualization

Tooling should be able to render the world model as a graph — objects, containment, relations, property values — at any point in the simulation.
Rule firing should be visualizable as a trace: which rules were consulted, which matched, which fired, and what state changes resulted.

### 10.4 Source Mapping and Provenance

All compiled output should be source-mapped back to the original natural-language or structured-syntax source.
When something unexpected happens at runtime, the author should be able to trace it back to the exact sentence that caused it.

---

## 11. Interoperability

### 11.1 Embeddability

The compiled story should be embeddable as a library in larger applications.
A game engine, a web application, or a chatbot framework should be able to instantiate a story, send it input, and receive structured output — using the story as a simulation engine rather than a standalone experience.

#### 11.1.1 Embeddability API

The embedding API provides a minimal, async-aware interface:

```typescript
interface ChordInstance {
  /** Initialize the story and return the opening output (room description, etc.) */
  start(): Promise<SemanticEvent[]>;

  /** Process one turn of player input. Returns after the full turn completes. */
  send(input: InputEvent): Promise<SemanticEvent[]>;

  /** Register a callback for asynchronous output (clock-scheduled rules, §6.3.5). */
  onAsyncOutput(callback: (events: SemanticEvent[]) => void): void;

  /** Serialize the complete world state (including journal, clock state, vector index). */
  save(): Promise<Uint8Array>;

  /** Restore from a previously saved snapshot. */
  restore(snapshot: Uint8Array): Promise<void>;

  /** Release all resources. The instance cannot be used after this call. */
  destroy(): void;
}
```

**Synchronous turns.** The `send()` method returns a promise that resolves after the entire turn completes — including all phases of the rule cascade, every-turn rules, scene processing, and reactive rules. From the host's perspective, a turn is an atomic operation.

**Asynchronous output.** Clock-scheduled rules (§6.3.5) produce output between turns, delivered via the `onAsyncOutput` callback. The host must handle async output on its own event loop. If no clock-scheduled rules exist, the callback is never invoked.

**Implementation dependency.** The synchronous API surface is well-defined and maps directly to the existing `Engine` class. The async protocol for clock-scheduled output requires the wall-clock implementation from Phase 5 of `IMPLEMENT.md`. Until Phase 5, `onAsyncOutput` is a no-op.

### 11.2 Foreign Function Interface

Libraries should be able to call out to host-provided functions for capabilities beyond the world model — network requests, machine learning inference, database queries, hardware interaction.
This is the mechanism by which an Chord story could, for example, consult an LLM to generate dialogue or query a knowledge graph.

The FFI should be sandboxed and capability-gated.
A story declares what external capabilities it requires; the host decides whether to grant them.

#### 11.2.1 Capability Declaration

A story declares its required capabilities using natural language:

    This story requires network access.
    This story requires the embedding-generation capability.
    This story requires file system read access.

**Structured syntax:**

    [capabilities: network-access, embedding-generation]

#### 11.2.2 Capability Catalog

The following standard capabilities are defined:

| Capability | Description |
|-----------|-------------|
| `network-access` | HTTP/HTTPS requests to external services |
| `file-system-read` | Read files from the host filesystem |
| `file-system-write` | Write files to the host filesystem |
| `embedding-generation` | Call an external embedding model (compile-time only per D4) |
| `random-external` | Cryptographic random source (beyond the built-in deterministic PRNG) |

Stories and packages may declare custom capabilities beyond this catalog. The host must recognize and grant them explicitly.

#### 11.2.3 Host Binding API

The host registers FFI functions for granted capabilities:

```typescript
interface FFIBinding {
  capability: string;
  functions: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;
}

engine.registerFFI({
  capability: 'network-access',
  functions: {
    httpGet: (url: string) => fetch(url).then(r => r.json()),
    httpPost: (url: string, body: string) => fetch(url, { method: 'POST', body }).then(r => r.json()),
  },
});
```

#### 11.2.4 Calling Convention

**Natural language form:**

    Let the response be the result of calling httpGet with "https://api.example.com/data".

The pattern: `the result of calling [function-name] with [arg1], [arg2], ...`

**Structured syntax:**

    [ffi: httpGet, args: ["https://api.example.com/data"]]
    let the response be the external result;

#### 11.2.5 Sandbox and Failure Model

1. A story declares capabilities. The host grants or denies each one at instantiation time.
2. If a story calls an FFI function for a capability that was not granted, the call returns **absent** (per D8: fail-safe with provenance). The failure is logged with provenance metadata identifying the denied capability, the calling rule, and the source location.
3. If a granted FFI function throws an exception at runtime, the call returns **absent** with the exception message recorded in provenance. The turn is not aborted — the rule continues with the absent value.
4. No implicit capabilities. A story that declares no capabilities has no FFI access. This is the default and the expected state for most stories.

### 11.3 Data Import and Export

The world model should be serializable to and from standard formats (JSON, CSV, or similar).
This enables procedural generation pipelines where an external tool builds a world model that the story then loads, or analytics pipelines where a story's state history is exported for analysis.

---

## 12. Backward Compatibility Strategy

### 12.1 Source-Level Compatibility

The Chord compiler accepts valid Inform 7 source texts.
The natural language surface is a superset of the existing language.
Enhanced type features (optionals, sum types, parameterized kinds) apply uniformly and may require minor adaptation of legacy code.
Chord does not natively support Inform 7 `.i7x` extension files.
The package system (§9) is the sole mechanism for reusable libraries.
Authors with existing Inform 7 extensions must migrate them to Chord packages.
A conversion tool may be provided in the future.

### 12.2 Behavioral Compatibility

Chord aims for broadly compatible *world-model behavior* when compiling legacy source texts, but does not produce text output directly — it produces a semantic stream (§8.1).
Behavioral compatibility is measured at the world-model level: state transitions, rule firings, and narrative content should be broadly preserved.
Presentation-level fidelity (text formatting, exact phrasing of stock messages) is the reader application's concern.
The compatibility test suite validates world-model behavior, not rendered output.

### 12.3 No VM Compatibility

The system does not target Z-machine or Glulx as primary outputs.
Legacy interpreters are not supported as primary runtimes.

---

## 13. Design Aspirations

### 13.1 A Foundation for Intellectual Simulation

The modernized platform should be capable of supporting rich simulations of conceptual, social, and rhetorical systems — not through special-purpose features but through the natural expressiveness of an enhanced world model, type system, and rule architecture.
The goal is a general substrate powerful enough that libraries for belief systems, argumentation, social dynamics, and epistemic modeling are natural extensions rather than heroic efforts.

### 13.2 A Living Ecosystem

The package system, registries, and tooling should foster a community of library authors building reusable simulation components.
The platform succeeds not when it can do everything itself, but when it makes it easy for others to build and share the pieces.

### 13.3 A Bridge Between Narrative and Computation

Interactive fiction has always lived at the boundary between storytelling and simulation.
Chord should strengthen both sides of that boundary and make the connections between them more expressive — enabling stories that are computationally richer and simulations that are narratively deeper.
