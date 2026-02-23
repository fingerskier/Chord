/**
 * Database schema initialization for the Chord engine.
 *
 * Creates the core tables that back the world model.
 * All world state lives in these tables — there is no
 * separate in-memory model.
 */

/** SQL statements that create the world-model schema. */
export const SCHEMA_SQL = `
-- Kind hierarchy
CREATE TABLE IF NOT EXISTS kinds (
    name        TEXT PRIMARY KEY,
    parent      TEXT REFERENCES kinds(name)
);

-- All game objects
CREATE TABLE IF NOT EXISTS objects (
    id          TEXT PRIMARY KEY,
    kind        TEXT NOT NULL REFERENCES kinds(name),
    location    TEXT REFERENCES objects(id),
    description TEXT DEFAULT ''
);

-- Flexible property store
CREATE TABLE IF NOT EXISTS properties (
    object_id   TEXT NOT NULL REFERENCES objects(id),
    key         TEXT NOT NULL,
    value       TEXT,
    type        TEXT NOT NULL DEFAULT 'text',
    PRIMARY KEY (object_id, key)
);

-- Map connections between rooms
CREATE TABLE IF NOT EXISTS exits (
    from_room   TEXT NOT NULL REFERENCES objects(id),
    direction   TEXT NOT NULL,
    to_room     TEXT NOT NULL REFERENCES objects(id),
    PRIMARY KEY (from_room, direction)
);

-- Arbitrary named relations
CREATE TABLE IF NOT EXISTS relations (
    subject_id  TEXT NOT NULL REFERENCES objects(id),
    rel_type    TEXT NOT NULL,
    object_id   TEXT NOT NULL REFERENCES objects(id),
    PRIMARY KEY (subject_id, rel_type, object_id)
);

-- Scene state
CREATE TABLE IF NOT EXISTS scenes (
    name        TEXT PRIMARY KEY,
    active      INTEGER NOT NULL DEFAULT 0
);

-- Turn counter and metadata
CREATE TABLE IF NOT EXISTS meta (
    key         TEXT PRIMARY KEY,
    value       TEXT
);
`;

/** Seed the base kind hierarchy and essential metadata. */
export const SEED_SQL = `
-- Base kind: everything is a thing
INSERT OR IGNORE INTO kinds (name, parent) VALUES ('thing', NULL);
INSERT OR IGNORE INTO kinds (name, parent) VALUES ('room', 'thing');
INSERT OR IGNORE INTO kinds (name, parent) VALUES ('container', 'thing');
INSERT OR IGNORE INTO kinds (name, parent) VALUES ('person', 'thing');

-- Turn counter starts at 0
INSERT OR IGNORE INTO meta (key, value) VALUES ('turn', '0');

-- Player object
INSERT OR IGNORE INTO objects (id, kind, location, description)
    VALUES ('player', 'person', NULL, 'You.');
`;
