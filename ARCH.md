# Chord: A Modernization Spec for the Inform 7 Platform

**Status:** Conceptual  
**Scope:** Architecture, language evolution, tooling, and ecosystem  
**Constraint:** Full backward compatibility with existing Inform 7 source texts  

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

### 1.2 Backward Compatibility with Source, Not Machinery

Any valid Inform 7 source text should compile and run under the new system with identical behavior.
Compatibility is with the *semantics* of the language and the world model, not with the Z-machine, Glulx, Glk, or the Inform 6 intermediate representation.
These are implementation details of a prior era.

### 1.3 Expand the Ceiling Without Raising the Floor

New capabilities should be available to authors who need them without increasing complexity for authors who don't.
A simple story about a house with a locked door should be no harder to write than it is today.

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

### 2.2 Structured Syntax Mode

Authors may drop into a structured syntax within any source text for situations where the natural language becomes ambiguous or unwieldy.
The structured mode is not a replacement; it is an escape hatch.

The relationship between the two modes should feel like prose and code coexisting in a literate document.
An author might describe a room in natural language and then express a complex conditional rule in structured syntax, within the same file, without ceremony.

The structured syntax should be minimal and declarative in character — closer to a configuration language or a logic language than to an imperative programming language.

### 2.3 Enhanced Type System

The kind system should be extended to support:

- **Sum types (enumerations with associated data).** A "response" might be either an "agreement carrying a belief" or a "refusal carrying a reason."  This allows world model states to be precise without proliferating boolean flags.
- **Optional values.** A property may explicitly have no value.  This addresses the closed-world limitation by allowing "unknown" to be a first-class state rather than a workaround.
- **Parameterized kinds.** A "list of beliefs" or a "relation between people and arguments" should be expressible as types, enabling libraries to define generic structures.
- **First-class rules and phrases.** Rules and phrases should be passable as values, enabling higher-order patterns like "apply this evaluation strategy to each belief" without requiring the author to enumerate cases.

### 2.4 Ontological Namespacing

As libraries grow in sophistication, name collisions become inevitable.
The language should support namespaced vocabularies so that a rhetoric library's "claim" and a legal library's "claim" can coexist.
The natural language surface should handle this gracefully — perhaps through contextual disambiguation or author-chosen aliases.

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

### 3.3 Open-World Option

By default, the world model remains closed-world: if a fact is not stated, it is false.
However, authors should be able to designate specific properties or relations as open-world, meaning their truth value may be "true," "false," or "unknown."
This is essential for modeling epistemic states, incomplete information, and mysteries.

### 3.4 Temporal State

The world model should natively support a concept of history.
Rather than only tracking current state, an author should be able to opt into journaled properties — properties whose past values are accessible.
"The conviction of the suspect was previously uncertain" should be a queryable condition without the author manually maintaining shadow variables.

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

### 4.3 No Fuzzy Conditions

Vector similarity must never appear as a condition in a rule.
"Instead of examining something semantically near grief" is not a well-defined rule and cannot be debugged or reasoned about.
The natural threshold problem — where "related" shades into "unrelated" on a continuum — is irreconcilable with the rule system's requirement for crisp pattern matching.

If an author needs similarity-sensitive behavior, the pattern is: query for similar objects first, assign them to a concrete variable or list, then write rules against those concrete values.

### 4.4 Embedding Computation

The embeddings themselves may originate from an external source — a language model, a pretrained encoder, or an author-provided table of vectors.
This is a natural use of the foreign function interface described in Section 11.2.
However, once computed, the vectors are stored locally alongside the world model in an embedded vector index (such as sqlite-vec) with no runtime dependency on external services.

Embeddings may be precomputed at compile time for static content or generated at runtime for dynamic content, at the author's discretion.

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

### 5.4 Reactive Rules

In addition to the per-turn and per-action rules, the system should support reactive rules that trigger on state change: "when the trust between Alice and Bob becomes less than 3."
This eliminates the pattern of polling for conditions in every-turn rules and makes event-driven simulation natural.

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

---

## 7. The Compilation Target

### 7.1 WebAssembly as Primary Target

The story file should compile to WebAssembly.
This provides:
- Browser-native execution with no plugins or interpreters required
- Near-native performance on all platforms
- A well-defined sandboxed execution model
- Access to the broader WebAssembly ecosystem and tooling

### 7.2 Direct Compilation

The two-stage pipeline through Inform 6 is eliminated.
The Chord compiler produces WebAssembly directly (or through a thin IR purpose-built for the system).
This removes an entire class of legacy constraints and simplifies the toolchain.

### 7.3 Native Numeric Types

The compilation target should support both integer and floating-point arithmetic.
Authors should not have to think about this for typical use, but libraries modeling continuous quantities, probabilities, or spatial reasoning should have access to real-valued computation.

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
The default frontend is a web application that renders in the browser, since WebAssembly gives us this essentially for free.

The protocol between story and frontend should be documented and stable, enabling third-party frontends.

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

---

## 9. The Extension and Library Ecosystem

### 9.1 Package Manager

Extensions are distributed through a package registry with semantic versioning and declared dependencies.
The tooling resolves dependency graphs, detects conflicts, and manages updates.
This replaces the current model of manually including extension files.

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

### 11.2 Foreign Function Interface

Libraries should be able to call out to host-provided functions for capabilities beyond the world model — network requests, machine learning inference, database queries, hardware interaction.
This is the mechanism by which an Chord story could, for example, consult an LLM to generate dialogue or query a knowledge graph.

The FFI should be sandboxed and capability-gated.
A story declares what external capabilities it requires; the host decides whether to grant them.

### 11.3 Data Import and Export

The world model should be serializable to and from standard formats (JSON, CSV, or similar).
This enables procedural generation pipelines where an external tool builds a world model that the story then loads, or analytics pipelines where a story's state history is exported for analysis.

---

## 12. Backward Compatibility Strategy

### 12.1 Source-Level Compatibility

The Chord compiler accepts all valid Inform 7 source texts.
The natural language surface is a superset of the existing language.
Existing extensions should compile without modification, though they won't benefit from new capabilities until updated.

### 12.2 Behavioral Fidelity

When compiling a legacy source text, the resulting behavior must be identical to the behavior produced by the original Inform 7 toolchain targeting Glulx.
The test suite for compatibility should include the existing Inform 7 test cases and a corpus of published stories verified against their known behavior.

### 12.3 No VM Compatibility

The system does not target Z-machine or Glulx as primary outputs.
Legacy interpreters are not supported as primary runtimes.

---

## 13. Design Aspirations

### 13.1 A Foundation for Intellectual Simulation

The modernized platform should be capable of supporting rich simulations of conceptual, social, and rhetorical systems — not through special-purpose features but through the natural expressiveness of an enhanced world model, type system, and rule architecture.
The goal is a general substrate powerful enough that libraries for belief systems, argumentation, social dynamics, and epistemic modeling are natural extensions rather than heroic efforts.

### 13.2 A Living Ecosystem

The package system, registry, and tooling should foster a community of library authors building reusable simulation components.
The platform succeeds not when it can do everything itself, but when it makes it easy for others to build and share the pieces.

### 13.3 A Bridge Between Narrative and Computation

Interactive fiction has always lived at the boundary between storytelling and simulation.
Chord should strengthen both sides of that boundary and make the connections between them more expressive — enabling stories that are computationally richer and simulations that are narratively deeper.
