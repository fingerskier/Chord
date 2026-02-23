/**
 * MVP Parser — simple verb-noun matcher.
 *
 * Resolves player input against objects currently in scope.
 * This is NOT a full natural-language parser; it is a
 * deterministic word matcher sufficient for the MVP.
 */

import type { Action, Thing, WorldDBInterface } from './types.js';
import { DIRECTIONS, type Direction } from './types.js';

// ---------------------------------------------------------------------------
// Verb synonyms → canonical verb
// ---------------------------------------------------------------------------

const VERB_MAP: Record<string, string> = {
  // Movement
  go: 'go',
  walk: 'go',
  move: 'go',
  // Directions as verbs
  north: 'go', south: 'go', east: 'go', west: 'go',
  up: 'go', down: 'go',
  northeast: 'go', northwest: 'go', southeast: 'go', southwest: 'go',
  n: 'go', s: 'go', e: 'go', w: 'go',
  ne: 'go', nw: 'go', se: 'go', sw: 'go',
  u: 'go', d: 'go',
  // Taking
  take: 'take', get: 'take', grab: 'take', pick: 'take',
  // Dropping
  drop: 'drop', discard: 'drop',
  // Looking
  look: 'look', l: 'look',
  // Examining
  examine: 'examine', x: 'examine', inspect: 'examine',
  // Inventory
  inventory: 'inventory', i: 'inventory',
  // Opening / closing
  open: 'open',
  close: 'close', shut: 'close',
  // Putting
  put: 'put', place: 'put', insert: 'put',
};

/** Direction abbreviation → full direction name. */
const DIR_ABBREV: Record<string, Direction> = {
  n: 'north', s: 'south', e: 'east', w: 'west',
  u: 'up', d: 'down',
  ne: 'northeast', nw: 'northwest',
  se: 'southeast', sw: 'southwest',
};

function isDirection(word: string): boolean {
  return (DIRECTIONS as readonly string[]).includes(word) || word in DIR_ABBREV;
}

function resolveDirection(word: string): Direction {
  if ((DIRECTIONS as readonly string[]).includes(word)) return word as Direction;
  return DIR_ABBREV[word];
}

// ---------------------------------------------------------------------------
// Noun resolution
// ---------------------------------------------------------------------------

/**
 * Match a noun phrase against objects in scope.
 * Uses a simple substring/word-match approach.
 */
function resolveNoun(nounPhrase: string, scope: Thing[]): Thing | null {
  if (!nounPhrase) return null;

  const phrase = nounPhrase.toLowerCase().replace(/^(the|a|an|some)\s+/i, '');

  // Exact id match
  const byId = scope.find(t => t.id === phrase.replace(/\s+/g, '_'));
  if (byId) return byId;

  // Exact id match with underscores for spaces
  const normalized = phrase.replace(/\s+/g, '_');
  const byNormalized = scope.find(t => t.id === normalized);
  if (byNormalized) return byNormalized;

  // Substring match on id (with underscores)
  const bySubstring = scope.find(t =>
    t.id.includes(normalized) || normalized.includes(t.id)
  );
  if (bySubstring) return bySubstring;

  // Word overlap scoring
  const phraseWords = phrase.split(/\s+/);
  let bestMatch: Thing | null = null;
  let bestScore = 0;

  for (const thing of scope) {
    const idWords = thing.id.split('_');
    let score = 0;
    for (const pw of phraseWords) {
      if (idWords.some(iw => iw === pw)) score += 2;
      else if (idWords.some(iw => iw.startsWith(pw) || pw.startsWith(iw))) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = thing;
    }
  }

  return bestScore > 0 ? bestMatch : null;
}

// ---------------------------------------------------------------------------
// Preposition handling for two-noun commands
// ---------------------------------------------------------------------------

const PREPOSITIONS = ['in', 'into', 'on', 'onto', 'inside', 'with'];

function splitOnPreposition(words: string[]): { before: string; prep: string; after: string } | null {
  for (let i = 0; i < words.length; i++) {
    if (PREPOSITIONS.includes(words[i])) {
      return {
        before: words.slice(0, i).join(' '),
        prep: words[i],
        after: words.slice(i + 1).join(' '),
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main parse function
// ---------------------------------------------------------------------------

export function parse(input: string, db: WorldDBInterface): Action | null {
  const words = input.trim().toLowerCase().split(/\s+/);
  if (words.length === 0 || words[0] === '') return null;

  const firstWord = words[0];

  // Direction as entire command (e.g., "north", "n")
  if (isDirection(firstWord) && words.length === 1) {
    return { verb: 'go', actor: 'player', noun: resolveDirection(firstWord) };
  }

  // Direction as verb with no further noun expected
  if (isDirection(firstWord)) {
    return { verb: 'go', actor: 'player', noun: resolveDirection(firstWord) };
  }

  const verb = VERB_MAP[firstWord];
  if (!verb) return null;

  // "go <direction>"
  if (verb === 'go' && words.length > 1) {
    const dirWord = words[1];
    if (isDirection(dirWord)) {
      return { verb: 'go', actor: 'player', noun: resolveDirection(dirWord) };
    }
    // "go" without a valid direction
    return null;
  }

  // No-noun verbs
  if (verb === 'look' || verb === 'inventory') {
    return { verb, actor: 'player' };
  }

  // Get scope for noun resolution
  const scope = db.getScope('player');
  const restWords = words.slice(1);

  // Skip "up" in "pick up X"
  if (firstWord === 'pick' && restWords[0] === 'up') {
    restWords.shift();
  }

  // Two-noun commands (put X in Y)
  if (verb === 'put' && restWords.length > 0) {
    const split = splitOnPreposition(restWords);
    if (split) {
      const noun = resolveNoun(split.before, scope);
      const second = resolveNoun(split.after, scope);
      if (noun && second) {
        return { verb, actor: 'player', noun: noun.id, second: second.id };
      }
    }
  }

  // Single-noun commands
  const nounPhrase = restWords.join(' ');
  const noun = resolveNoun(nounPhrase, scope);

  return { verb, actor: 'player', noun: noun?.id };
}
