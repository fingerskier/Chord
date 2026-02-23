/**
 * CLI story runner — play any sample story interactively.
 *
 * Usage: npx tsx test/story-runner.ts <story-name>
 */

import * as readline from 'node:readline';
import { Engine } from '../src/engine.js';
import { STORIES } from './stories/index.js';

function main(): void {
  const storyName = process.argv[2];

  if (!storyName || !STORIES[storyName]) {
    console.log('Usage: npx tsx test/story-runner.ts <story-name>');
    console.log('');
    console.log('Available stories:');
    for (const name of Object.keys(STORIES)) {
      console.log(`  ${name}`);
    }
    process.exit(1);
  }

  const engine = new Engine();
  STORIES[storyName](engine);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('');
  console.log(`=== ${storyName} ===`);
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
