# Chord Type System Specification

**Status:** Specified (not yet implemented)
**Phase:** 3 (Advanced Type System) per `IMPLEMENT.md`
**SPEC refs:** SPEC.md §2.3

This document is the authoritative specification for Chord's enhanced type system.
It defines concrete syntax, semantics, and compiler behavior for four extensions
to the Inform 7 kind system: sum types, optional values, parameterized kinds,
and first-class rules.

---

## 1. Sum Types (Enumerations with Associated Data)

### 1.1 Declaration Syntax

**Natural language form:**

    A response is a kind of value.
    A response can be an agreement carrying a belief or a refusal carrying a reason.

The pattern is:

    [Kind] can be [variant₁] carrying [associated-type₁] or [variant₂] carrying [associated-type₂].

Variants without associated data use the existing enumeration syntax:

    A mood is a kind of value.
    A mood can be calm, agitated, or furious.

Mixed variants (some with data, some without) are permitted:

    A search-result is a kind of value.
    A search-result can be found carrying a thing, not-found, or forbidden carrying a text.

**Structured syntax form:**

    [sum-type: response]
    [variant: agreement, carries: belief]
    [variant: refusal, carries: reason]

### 1.2 Assigning Sum-Typed Values

    Now the response of Bob is an agreement carrying Bob's core-belief.
    Now the response of Carol is a refusal carrying "I disagree on principle."
    Now the mood of Dave is furious.

For variants without associated data, assignment follows existing enumeration
syntax. For variants with associated data, the `carrying` keyword introduces
the associated value.

### 1.3 Pattern Matching

**Natural language form:**

    If the response of Bob is an agreement:
        let B be the carried value of the response of Bob;
        say "Bob agrees, believing [B]."
    Otherwise if the response of Bob is a refusal:
        let R be the carried value of the response of Bob;
        say "Bob refuses: [R]."

The phrase `the carried value of [expression]` extracts the associated data from
a sum-typed value. It is a compile error to use this phrase without first testing
which variant is active.

**Structured syntax form:**

    [match: response of Bob]
    [case: agreement(B)] say "Bob agrees, believing [B]."
    [case: refusal(R)] say "Bob refuses: [R]."
    [end match]

### 1.4 Exhaustiveness

The compiler enforces exhaustive matching per ARCH.md D8. If a match expression
does not cover all variants, the compiler emits an error. An `otherwise` clause
serves as a catch-all:

    If the response of Bob is an agreement:
        say "Agreed."
    Otherwise:
        say "Not agreed."

### 1.5 Integration with Rule Conditions

Sum type variants are testable in `when` clauses:

    Instead of asking Bob about something when the response of Bob is a refusal:
        say "Bob has already refused."

    After telling Carol about something when the mood of Carol is furious:
        say "Carol is too angry to listen."

### 1.6 Nested Sum Types

A variant's associated data may itself be a sum type:

    A belief is a kind of value.
    A belief can be a conviction carrying a text or a suspicion carrying a number.

    A response can be an agreement carrying a belief or a refusal carrying a reason.

Pattern matching nests naturally:

    If the response of Bob is an agreement:
        let B be the carried value of the response of Bob;
        if B is a conviction:
            let T be the carried value of B;
            say "Bob is convinced: [T]."

---

## 2. Optional Values

### 2.1 Declaration Syntax

    The weapon of a person is an optional thing.
    The title of a room is an optional text.

The keyword `optional` before the type name declares the property as optional.
An optional property has two states in closed-world mode: **valued** or
**absent**. In open-world mode, it has three states: **valued**, **absent**, or
**unknown** (per SPEC.md §3.3.2).

### 2.2 Assignment and Clearing

    Now the weapon of Bob is the rusty sword.    [→ valued]
    Bob has no weapon.                            [→ absent]

These use existing Chord syntax. No new keywords are needed.

### 2.3 Testing

    If the weapon of Bob is present:
        say "Bob wields [the weapon of Bob]."
    Otherwise:
        say "Bob is unarmed."

The expressions `is present` and `is absent` test optional state. These are the
same expressions defined in SPEC.md §3.3.6 for open-world properties. Optional
properties reuse this mechanism.

For open-world optional properties, all three states are distinguishable:

| Expression | True when |
|-----------|-----------|
| `is present` | valued (has a concrete value) |
| `is absent` | explicitly cleared (`has no X`) |
| `is unknown` | open-world and never set |
| `is known` | valued or absent |

### 2.4 Default Values

    The weapon of Bob (or the bare-fists if absent).
    The title of the Dungeon (or "Unnamed Room" if absent).

This extends the existing default-value syntax from SPEC.md §3.3.7.

### 2.5 Non-Optional Properties

Properties declared without `optional` remain non-optional. They must always
have a value. Attempting to clear a non-optional property is a compile error:

    The score of a person is a number.
    [compile error] The player has no score.

---

## 3. Parameterized Kinds

### 3.1 Declaration Syntax

Parameterized kinds use the existing English phrasing for generic containers:

    A list of things is a kind of value.
    A relation between people and arguments is a kind of value.
    A mapping from texts to numbers is a kind of value.

The pattern is:

- `a list of [K]` — ordered sequence of kind K
- `a relation between [K₁] and [K₂]` — set of (K₁, K₂) pairs
- `a mapping from [K₁] to [K₂]` — key-value store from K₁ to K₂

