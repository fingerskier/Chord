/**
 * Recursive-descent parser for the Chord story DSL.
 *
 * Consumes the token stream from the lexer and produces an AST.
 */

import type { Token, TokenType } from './lexer.js';
import type {
  StoryFile,
  Declaration,
  KindDecl,
  PropertyDecl,
  DefaultDecl,
  ObjectDecl,
  RelationDecl,
  RuleNode,
  EveryTurnRuleNode,
  SceneNode,
  SceneHandlerNode,
  SceneCondition,
  Phase,
  NounPattern,
  Condition,
  Statement,
  SourceLocation,
  Annotation,
  AnnotationEntry,
} from './ast.js';
import { DIRECTIONS, gerundToInfinitive } from './utils.js';

// ---------------------------------------------------------------------------
// Compiler error
// ---------------------------------------------------------------------------

export class CompileError extends Error {
  constructor(
    message: string,
    public loc: SourceLocation,
  ) {
    super(`${loc.line}:${loc.col}: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export class Parser {
  private pos = 0;
  private errors: CompileError[] = [];
  private blockAnnotations: Annotation[] = [];

  constructor(private tokens: Token[]) {}

  parse(): { ast: StoryFile; errors: CompileError[] } {
    const ast: StoryFile = {
      declarations: [],
      rules: [],
      everyTurnRules: [],
      scenes: [],
      sceneHandlers: [],
    };

    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.isAtEnd()) break;

      try {
        this.parseTopLevel(ast);
      } catch (e) {
        if (e instanceof CompileError) {
          this.errors.push(e);
          this.skipToNextSentence();
        } else {
          throw e;
        }
      }
    }

    return { ast, errors: this.errors };
  }

  // -----------------------------------------------------------------------
  // Top-level dispatch
  // -----------------------------------------------------------------------

  private parseTopLevel(ast: StoryFile): void {
    this.skipNewlines();
    if (this.isAtEnd()) return;

    // Collect inline annotations before the next statement
    const annotations: Annotation[] = [...this.blockAnnotations];
    while (this.checkToken('LBRACKET')) {
      const ann = this.parseAnnotation();
      if (!ann) break; // block begin/end handled internally
      annotations.push(ann);
      this.skipNewlines();
    }

    if (this.isAtEnd()) return;

    const token = this.peek();

    // Title line: "Title" by Author (a quoted string followed by "by")
    if (token.type === 'QUOTED_STRING') {
      ast.title = token.value;
      this.advance();
      if (this.checkWord('by')) {
        this.advance();
        ast.author = this.consumeName();
      }
      this.skipNewlines();
      return;
    }

    if (token.type !== 'WORD') {
      this.advance();
      return;
    }

    const word = token.value.toLowerCase();

    // Rule phases
    if (word === 'before') {
      const rule = this.parseRule('before');
      if (annotations.length) rule.annotations = annotations;
      ast.rules.push(rule);
      return;
    }
    if (word === 'instead') {
      this.advance(); // "instead"
      this.expectWord('of');
      const rule = this.parseRuleBody('instead');
      if (annotations.length) rule.annotations = annotations;
      ast.rules.push(rule);
      return;
    }
    if (word === 'check') {
      const rule = this.parseRule('check');
      if (annotations.length) rule.annotations = annotations;
      ast.rules.push(rule);
      return;
    }
    if (word === 'carry') {
      this.advance(); // "carry"
      this.expectWord('out');
      const rule = this.parseRuleBody('carry_out');
      if (annotations.length) rule.annotations = annotations;
      ast.rules.push(rule);
      return;
    }
    if (word === 'after') {
      const rule = this.parseRule('after');
      if (annotations.length) rule.annotations = annotations;
      ast.rules.push(rule);
      return;
    }
    if (word === 'report') {
      const rule = this.parseRule('report');
      if (annotations.length) rule.annotations = annotations;
      ast.rules.push(rule);
      return;
    }

    // Every turn
    if (word === 'every') {
      this.advance(); // "every"
      this.expectWord('turn');
      const rule = this.parseEveryTurnRule();
      if (annotations.length) rule.annotations = annotations;
      ast.everyTurnRules.push(rule);
      return;
    }

    // When (scene handler)
    if (word === 'when') {
      // Could be "When X begins/ends:" or "When play begins:"
      const handler = this.parseSceneHandler();
      if (handler) {
        ast.sceneHandlers.push(handler);
        return;
      }
    }

    // Articles → declarations
    if (word === 'a' || word === 'an' || word === 'the' || word === 'some') {
      const decl = this.parseDeclaration(ast);
      if (decl) {
        if (annotations.length) decl.annotations = annotations;
        ast.declarations.push(decl);
      }
      return;
    }

    // Named scene: "Darkness is a scene."
    // This falls through to declaration parsing above if it starts with article
    // But scenes might start with a capitalized name
    if (/^[A-Z]/.test(token.value)) {
      const decl = this.parseCapitalizedStatement(ast);
      if (decl) {
        if (annotations.length) decl.annotations = annotations;
        ast.declarations.push(decl);
      }
      return;
    }

    // Unknown — skip
    this.advance();
  }

  // -----------------------------------------------------------------------
  // Annotation parsing (SPEC §2.2.1)
  // -----------------------------------------------------------------------

  /**
   * Parse a `[key: value, ...]` annotation.
   * Returns null if this is a block begin/end (handled via blockAnnotations stack).
   */
  private parseAnnotation(): Annotation | null {
    const loc = this.peek().loc;
    this.advance(); // consume LBRACKET

    // Check for block annotations: [begin structured] / [end structured]
    if (this.checkWord('begin')) {
      this.advance(); // "begin"
      const mode = this.expectWordAny();
      this.expectToken('RBRACKET');
      // Push a marker annotation onto the block stack
      this.blockAnnotations.push({
        type: 'annotation',
        entries: [{ key: 'block', value: mode }],
        loc,
      });
      return null;
    }
    if (this.checkWord('end')) {
      this.advance(); // "end"
      this.expectWordAny(); // consume mode name
      this.expectToken('RBRACKET');
      if (this.blockAnnotations.length > 0) {
        this.blockAnnotations.pop();
      }
      return null;
    }

    // Parse key: value entries
    const entries: AnnotationEntry[] = [];
    entries.push(this.parseAnnotationEntry());

    while (this.checkToken('COMMA')) {
      this.advance(); // consume comma
      entries.push(this.parseAnnotationEntry());
    }

    this.expectToken('RBRACKET');
    return { type: 'annotation', entries, loc };
  }

  private parseAnnotationEntry(): AnnotationEntry {
    const key = this.expectWordAny();
    this.expectToken('COLON');
    const value = this.consumeAnnotationValue();
    return { key, value };
  }

  /** Consume an annotation value: quoted string, number, or words up to comma/rbracket. */
  private consumeAnnotationValue(): string {
    if (this.peek().type === 'QUOTED_STRING') {
      return this.advance().value;
    }
    if (this.peek().type === 'NUMBER') {
      return this.advance().value;
    }
    // Consume words until a non-WORD token (comma, rbracket, newline, etc.)
    let value = '';
    while (!this.isAtEnd() && this.peek().type === 'WORD') {
      if (value) value += ' ';
      value += this.advance().value;
    }
    return value;
  }

  // -----------------------------------------------------------------------
  // Declaration parsing
  // -----------------------------------------------------------------------

  private parseDeclaration(ast: StoryFile): Declaration | null {
    const loc = this.peek().loc;
    const article = this.advance().value.toLowerCase(); // consume article

    // Read the name up to a structural keyword
    const name = this.consumeName();
    if (!name) {
      throw new CompileError('Expected a name after article', loc);
    }

    // "is a kind of X."
    if (this.checkWord('is')) {
      this.advance(); // "is"

      // "is a kind of X."
      if (this.checkWord('a') || this.checkWord('an')) {
        const savedPos = this.pos;
        this.advance(); // "a"/"an"
        if (this.checkWord('kind')) {
          this.advance(); // "kind"
          this.expectWord('of');
          const parent = this.consumeName();
          this.expectDot();
          return { type: 'kind_decl', name, parent, loc } as KindDecl;
        }
        // Not a kind decl — backtrack, it's an object decl: "X is a Y [in Z]. desc?"
        this.pos = savedPos;
        return this.parseObjectDecl(name, loc);
      }

      // "is a scene."
      if (this.checkWord('scene')) {
        // Actually this doesn't start with article... handle specially
      }

      // "is usually [not] value."
      if (this.checkWord('usually')) {
        this.advance(); // "usually"
        let negated = false;
        if (this.checkWord('not')) {
          this.advance(); // "not"
          negated = true;
        }
        const value = this.consumeValue();
        this.expectDot();
        return {
          type: 'default_decl',
          kindName: name,
          propertyName: value,
          value,
          negated,
          loc,
        } as DefaultDecl;
      }

      // "is north of X." (directional relation)
      if (this.peekIsDirection()) {
        const direction = this.advance().value.toLowerCase();
        this.expectWord('of');
        const objectName = this.consumeNameWithArticle();
        this.expectDot();
        return {
          type: 'relation_decl',
          subjectName: name,
          direction,
          objectName,
          loc,
        } as RelationDecl;
      }

      // "is in The X." (player placement or containment)
      if (this.checkWord('in')) {
        this.advance(); // "in"
        const containerName = this.consumeNameWithArticle();
        this.expectDot();
        // Check if this is player placement
        if (name.toLowerCase() === 'player') {
          ast.playerStart = containerName;
          return null;
        }
        // Otherwise it's an object with just a location and no kind specified
        // Treat as object with kind 'thing'
        return {
          type: 'object_decl',
          name,
          kind: 'thing',
          location: containerName,
          loc,
        } as ObjectDecl;
      }

      // Backtrack — might be object decl "The X is a Y."
      // This shouldn't happen if we reach here... skip to dot
      this.skipToNextSentence();
      return null;
    }

    // "has a truth state called X."
    if (this.checkWord('has')) {
      this.advance(); // "has"
      this.skipArticle();
      const propType = this.consumePropertyType();
      this.expectWord('called');
      const propName = this.consumeName();
      this.expectDot();
      return {
        type: 'property_decl',
        kindName: name,
        propertyType: propType,
        propertyName: propName,
        loc,
      } as PropertyDecl;
    }

    throw new CompileError(`Unexpected token after "${name}"`, this.peek().loc);
  }

  private parseObjectDecl(name: string, loc: SourceLocation): ObjectDecl {
    // We're at the article before the kind name: "X is [a/an] KIND [in LOC]. [desc]"
    this.advance(); // skip article "a"/"an"
    const kind = this.consumeName();

    let location: string | undefined;
    if (this.checkWord('in')) {
      this.advance(); // "in"
      location = this.consumeNameWithArticle();
    }

    this.expectDot();

    // Optional quoted description on same line or next line
    let description: string | undefined;
    this.skipNewlines();
    if (!this.isAtEnd() && this.peek().type === 'QUOTED_STRING') {
      description = this.advance().value;
      // Skip optional trailing dot or newline
      if (!this.isAtEnd() && this.peek().type === 'DOT') this.advance();
    }

    return { type: 'object_decl', name, kind, location, description, loc };
  }

  private parseCapitalizedStatement(ast: StoryFile): Declaration | null {
    const loc = this.peek().loc;
    const name = this.consumeName();

    if (this.checkWord('is')) {
      this.advance(); // "is"

      // "X is a scene."
      if (this.checkWord('a') || this.checkWord('an')) {
        const savedPos = this.pos;
        this.advance(); // "a"
        if (this.checkWord('scene')) {
          this.advance(); // "scene"
          this.expectDot();
          // Parse "X begins when ... X ends when ..."
          const scene = this.parseSceneClauses(name, loc);
          ast.scenes.push(scene);
          return null;
        }
        // Backtrack — it's an object decl
        this.pos = savedPos;
        return this.parseObjectDecl(name, loc);
      }

      // "X is north of Y."
      if (this.peekIsDirection()) {
        const direction = this.advance().value.toLowerCase();
        this.expectWord('of');
        const objectName = this.consumeNameWithArticle();
        this.expectDot();
        return {
          type: 'relation_decl',
          subjectName: name,
          direction,
          objectName,
          loc,
        } as RelationDecl;
      }

      // "X is usually [not] value."
      if (this.checkWord('usually')) {
        this.advance();
        let negated = false;
        if (this.checkWord('not')) {
          this.advance();
          negated = true;
        }
        const value = this.consumeValue();
        this.expectDot();
        return {
          type: 'default_decl',
          kindName: name,
          propertyName: value,
          value,
          negated,
          loc,
        } as DefaultDecl;
      }

      // "X is in The Y." (containment or player placement)
      if (this.checkWord('in')) {
        this.advance();
        const containerName = this.consumeNameWithArticle();
        this.expectDot();
        if (name.toLowerCase() === 'player') {
          ast.playerStart = containerName;
          return null;
        }
        return {
          type: 'object_decl',
          name,
          kind: 'thing',
          location: containerName,
          loc,
        } as ObjectDecl;
      }
    }

    // Could be "X begins when ..." (continuation of scene)
    if (this.checkWord('begins') || this.checkWord('ends')) {
      // This is a scene clause for a previously-declared scene on the same line
      const scene = this.parseSceneClausesInline(name, loc);
      ast.scenes.push(scene);
      return null;
    }

    throw new CompileError(`Unexpected statement starting with "${name}"`, loc);
  }

  // -----------------------------------------------------------------------
  // Rule parsing
  // -----------------------------------------------------------------------

  private parseRule(phase: Phase): RuleNode {
    const loc = this.peek().loc;
    this.advance(); // phase keyword
    return this.parseRuleBody(phase);
  }

  private parseRuleBody(phase: Phase): RuleNode {
    const loc = this.tokens[this.pos - 1]?.loc ?? this.peek().loc;

    // Parse verb (gerund form): "taking", "dropping", etc.
    const verbGerund = this.expectWordAny();
    const verb = gerundToInfinitive(verbGerund);

    // Parse noun pattern
    const nounPattern = this.parseNounPattern();

    // Parse conditions
    let conditions: Condition[] = [];
    if (this.checkWord('when')) {
      this.advance(); // "when"
      conditions = this.parseConditions();
    }

    // Expect colon
    this.expectToken('COLON');

    // Parse body
    const body = this.parseStatementBlock();

    return {
      type: 'rule',
      phase,
      verb,
      nounPattern,
      conditions,
      body,
      loc,
    };
  }

  private parseNounPattern(): NounPattern {
    if (this.checkWord('something')) {
      this.advance();
      return { type: 'any' };
    }

    // Check if next token is 'when' or ':' — no noun
    if (this.checkWord('when') || this.checkToken('COLON')) {
      return { type: 'none' };
    }

    // Specific noun: "the brass lamp" etc.
    const name = this.consumeNameWithArticle();
    if (name) {
      return { type: 'specific', name };
    }

    return { type: 'none' };
  }

  // -----------------------------------------------------------------------
  // Every-turn rule parsing
  // -----------------------------------------------------------------------

  private parseEveryTurnRule(): EveryTurnRuleNode {
    const loc = this.tokens[this.pos - 1]?.loc ?? this.peek().loc;

    let conditions: Condition[] = [];
    if (this.checkWord('when')) {
      this.advance();
      conditions = this.parseConditions();
    }

    this.expectToken('COLON');
    const body = this.parseStatementBlock();

    return { type: 'every_turn_rule', conditions, body, loc };
  }

  // -----------------------------------------------------------------------
  // Scene parsing
  // -----------------------------------------------------------------------

  private parseSceneClauses(name: string, loc: SourceLocation): SceneNode {
    // After "X is a scene." look for "X begins when ..." and "X ends when ..."
    let beginsWhen: SceneCondition = { type: 'always' };
    let endsWhen: SceneCondition = { type: 'always' };

    this.skipNewlines();

    // Parse multiple continuation sentences for this scene
    for (let i = 0; i < 4; i++) {
      this.skipNewlines();
      if (this.isAtEnd()) break;

      // Check if this line starts with the scene name
      const savedPos = this.pos;
      const nextName = this.tryConsumeName(name);
      if (!nextName) {
        this.pos = savedPos;
        break;
      }

      if (this.checkWord('begins')) {
        this.advance(); // "begins"
        this.expectWord('when');
        beginsWhen = this.parseSceneCondition();
        this.expectDot();
      } else if (this.checkWord('ends')) {
        this.advance(); // "ends"
        this.expectWord('when');
        endsWhen = this.parseSceneCondition();
        this.expectDot();
      } else {
        this.pos = savedPos;
        break;
      }
    }

    return { type: 'scene_decl', name, beginsWhen, endsWhen, loc };
  }

  private parseSceneClausesInline(name: string, loc: SourceLocation): SceneNode {
    let beginsWhen: SceneCondition = { type: 'always' };
    let endsWhen: SceneCondition = { type: 'always' };

    // We're at "begins" or "ends"
    if (this.checkWord('begins')) {
      this.advance();
      this.expectWord('when');
      beginsWhen = this.parseSceneCondition();
      this.expectDot();
    }

    this.skipNewlines();

    // Check for matching "Name ends when..."
    const savedPos = this.pos;
    const nextName = this.tryConsumeName(name);
    if (nextName && this.checkWord('ends')) {
      this.advance();
      this.expectWord('when');
      endsWhen = this.parseSceneCondition();
      this.expectDot();
    } else if (nextName && this.checkWord('begins') && beginsWhen.type === 'always') {
      this.advance();
      this.expectWord('when');
      beginsWhen = this.parseSceneCondition();
      this.expectDot();
    } else {
      this.pos = savedPos;
    }

    return { type: 'scene_decl', name, beginsWhen, endsWhen, loc };
  }

  private parseSceneCondition(): SceneCondition {
    // "play begins"
    if (this.checkWord('play')) {
      this.advance();
      this.expectWord('begins');
      return { type: 'play_begins' };
    }

    // "the player is in X"
    if (this.checkWord('the') || this.checkWord('player')) {
      const savedPos = this.pos;
      this.skipArticle();
      if (this.checkWord('player')) {
        this.advance();
        this.expectWord('is');
        if (this.checkWord('in')) {
          this.advance();
          const roomName = this.consumeNameWithArticle();
          return { type: 'player_location', roomName };
        }
      }
      this.pos = savedPos;
    }

    // Property test: "the brass lamp is lit" / "the brass lamp is not lit"
    const objectName = this.consumeNameWithArticle();
    this.expectWord('is');
    let negated = false;
    if (this.checkWord('not')) {
      this.advance();
      negated = true;
    }
    const value = this.consumeValue();
    return { type: 'property_test', objectName, propertyName: value, value, negated };
  }

  private parseSceneHandler(): SceneHandlerNode | null {
    const loc = this.peek().loc;
    this.advance(); // "when"

    // "When play begins:" → treat as an every-turn rule variant (we don't implement this yet)
    if (this.checkWord('play')) {
      const savedPos = this.pos;
      this.advance();
      if (this.checkWord('begins')) {
        this.advance();
        this.expectToken('COLON');
        const body = this.parseStatementBlock();
        return { type: 'scene_handler', sceneName: '__play', event: 'begins', body, loc };
      }
      this.pos = savedPos;
    }

    // "When Darkness ends:"
    const sceneName = this.consumeName();
    let event: 'begins' | 'ends';
    if (this.checkWord('begins')) {
      this.advance();
      event = 'begins';
    } else if (this.checkWord('ends')) {
      this.advance();
      event = 'ends';
    } else {
      throw new CompileError('Expected "begins" or "ends" after scene name', this.peek().loc);
    }

    this.expectToken('COLON');
    const body = this.parseStatementBlock();

    return { type: 'scene_handler', sceneName, event, body, loc };
  }

  // -----------------------------------------------------------------------
  // Conditions
  // -----------------------------------------------------------------------

  private parseConditions(): Condition[] {
    const conditions: Condition[] = [];
    conditions.push(this.parseCondition());

    while (this.checkWord('and')) {
      this.advance(); // "and"
      conditions.push(this.parseCondition());
    }

    return conditions;
  }

  private parseCondition(): Condition {
    const loc = this.peek().loc;

    // "the player is in X"
    if (this.checkWord('the') || this.checkWord('player')) {
      const savedPos = this.pos;
      this.skipArticle();
      if (this.checkWord('player')) {
        this.advance();
        if (this.checkWord('is')) {
          this.advance();
          if (this.checkWord('in')) {
            this.advance();
            const roomName = this.consumeNameWithArticle();
            return { type: 'player_location_test', roomName, loc };
          }
          // "the player is ..." (property test on player)
          let negated = false;
          if (this.checkWord('not')) {
            this.advance();
            negated = true;
          }
          const value = this.consumeValue();
          return { type: 'property_test', objectName: 'player', value, negated, loc };
        }
      }
      this.pos = savedPos;
    }

    // "the noun is in X" or "X is in Y" or "X is [not] value"
    const objectName = this.consumeNameWithArticle();
    this.expectWord('is');

    // "is in X" (location test)
    if (this.checkWord('in')) {
      this.advance();
      const containerName = this.consumeNameWithArticle();
      return { type: 'location_test', objectName, containerName, loc };
    }

    // "is not X" (negated property test)
    if (this.checkWord('not')) {
      this.advance();
      const value = this.consumeValue();
      return { type: 'property_test', objectName, value, negated: true, loc };
    }

    // "is X" (property test)
    const value = this.consumeValue();
    return { type: 'property_test', objectName, value, negated: false, loc };
  }

  // -----------------------------------------------------------------------
  // Statements (rule body)
  // -----------------------------------------------------------------------

  private parseStatementBlock(): Statement[] {
    const statements: Statement[] = [];
    this.skipNewlines();

    // Expect INDENT for indented blocks
    const hasIndent = this.checkToken('INDENT');
    if (hasIndent) this.advance();

    while (!this.isAtEnd()) {
      this.skipNewlines();
      if (this.isAtEnd()) break;

      // Check for DEDENT or end of block
      if (hasIndent && this.checkToken('DEDENT')) {
        this.advance();
        break;
      }

      // If no indent, read a single line of statements
      if (!hasIndent && (this.checkToken('EOF') || this.checkToken('NEWLINE'))) {
        break;
      }

      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);

      // Consume optional semicolon or dot
      if (this.checkToken('SEMICOLON')) this.advance();
      if (this.checkToken('DOT')) this.advance();

      if (!hasIndent) break;
    }

    return statements;
  }

  private parseStatement(): Statement | null {
    const loc = this.peek().loc;
    const word = this.peek().value.toLowerCase();

    // "say"
    if (word === 'say') {
      this.advance();
      const text = this.expectToken('QUOTED_STRING').value;
      return { type: 'say', text, loc };
    }

    // "now"
    if (word === 'now') {
      this.advance();
      return this.parseNowStatement(loc);
    }

    // "move"
    if (word === 'move') {
      this.advance();
      const objectName = this.consumeNameWithArticle();
      this.expectWord('to');
      const destinationName = this.consumeNameWithArticle();
      return { type: 'move', objectName, destinationName, loc };
    }

    // "remove"
    if (word === 'remove') {
      this.advance();
      const objectName = this.consumeNameWithArticle();
      // Optional "from ..."
      if (this.checkWord('from')) {
        this.advance();
        this.consumeNameWithArticle(); // consume but ignore for now
      }
      return { type: 'remove', objectName, loc };
    }

    // "stop"
    if (word === 'stop') {
      this.advance();
      return { type: 'stop', loc };
    }

    throw new CompileError(`Unknown statement "${word}"`, loc);
  }

  private parseNowStatement(loc: SourceLocation): NowStatement {
    // "now the X is Y" / "now the X is not Y"
    // "now the noun is carried by the player" → simplified
    const objectName = this.consumeNameWithArticle();
    this.expectWord('is');

    // Handle "is not" for boolean false
    if (this.checkWord('not')) {
      this.advance();
      const propName = this.consumeValue();
      return { type: 'now', objectName, propertyName: propName, value: 'false', loc };
    }

    // Handle "is carried by the player" → move to player
    if (this.checkWord('carried')) {
      this.advance(); // "carried"
      this.expectWord('by');
      this.consumeNameWithArticle(); // "the player"
      return { type: 'now', objectName, propertyName: '__carried', value: 'player', loc };
    }

    const value = this.consumeValue();
    return { type: 'now', objectName, propertyName: value, value: 'true', loc };
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private peek(): Token {
    if (this.pos >= this.tokens.length) {
      return { type: 'EOF', value: '', loc: { line: 0, col: 0 } };
    }
    return this.tokens[this.pos];
  }

  private peekAt(offset: number): Token {
    const idx = this.pos + offset;
    if (idx >= this.tokens.length) {
      return { type: 'EOF', value: '', loc: { line: 0, col: 0 } };
    }
    return this.tokens[idx];
  }

  private advance(): Token {
    const token = this.peek();
    this.pos++;
    return token;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length || this.peek().type === 'EOF';
  }

  private checkWord(word: string): boolean {
    const t = this.peek();
    return t.type === 'WORD' && t.value.toLowerCase() === word.toLowerCase();
  }

  private checkToken(type: TokenType): boolean {
    return this.peek().type === type;
  }

  private expectWord(word: string): Token {
    const t = this.peek();
    if (t.type !== 'WORD' || t.value.toLowerCase() !== word.toLowerCase()) {
      throw new CompileError(`Expected "${word}", got "${t.value}"`, t.loc);
    }
    return this.advance();
  }

  private expectWordAny(): string {
    const t = this.peek();
    if (t.type !== 'WORD') {
      throw new CompileError(`Expected a word, got ${t.type}`, t.loc);
    }
    this.advance();
    return t.value;
  }

  private expectToken(type: TokenType): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new CompileError(`Expected ${type}, got ${t.type} ("${t.value}")`, t.loc);
    }
    return this.advance();
  }

  private expectDot(): void {
    if (this.checkToken('DOT')) {
      this.advance();
    }
    // Lenient: don't error if dot missing at end of line
  }

  private skipArticle(): void {
    if (this.peek().type === 'WORD') {
      const w = this.peek().value.toLowerCase();
      if (w === 'a' || w === 'an' || w === 'the' || w === 'some') {
        this.advance();
      }
    }
  }

  private skipNewlines(): void {
    while (!this.isAtEnd() && this.peek().type === 'NEWLINE') {
      this.advance();
    }
  }

  /** Consume a multi-word name, stopping at structural boundaries. */
  private consumeName(): string {
    const words: string[] = [];
    while (!this.isAtEnd() && this.peek().type === 'WORD') {
      const w = this.peek().value.toLowerCase();
      // Stop at structural keywords
      if (isStructuralKeyword(w)) break;
      words.push(this.advance().value);
    }
    return words.join(' ');
  }

  /** Like consumeName but skips a leading article first. */
  private consumeNameWithArticle(): string {
    this.skipArticle();
    return this.consumeName();
  }

  /** Try to consume a specific known name. Returns null if it doesn't match. */
  private tryConsumeName(expected: string): string | null {
    const savedPos = this.pos;
    const words = expected.split(' ');
    for (const word of words) {
      if (!this.checkWord(word)) {
        this.pos = savedPos;
        return null;
      }
      this.advance();
    }
    return expected;
  }

  /** Consume a value — a word, number, or quoted string. */
  private consumeValue(): string {
    if (this.peek().type === 'QUOTED_STRING') {
      return this.advance().value;
    }
    if (this.peek().type === 'NUMBER') {
      return this.advance().value;
    }
    // Word(s) — consume single word as value
    if (this.peek().type === 'WORD') {
      return this.advance().value;
    }
    throw new CompileError(`Expected a value, got ${this.peek().type}`, this.peek().loc);
  }

  private consumePropertyType(): 'truth_state' | 'number' | 'text' {
    if (this.checkWord('truth')) {
      this.advance();
      this.expectWord('state');
      return 'truth_state';
    }
    if (this.checkWord('number')) {
      this.advance();
      return 'number';
    }
    if (this.checkWord('text')) {
      this.advance();
      return 'text';
    }
    throw new CompileError(
      `Expected property type (truth state, number, or text), got "${this.peek().value}"`,
      this.peek().loc,
    );
  }

  private peekIsDirection(): boolean {
    return this.peek().type === 'WORD' && DIRECTIONS.has(this.peek().value.toLowerCase());
  }

  private skipToNextSentence(): void {
    while (!this.isAtEnd()) {
      const t = this.advance();
      if (t.type === 'DOT' || t.type === 'NEWLINE') {
        this.skipNewlines();
        return;
      }
    }
  }
}

/** Check if a word is a structural keyword that terminates name consumption. */
function isStructuralKeyword(word: string): boolean {
  const kw = new Set([
    'is', 'has', 'in', 'when', 'and', 'called', 'usually', 'of',
    'to', 'from', 'by', 'with', 'begins', 'ends', 'not',
    ...DIRECTIONS,
  ]);
  return kw.has(word);
}
