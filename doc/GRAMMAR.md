# Chord DSL — Formal Grammar (Phase 0 / MVP)

This is the single source of truth for the Chord DSL grammar. It is derived
from `MVP.md` grammar sketches and the actual parser implementation in
`compiler/src/parser.ts`. When this document and the parser diverge, this
document is authoritative and the parser should be updated to match.

**Notation:** EBNF with the following conventions:
- `"keyword"` — literal keyword (case-insensitive unless noted)
- `UPPER_CASE` — terminal token from the lexer
- `lower_case` — non-terminal production
- `( ... )` — grouping
- `[ ... ]` — optional (zero or one)
- `{ ... }` — repetition (zero or more)
- `|` — alternation
- `(* comment *)` — prose annotation

---

## 1. Lexical Grammar

The lexer (`compiler/src/lexer.ts`) produces a flat token stream. Indentation
is significant and emitted as INDENT/DEDENT tokens.

### 1.1 Terminals

```ebnf
WORD           = letter { letter | digit | "_" | "-" | "'" } ;
QUOTED_STRING  = '"' { any_char - '"' | escape_seq } '"' ;
NUMBER         = [ "-" ] digit { digit } ;
DOT            = "." ;
COLON          = ":" ;
SEMICOLON      = ";" ;
COMMA          = "," ;
LBRACKET       = "[" ;
RBRACKET       = "]" ;
COMPARATOR     = ">" | "<" | ">=" | "<=" | "==" | "!=" ;
NEWLINE        = line_ending ;
INDENT         = (* indentation increase *) ;
DEDENT         = (* indentation decrease *) ;
EOF            = (* end of file *) ;
```

### 1.2 Lexical Rules

- Tabs are normalized to 4 spaces before tokenization.
- Em-dashes (U+2014) and en-dashes (U+2013) are treated as word separators.
- Completely empty lines are skipped.
- INDENT and DEDENT tokens are emitted based on an indentation stack.

---

## 2. Syntactic Grammar

### 2.1 Top Level

```ebnf
story_file     = [ title_line ] { top_level_item } EOF ;

title_line     = QUOTED_STRING [ "by" name ] DOT ;

top_level_item = { annotation } ( declaration
               | rule
               | every_turn_rule
               | scene_declaration
               | scene_handler ) ;
```

### 2.2 Annotations (SPEC §2.2.1)

```ebnf
annotation       = inline_annotation
                 | block_begin
                 | block_end ;

inline_annotation = LBRACKET annotation_entry { COMMA annotation_entry } RBRACKET ;

annotation_entry  = WORD COLON annotation_value ;

annotation_value  = QUOTED_STRING
                  | NUMBER
                  | WORD { WORD } ;

block_begin       = LBRACKET "begin" WORD RBRACKET ;
                  (* e.g. [begin structured] *)

block_end         = LBRACKET "end" WORD RBRACKET ;
                  (* e.g. [end structured] *)
```

Inline annotations attach to the immediately following declaration or rule.
Block annotations (`[begin structured]`...`[end structured]`) apply to all
items within the block. Annotations are optional metadata; they do not change
the NL parsing, only the compiler's interpretation.

**Known annotation keys:** `open-world`, `journal`, `depth`, `schedule`,
`interval`, `unknown-default`, `name`, `import`, `alias`.

### 2.3 Declarations

```ebnf
declaration    = kind_decl
               | property_decl
               | default_decl
               | object_decl
               | relation_decl
               | player_start ;

kind_decl      = name "is" "a" "kind" "of" name DOT ;

property_decl  = name "has" property_type "called" name DOT ;

property_type  = "truth" "state"
               | "number"
               | "text" ;

default_decl   = name "is" "usually" [ "not" ] value DOT ;

object_decl    = name "is" article name [ location ] DOT [ QUOTED_STRING ] ;

relation_decl  = name "is" direction "of" name DOT ;

player_start   = "The" "player" "is" "in" name DOT ;

location       = "in" name
               | direction "of" name ;
```

### 2.3 Names and Articles

```ebnf
name           = [ article ] word_seq ;

word_seq       = WORD { WORD } ;
               (* terminates before structural keywords:
                  is, has, in, when, and, called, usually, of, to, from,
                  by, with, begins, ends, not, and all direction words *)

article        = "a" | "an" | "the" | "some" ;

direction      = "north" | "south" | "east"  | "west"
               | "up"    | "down"
               | "northeast" | "northwest"
               | "southeast" | "southwest" ;

value          = QUOTED_STRING | NUMBER | WORD ;
```

### 2.4 Rules

