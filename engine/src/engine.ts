/**
 * Engine — the main API surface for the Chord interactive fiction engine.
 *
 * Creates and wires together the WorldDB, RulebookRegistry, and Runtime.
 * Stories are loaded by seeding the database with objects, exits, and
 * properties, then optionally registering additional compiled rules.
 */

import { WorldDB } from './world-db.js';
import { RulebookRegistry } from './rulebook-registry.js';
import { Runtime } from './runtime.js';
import { registerDefaultRules } from './rulebooks/index.js';
import type {
  Rule,
  EveryTurnRule,
  SceneDefinition,
  Thing,
  ErrorContext,
} from './types.js';

export interface EngineOptions {
  /** Path to the database file. Defaults to ':memory:'. */
  dbPath?: string;
  /** If true, skip registering default rules. */
  skipDefaultRules?: boolean;
}

export class Engine {
  readonly db: WorldDB;
  readonly registry: RulebookRegistry;
  private runtime: Runtime;

  constructor(options: EngineOptions = {}) {
    this.db = new WorldDB(options.dbPath ?? ':memory:');
    this.db.initialize();

    this.registry = new RulebookRegistry();
    if (!options.skipDefaultRules) {
      registerDefaultRules(this.registry);
    }

    this.runtime = new Runtime(this.db, this.registry);
  }

  // -----------------------------------------------------------------------
  // World building API
  // -----------------------------------------------------------------------

  /** Register a new kind in the hierarchy. */
  addKind(name: string, parent: string = 'thing'): void {
    this.db.exec(
      `INSERT OR IGNORE INTO kinds (name, parent) VALUES ('${esc(name)}', '${esc(parent)}')`
    );
  }

  /** Create an object in the world. */
  addObject(id: string, kind: string, location?: string, description?: string): void {
    const locVal = location ? `'${esc(location)}'` : 'NULL';
    const descVal = description ? `'${esc(description)}'` : "''";
    this.db.exec(
      `INSERT OR IGNORE INTO objects (id, kind, location, description)
       VALUES ('${esc(id)}', '${esc(kind)}', ${locVal}, ${descVal})`
    );
  }

  /** Set a property on an object. */
  setProperty(objectId: string, key: string, value: string): void {
    this.db.setProperty(objectId, key, value);
  }

  /** Create a directional exit between two rooms. */
  addExit(fromRoom: string, direction: string, toRoom: string): void {
    this.db.exec(
      `INSERT OR IGNORE INTO exits (from_room, direction, to_room)
       VALUES ('${esc(fromRoom)}', '${esc(direction)}', '${esc(toRoom)}')`
    );
  }

  /** Create a bidirectional exit between two rooms. */
  addBidirectionalExit(
    roomA: string,
    direction: string,
    roomB: string,
    reverseDirection: string,
  ): void {
    this.addExit(roomA, direction, roomB);
    this.addExit(roomB, reverseDirection, roomA);
  }

  /** Place the player in a room. */
  placePlayer(roomId: string): void {
    this.db.moveTo('player', roomId);
  }

  // -----------------------------------------------------------------------
  // Rule registration API
  // -----------------------------------------------------------------------

  registerRule(verb: string, rule: Rule): void {
    this.registry.registerRule(verb, rule);
  }

  registerEveryTurnRule(rule: EveryTurnRule): void {
    this.registry.registerEveryTurnRule(rule);
  }

  registerScene(scene: SceneDefinition): void {
    this.registry.registerScene(scene);
  }

  // -----------------------------------------------------------------------
  // Gameplay API
  // -----------------------------------------------------------------------

  /** Process a player command. Returns text output lines. */
  turn(input: string): string[] {
    return this.runtime.turn(input);
  }

  /** Get the current turn number. */
  getTurn(): number {
    return this.db.getTurn();
  }

  /** Get an object by id. */
  getObject(id: string): Thing | null {
    return this.db.getObject(id);
  }

  /** Generate a "look" description of the player's current location. */
  look(): string[] {
    return this.runtime.turn('look');
  }

  // -----------------------------------------------------------------------
  // Error reporting API (ARCH.md D8 — fail-safe with provenance)
  // -----------------------------------------------------------------------

  /** Get all runtime errors logged since last clear. */
  getRuntimeErrors(): ErrorContext[] {
    return this.runtime.getErrors();
  }

  /** Clear the runtime error log. */
  clearRuntimeErrors(): void {
    this.runtime.clearErrors();
  }

  /** Shut down the engine and close the database. */
  close(): void {
    this.db.close();
  }
}

/** Escape single quotes for SQL string literals. */
function esc(s: string): string {
  return s.replace(/'/g, "''");
}
