/**
 * RulebookRegistry — manages all rules, every-turn rules, and scenes.
 *
 * Rules are stored per-verb and sorted by priority (highest first).
 * The runtime queries this registry during the cascade.
 */

import type {
  Phase,
  Rule,
  EveryTurnRule,
  SceneDefinition,
  RulebookRegistry as IRulebookRegistry,
} from './types.js';

export class RulebookRegistry implements IRulebookRegistry {
  /** verb → rules sorted by priority descending. */
  private rules = new Map<string, Rule[]>();
  private everyTurnRules: EveryTurnRule[] = [];
  private scenes: SceneDefinition[] = [];

  registerRule(verb: string, rule: Rule): void {
    const list = this.rules.get(verb) ?? [];
    list.push(rule);
    // Re-sort by priority descending (highest first)
    list.sort((a, b) => b.priority - a.priority);
    this.rules.set(verb, list);
  }

  registerEveryTurnRule(rule: EveryTurnRule): void {
    this.everyTurnRules.push(rule);
    this.everyTurnRules.sort((a, b) => b.priority - a.priority);
  }

  registerScene(scene: SceneDefinition): void {
    this.scenes.push(scene);
  }

  getRulebook(phase: Phase, verb: string): Rule[] {
    const all = this.rules.get(verb) ?? [];
    return all.filter(r => r.phase === phase);
  }

  getEveryTurnRules(): EveryTurnRule[] {
    return this.everyTurnRules;
  }

  getSceneDefinitions(): SceneDefinition[] {
    return this.scenes;
  }
}
