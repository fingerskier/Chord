/**
 * WorldDB — the database-backed world model.
 *
 * All game state lives in a libsql database. This class provides
 * typed helpers that compiled rules and the runtime use to query
 * and mutate the world.
 */

import Database from 'libsql';
import type { Thing, WorldDBInterface } from './types.js';
import { SCHEMA_SQL, SEED_SQL } from './schema.js';

export class WorldDB implements WorldDBInterface {
  private db: Database.Database;

  constructor(path: string = ':memory:') {
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /** Initialize schema and seed data. */
  initialize(): void {
    this.db.exec(SCHEMA_SQL);
    this.db.exec(SEED_SQL);
  }

  // -----------------------------------------------------------------------
  // Object queries
  // -----------------------------------------------------------------------

  getObject(id: string): Thing | null {
    const row = this.db.prepare(
      'SELECT id, kind, location, description FROM objects WHERE id = ?'
    ).get(id) as Thing | undefined;
    return row ?? null;
  }

  getProperty(objectId: string, key: string): string | null {
    const row = this.db.prepare(
      'SELECT value FROM properties WHERE object_id = ? AND key = ?'
    ).get(objectId, key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setProperty(objectId: string, key: string, value: string): void {
    this.db.prepare(
      `INSERT INTO properties (object_id, key, value, type)
       VALUES (?, ?, ?, 'text')
       ON CONFLICT(object_id, key) DO UPDATE SET value = excluded.value`
    ).run(objectId, key, value);
  }

  getLocation(objectId: string): string | null {
    const row = this.db.prepare(
      'SELECT location FROM objects WHERE id = ?'
    ).get(objectId) as { location: string | null } | undefined;
    return row?.location ?? null;
  }

  moveTo(objectId: string, locationId: string): void {
    this.db.prepare(
      'UPDATE objects SET location = ? WHERE id = ?'
    ).run(locationId, objectId);
  }

  removeFrom(objectId: string): void {
    this.db.prepare(
      'UPDATE objects SET location = NULL WHERE id = ?'
    ).run(objectId);
  }

  getContents(locationId: string): Thing[] {
    return this.db.prepare(
      'SELECT id, kind, location, description FROM objects WHERE location = ?'
    ).all(locationId) as Thing[];
  }

  getExit(roomId: string, direction: string): string | null {
    const row = this.db.prepare(
      'SELECT to_room FROM exits WHERE from_room = ? AND direction = ?'
    ).get(roomId, direction) as { to_room: string } | undefined;
    return row?.to_room ?? null;
  }

  // -----------------------------------------------------------------------
  // Kind hierarchy
  // -----------------------------------------------------------------------

  isKindOf(objectId: string, kindName: string): boolean {
    const obj = this.getObject(objectId);
    if (!obj) return false;
    if (obj.kind === kindName) return true;

    // Walk the kind hierarchy
    let current = obj.kind;
    while (current) {
      const row = this.db.prepare(
        'SELECT parent FROM kinds WHERE name = ?'
      ).get(current) as { parent: string | null } | undefined;
      if (!row?.parent) return false;
      if (row.parent === kindName) return true;
      current = row.parent;
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Scope: what can the player interact with?
  // -----------------------------------------------------------------------

  getScope(actorId: string): Thing[] {
    // Returns: actor's location + everything reachable from that location
    // + actor's inventory (things directly carried by actor)
    return this.db.prepare(`
      WITH RECURSIVE reachable(id) AS (
        -- Start with the actor's location
        SELECT location FROM objects WHERE id = ?1
        UNION ALL
        -- Add everything inside reachable containers
        SELECT o.id FROM objects o
        JOIN reachable r ON o.location = r.id
      )
      -- Objects reachable from location
      SELECT o.id, o.kind, o.location, o.description FROM objects o
      JOIN reachable r ON o.id = r.id
      WHERE o.id != ?1
      UNION
      -- Actor's inventory
      SELECT o.id, o.kind, o.location, o.description FROM objects o
      WHERE o.location = ?1
    `).all(actorId) as Thing[];
  }

  // -----------------------------------------------------------------------
  // Meta / turn counter
  // -----------------------------------------------------------------------

  getTurn(): number {
    const row = this.db.prepare(
      "SELECT value FROM meta WHERE key = 'turn'"
    ).get() as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : 0;
  }

  incrementTurn(): void {
    this.db.prepare(
      "UPDATE meta SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT) WHERE key = 'turn'"
    ).run();
  }

  // -----------------------------------------------------------------------
  // Scene management
  // -----------------------------------------------------------------------

  isSceneActive(name: string): boolean {
    const row = this.db.prepare(
      'SELECT active FROM scenes WHERE name = ?'
    ).get(name) as { active: number } | undefined;
    return row?.active === 1;
  }

  setSceneActive(name: string, active: boolean): void {
    this.db.prepare(
      `INSERT INTO scenes (name, active) VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET active = excluded.active`
    ).run(name, active ? 1 : 0);
  }

  // -----------------------------------------------------------------------
  // Raw SQL access for compiled rules
  // -----------------------------------------------------------------------

  exec(sql: string): void {
    this.db.exec(sql);
  }

  queryValue(sql: string, ...params: unknown[]): unknown {
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    const keys = Object.keys(row);
    return keys.length > 0 ? row[keys[0]] : undefined;
  }

  queryRow(sql: string, ...params: unknown[]): Record<string, unknown> | null {
    const row = this.db.prepare(sql).get(...params) as Record<string, unknown> | undefined;
    return row ?? null;
  }

  queryAll(sql: string, ...params: unknown[]): Record<string, unknown>[] {
    return this.db.prepare(sql).all(...params) as Record<string, unknown>[];
  }

  // -----------------------------------------------------------------------
  // Transaction helpers (used by the turn loop)
  // -----------------------------------------------------------------------

  savepoint(name: string): void {
    this.db.exec(`SAVEPOINT ${name}`);
  }

  release(name: string): void {
    this.db.exec(`RELEASE ${name}`);
  }

  rollbackTo(name: string): void {
    this.db.exec(`ROLLBACK TO ${name}`);
  }

  /** Close the database connection. */
  close(): void {
    this.db.close();
  }
}