### 3.2 Built-in Parameterized Kinds

| Kind | Description | Backed by |
|------|-------------|-----------|
| `list of [K]` | Ordered sequence | JSON array in properties table |
| `relation between [K₁] and [K₂]` | Set of pairs | `relations` table rows |
| `mapping from [K₁] to [K₂]` | Key-value store | JSON object in properties table |

Authors may not define new parameterized kind constructors in the current
design. The three built-in constructors cover the common use cases. Custom
parameterized kinds are a candidate for a future extension.

### 3.3 Instantiation

    The beliefs of a person is a list of texts.
    The alliances is a relation between people and factions.
    The inventory-weights is a mapping from things to numbers.

The compiler verifies that the parameter kinds exist and are valid.

### 3.4 Manipulation Syntax

**Lists:**

    Add "the world is just" to the beliefs of Bob.
    Remove "the world is just" from the beliefs of Bob.
    Let N be the number of entries in the beliefs of Bob.
    Repeat with B running through the beliefs of Bob: ...
    If the beliefs of Bob contain "the world is just": ...

**Relations:**

    Now Bob allies-with the Northern Faction.      [existing relation syntax]
    Now Bob does not ally-with the Northern Faction.

**Mappings:**

    Now the inventory-weights maps the brass lamp to 3.
    Let W be what the inventory-weights maps the brass lamp to.
    Now the inventory-weights no longer maps the brass lamp.

### 3.5 Type Checking

The compiler verifies that values added to parameterized containers match the
declared parameter kind. Adding a number to a `list of texts` is a compile
error. Adding a thing to a `relation between people and factions` where
the thing is not a person is a compile error.

**Structured syntax:**

    [kind: list, parameter: text]
    The beliefs of a person is a value.

---

## 4. First-Class Rules

### 4.1 Rule-Typed Variables

Rules and phrases may be stored in variables and passed as values:

    The evaluation-strategy of a person is a rule.

    Now the evaluation-strategy of Bob is the optimistic-assessment rule.
    Now the evaluation-strategy of Carol is the cautious-assessment rule.

The `rule` type accepts any named rule. The rule must be defined elsewhere in the
source text.

### 4.2 Invocation

    Apply the evaluation-strategy of Bob to each belief in the beliefs of Bob.

The `apply [rule] to [value]` syntax invokes a rule-typed variable. The rule
receives the value as its noun.

For iteration, `apply [rule] to each [kind] in [list]` iterates over a
parameterized list, invoking the rule once per element.

### 4.3 Rule References in Conditions

    If the evaluation-strategy of Bob is the optimistic-assessment rule: ...

Rule-typed properties support equality testing. Two rule references are equal
if they name the same defined rule.

### 4.4 Anonymous Rules

Anonymous (inline) rules are not supported in this design. All rules must be
named and defined at the top level. This preserves the natural-language
readability of Chord source texts — a named rule reads as a noun phrase
("the optimistic-assessment rule"), while an anonymous rule would require
introducing lambda-like syntax that conflicts with the NL surface.

### 4.5 Higher-Order Patterns

First-class rules enable strategy patterns without enumeration:

    The diplomatic-response rules are a rule.
    The aggressive-response rules are a rule.

    Before asking an NPC about something:
        apply the dialogue-strategy of the NPC to the noun.

This allows different NPCs to use different dialogue strategies without
the author writing separate rule sets per character.

### 4.6 Structured Syntax

    [rule-ref: evaluation-strategy of Bob]
    [apply: optimistic-assessment, to: each belief in beliefs of Bob]

---

## 5. Interactions Between Type Extensions

### 5.1 Optional Sum Types

A property may be both optional and sum-typed:

    The response of a person is an optional response.

This produces four possible states: valued-agreement, valued-refusal, absent,
and (if open-world) unknown.

### 5.2 Parameterized Kinds of Sum Types

    The responses of a person is a list of responses.

A list may contain sum-typed values. Pattern matching applies element-wise
during iteration.

### 5.3 Rule-Typed Properties in Sum Types

A sum type variant may carry a rule:

    A strategy is a kind of value.
    A strategy can be fixed carrying a rule or adaptive.

---

## 6. Compilation

### 6.1 Storage

Sum types are stored in the `properties` table as JSON:

    { "variant": "agreement", "value": "belief-id-123" }

Optional properties use the existing three-state model column in the
`properties` table (per SPEC.md §3.3 and IMPLEMENT.md Phase 2).

Parameterized kinds are stored as described in §3.2 above.

Rule references are stored as the rule's string name in the `properties` table.

### 6.2 Code Generation

The compiler emits TypeScript match helpers for sum types:

```typescript
function matchResponse(value: SumValue): { variant: string; carried?: unknown } {
  return { variant: value.variant, carried: value.value };
}
```

Exhaustiveness is checked at compile time. The emitted code does not need
runtime exhaustiveness checks.

### 6.3 Error Cases

| Scenario | Compiler behavior |
|----------|------------------|
| Non-exhaustive match | Error |
| `carried value` without variant test | Error |
| Type mismatch in parameterized kind | Error |
| Clearing a non-optional property | Error |
| Applying a non-rule value | Error |
| Anonymous rule definition | Error (not supported) |
