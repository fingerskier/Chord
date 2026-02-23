/**
 * Runtime — the turn loop, rule cascade, and scene processing.
 *
 * Each player action opens a database savepoint. The cascade
 * runs through six phases: before → instead → check → carry_out
 * → after → report. If the action is blocked (instead/check stop),
 * the savepoint is rolled back. Otherwise it is released (committed).
 */

import type { Action, Phase, RulebookRegistry } from './types.js';
import type { WorldDB } from './world-db.js';
import { parse } from './parser.js';

const CASCADE: Phase[] = [
  'before', 'instead', 'check', 'carry_out', 'after', 'report',
];

export class Runtime {
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
    const output: string[] = [];
    this.db.savepoint('turn');

    try {
      for (const phase of CASCADE) {
        const rulebook = this.registry.getRulebook(phase, action.verb);

        for (const rule of rulebook) {
          if (rule.condition(this.db, action)) {
            const result = rule.body(this.db, action);
            if (result.output) output.push(result.output);

            if (result.outcome === 'stop') {
              if (phase === 'instead' || phase === 'check') {
                // Action blocked — rollback
                this.db.rollbackTo('turn');
                this.db.release('turn');
                return output;
              }
              // Stop this phase, continue cascade
              break;
            }

            if (result.outcome === 'replace' && result.redirect) {
              // Redirect to a different action
              this.db.rollbackTo('turn');
              this.db.release('turn');
              return this.executeAction(result.redirect);
            }
          }
        }
      }

      // Every-turn rules
      for (const rule of this.registry.getEveryTurnRules()) {
        if (rule.condition(this.db, action)) {
          const result = rule.body(this.db, action);
          if (result.output) output.push(result.output);
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

    return output;
  }

  /** Check scene begin/end conditions and fire callbacks. */
  private processScenes(output: string[]): void {
    for (const scene of this.registry.getSceneDefinitions()) {
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
    }
  }
}