```ebnf
rule           = phase action_pattern [ conditions ] COLON statement_block ;

phase          = "before"
               | "instead" [ "of" ]
               | "check"
               | "carry" "out"
               | "after"
               | "report" ;

action_pattern = verb [ noun_pattern ] ;

verb           = WORD ;
               (* gerund form, e.g. "taking" — converted to infinitive internally *)

noun_pattern   = "something"
               | name ;
               (* "something" matches any object;
                  name matches a specific object *)

conditions     = "when" condition { ( "," | "and" ) condition } ;

condition      = player_location_test
               | location_test
               | comparison_test
               | property_test ;

player_location_test = "the" "player" "is" "in" name ;

location_test  = name "is" "in" name ;

property_test  = name "is" [ "not" ] value ;

comparison_test = "the" name "of" name COMPARATOR value ;
```

### 2.5 Every-Turn Rules

```ebnf
every_turn_rule = "every" "turn" [ conditions ] COLON statement_block ;
```

### 2.6 Scenes

```ebnf
scene_declaration = name "is" "a" "scene" DOT
                    [ scene_clauses ] ;

scene_clauses  = { scene_clause } ;
               (* up to 4 continuation lines *)

scene_clause   = name "begins" "when" scene_condition DOT
               | name "ends" "when" scene_condition DOT ;

scene_condition = "play" "begins"
                | "the" "player" "is" "in" name
                | name "is" [ "not" ] value
                | (* empty — defaults to 'always' *) ;

scene_handler  = "when" scene_name ( "begins" | "ends" ) COLON statement_block ;
               (* special case: "when play begins:" is sceneName='__play' *)
```

### 2.7 Statement Blocks

```ebnf
statement_block = COLON NEWLINE INDENT { statement terminator } DEDENT
                | COLON statement terminator ;
               (* single-line form: colon followed by one statement *)

terminator     = DOT | SEMICOLON | NEWLINE ;

statement      = say_statement
               | now_statement
               | move_statement
               | remove_statement
               | stop_statement ;

say_statement  = "say" QUOTED_STRING ;

now_statement  = "now" name "is" now_value ;

now_value      = "not" value
               | "carried" "by" "the" "player"
               | value ;

move_statement = "move" name "to" name ;

remove_statement = "remove" name ;

stop_statement = "stop" ;
```

---

## 3. Grammar Notes

### 3.1 Name Resolution

Names are sequences of WORD tokens that terminate before **structural
keywords**: `is`, `has`, `in`, `when`, `and`, `called`, `usually`, `of`,
`to`, `from`, `by`, `with`, `begins`, `ends`, `not`, and all direction
words. This means multi-word names like "brass lamp" or "dark cellar" are
parsed as single name tokens.

### 3.2 Rule Cascade Order

Rules execute in a fixed cascade during each turn:

1. **before** — pre-action checks, may prevent action
2. **instead** — replaces default action entirely
3. **check** — validation, may block action
4. **carry_out** — performs the action (state changes)
5. **after** — post-action effects
6. **report** — narration of what happened

Every-turn rules execute once per turn after the cascade completes.

### 3.3 Ambiguity Resolution

The parser uses a deterministic strategy when multiple interpretations exist:

1. **Longest match.** Multi-word names consume as many words as possible
   before a structural keyword.
2. **Declaration before rule.** Top-level dispatch routes article-led
   sentences to declarations, phase-led sentences to rules.
3. **Capitalized statements.** A sentence starting with a capitalized word
   (not a phase keyword) is tried as a declaration via
   `parseCapitalizedStatement()`.

### 3.4 Not Yet Implemented

The following grammar constructs appear in `MVP.md` sketches but are **not
yet implemented** in the parser:

- `try_stmt` — `"try" action_pattern`
- `if_stmt` — `"if" condition ":" INDENT body [ "otherwise:" INDENT body ]`
- Text substitutions within quoted strings (note: brackets inside quoted strings
  are consumed as string content, not as LBRACKET/RBRACKET tokens):
  - List substitutions: `"[a list of" name "in" expression "]"`
  - Conditional substitutions: `"[if" condition "]" text "[otherwise]" text "[end if]"`
  - Property substitutions: `"[the" name "of" expression "]"`

These are documented here for completeness and will be added in future phases.

---

## 4. Example

A complete minimal story demonstrating the grammar:

```chord
"The Brass Lamp" by Example Author.

A room is a kind of thing.
A room has text called description.
A container is a kind of thing.

The Foyer is a room. "A grand entrance hall with marble floors."
The Garden is a room. "A peaceful garden with a fountain."
The Garden is north of the Foyer.

The brass lamp is a thing in the Foyer.
The brass lamp has truth state called lit. The brass lamp is usually not lit.

After taking the brass lamp:
  say "The lamp feels warm to the touch."

Every turn when the player is in the Garden:
  say "You hear the fountain splashing."

Arrival is a scene. Arrival begins when play begins. Arrival ends when the brass lamp is lit.

When Arrival begins:
  say "Welcome to the old manor."
```
