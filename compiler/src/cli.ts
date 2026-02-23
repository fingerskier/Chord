#!/usr/bin/env node
/**
 * CLI entry point for the Chord story compiler.
 *
 * Usage:
 *   chord-compile <input.chord> [--outdir <dir>] [--outfile <name>] [--check]
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { compile } from './compiler.js';

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  let inputFile: string | null = null;
  let outDir: string | null = null;
  let outFile: string | null = null;
  let checkOnly = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--outdir' && i + 1 < args.length) {
      outDir = args[++i];
    } else if (arg === '--outfile' && i + 1 < args.length) {
      outFile = args[++i];
    } else if (arg === '--check') {
      checkOnly = true;
    } else if (!arg.startsWith('-')) {
      inputFile = arg;
    } else {
      console.error(`Unknown option: ${arg}`);
      process.exit(1);
    }
  }

  if (!inputFile) {
    console.error('Error: no input file specified.');
    printUsage();
    process.exit(1);
  }

  // Read source
  let source: string;
  try {
    source = fs.readFileSync(inputFile, 'utf-8');
  } catch (e) {
    console.error(`Error: could not read "${inputFile}": ${(e as Error).message}`);
    process.exit(1);
  }

  // Compile
  const result = compile(source, { checkOnly });

  // Report errors
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      console.error(`${inputFile}:${err.message}`);
    }
    process.exit(1);
  }

  if (checkOnly) {
    console.log('OK — no errors found.');
    process.exit(0);
  }

  // Write output
  const resolvedOutDir = outDir ?? path.dirname(inputFile);
  const baseName = outFile ?? path.basename(inputFile).replace(/\.\w+$/, '') + '.ts';
  const outputPath = path.join(resolvedOutDir, baseName);

  fs.mkdirSync(resolvedOutDir, { recursive: true });
  fs.writeFileSync(outputPath, result.code, 'utf-8');

  console.log(`Compiled: ${inputFile} → ${outputPath}`);
}

function printUsage(): void {
  console.log(`
Usage: chord-compile <input.chord> [options]

Options:
  --outdir <dir>    Output directory (default: same as input)
  --outfile <name>  Output filename (default: <input>.ts)
  --check           Parse and validate only, no code output
  -h, --help        Show this help message
`.trim());
}

main();
