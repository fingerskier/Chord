/**
 * Utility functions for the Chord compiler.
 */

/** Convert a display name to a snake_case ID: "The Dark Cave" → "dark_cave" */
export function nameToId(name: string): string {
  return name
    .replace(/^(the|a|an|some)\s+/i, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Escape single quotes for TypeScript string literals. */
export function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

/** Convert a gerund to infinitive: "taking" → "take", "dropping" → "drop". */
export function gerundToInfinitive(gerund: string): string {
  const irregulars: Record<string, string> = {
    'taking': 'take',
    'dropping': 'drop',
    'going': 'go',
    'looking': 'look',
    'examining': 'examine',
    'opening': 'open',
    'closing': 'close',
    'putting': 'put',
  };

  const lower = gerund.toLowerCase();
  if (irregulars[lower]) return irregulars[lower];

  // General rules
  if (lower.endsWith('ting') && lower.length > 4) {
    // "putting" → "put" (doubled consonant)
    const base = lower.slice(0, -4);
    if (base.length >= 2 && base[base.length - 1] === base[base.length - 2]) {
      return base.slice(0, -1);
    }
  }
  if (lower.endsWith('ing')) {
    const base = lower.slice(0, -3);
    // Try adding 'e' back: "taking" → "tak" + "e" = "take"
    if (base.length >= 2) {
      return base + 'e';
    }
    return base;
  }
  return lower;
}

/** All valid directions. */
export const DIRECTIONS = new Set([
  'north', 'south', 'east', 'west',
  'up', 'down',
  'northeast', 'northwest', 'southeast', 'southwest',
]);

/** Reverse direction mapping for bidirectional exits. */
export const REVERSE_DIRECTIONS: Record<string, string> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  up: 'down',
  down: 'up',
  northeast: 'southwest',
  southwest: 'northeast',
  northwest: 'southeast',
  southeast: 'northwest',
};

/** Structural keywords that terminate a multi-word name in the parser. */
export const STRUCTURAL_KEYWORDS = new Set([
  'is', 'has', 'in', 'when', 'and', 'called', 'usually',
  ...DIRECTIONS,
]);

/** Phase keywords that start a rule. */
export const PHASE_KEYWORDS = new Set([
  'before', 'instead', 'check', 'carry', 'after', 'report',
]);
