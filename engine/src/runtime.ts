/**
 * Runtime — the turn loop, rule cascade, and scene processing.
 *
 * Each player action opens a database savepoint. The cascade
 * runs through six phases: before → instead → check → carry_out
 * → after → report. If the action is blocked (instead/check stop),
 * the savepoint is rolled back. Otherwise it is released (committed).
 *
 * Per ARCH.md D8 (fail-safe with provenance): individual rule
 * exceptions are caught, logged with provenance, and treated as
 * "no decision" so the cascade continues.
 */

import type { Action, Phase, RulebookRegistry, ErrorContext } from './types.js';
import type { WorldDB } from './world-db.js';
import { parse } from './parser.js';

const CASCADE: Phase[] = [
  'before', 'instead', 'check', 'carry_out', 'after', 'report',
];

const MAX_REDIRECT_DEPTH = 100;

export class Runtime {
  private errorLog: ErrorContext[] = [];
  private depth = 0;

  constructor(
    private db: WorldDB,
    private registry: RulebookRegistry,
  ) {}

  /**
   * Execute a single turn from raw player input.
   * Returns the text output lines for this turn.
   */
  turn(input: string): string[] {
    const action = parse(input, this.db);
    if (!action) return ["I didn't understand that."];

    return this.executeAction(action);
  }

  /**
   * Execute an action through the full cascade.
   * This is separated from `turn` so rules can programmatically
   * trigger actions via `try`.
   */
  executeAction(action: Action): string[] {
    if (this.depth >= MAX_REDIRECT_DEPTH) {
      this.errorLog.push({
        verb: action.verb,
        detail: `Maximum redirect depth (${MAX_REDIRECT_DEPTH}) exceeded — possible infinite loop.`,
      });
      return ['[An internal error occurred.]'];
    }

    this.depth++;
    const output: string[] = [];
    this.db.savepoint('turn');

    try {
      for (const phase of CASCADE) {
        const rulebook = this.registry.getRulebook(phase, action.verb);

        for (const rule of rulebook) {
          try {
            if (rule.condition(this.db, action)) {
              const result = rule.body(this.db, action);
              if (result.output) output.push(result.output);

              if (result.outcome === 'stop') {
                if (phase === 'instead' || phase === 'check') {
                  // Action blocked — rollback
                  this.db.rollbackTo('turn');
                  this.db.release('turn');
                  this.depth--;
                  return output;
                }
                // Stop this phase, continue cascade
                break;
              }

              if (result.outcome === 'replace' && result.redirect) {
                // Redirect to a different action
                this.db.rollbackTo('turn');
                this.db.release('turn');
                const redirectOutput = this.executeAction(result.redirect);
                this.depth--;
                return redirectOutput;
              }
            }
          } catch (e) {
            this.errorLog.push({
              ruleName: rule.name,
              phase,
              verb: action.verb,
              detail: e instanceof Error ? e.message : String(e),
            });
            // Treat as "no decision" — continue to next rule
          }
        }
      }

      // Every-turn rules
      for (const rule of this.registry.getEveryTurnRules()) {
        try {
          if (rule.condition(this.db, action)) {
            const result = rule.body(this.db, action);
            if (result.output) output.push(result.output);
          }
        } catch (e) {
          this.errorLog.push({
            ruleName: rule.name,
            detail: e instanceof Error ? e.message : String(e),
          });
        }
      }

      // Scene transitions
      this.processScenes(output);

      // Commit the turn
      this.db.release('turn');
      this.db.incrementTurn();
    } catch (e) {
      this.db.rollbackTo('turn');
      this.db.release('turn');
      throw e;
    }

    this.depth--;
    return output;
  }

  /** Check scene begin/end conditions and fire callbacks. */
  private processScenes(output: string[]): void {
    for (const scene of this.registry.getSceneDefinitions()) {
      try {
        const wasActive = this.db.isSceneActive(scene.name);

        if (!wasActive && scene.beginsWhen(this.db)) {
          this.db.setSceneActive(scene.name, true);
          const text = scene.onBegin?.(this.db);
          if (text) output.push(text);
        } else if (wasActive && scene.endsWhen(this.db)) {
          this.db.setSceneActive(scene.name, false);
          const text = scene.onEnd?.(this.db);
          if (text) output.push(text);
        }
      } catch (e) {
        this.errorLog.push({
          detail: `Scene "${scene.name}": ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }
  }

  /** Get all errors logged since last clear. */
  getErrors(): ErrorContext[] {
    return [...this.errorLog];
  }

  /** Clear the error log. */
  clearErrors(): void {
    this.errorLog = [];
  }
}
