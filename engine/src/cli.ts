/**
 * CLI REPL — interactive play from the terminal.
 *
 * Loads a demo story (the Dark Cave example from MVP.md)
 * and presents a standard text-adventure prompt.
 */

import * as readline from 'node:readline';
import { Engine } from './engine.js';
import { loadDemoStory } from './demo-story.js';

function main(): void {
  const engine = new Engine();
  loadDemoStory(engine);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Initial look
  console.log('');
  console.log('=== Chord Engine MVP ===');
  console.log('');
  for (const line of engine.look()) {
    console.log(line);
  }
  console.log('');

  const prompt = () => {
    rl.question('> ', (input) => {
      const trimmed = input.trim();
      if (trimmed === 'quit' || trimmed === 'exit') {
        console.log('Goodbye.');
        engine.close();
        rl.close();
        return;
      }

      const output = engine.turn(trimmed);
      for (const line of output) {
        console.log(line);
      }
      console.log('');
      prompt();
    });
  };

  prompt();
}

main();
