# Repository Guidelines

## Project Structure & Module Organization
This repository is split into two TypeScript packages: `compiler/` and `engine/`. Each package keeps implementation code in `src/` and package-specific tests in `src/*.test.ts` or `test/`. Use `compiler/test/golden/` for compiler fixture inputs and `engine/test/stories/` for interactive story samples. Reference material lives in `doc/`, with larger product and implementation notes in `SPEC.md`, `IMPLEMENT.md`, and `MVP.md`. The `IDE/` and `reader/` directories are currently empty and should not be treated as active modules.

## Build, Test, and Development Commands
Run commands from the package you are changing; there is no root workspace script.

- `cd compiler; npm run build` compiles the compiler to `compiler/dist/`.
- `cd compiler; npm test` runs compiler tests with Vitest.
- `cd compiler; npm run dev -- <file>` runs the compiler CLI with `tsx`.
- `cd engine; npm run build` compiles the engine to `engine/dist/`.
- `cd engine; npm test` runs engine and story tests with Vitest.
- `cd engine; npm run dev` starts the engine CLI from source.
- `cd engine; npm run story -- <story-name>` plays a sample story such as `sunken-library`.

Use Node.js 20+ as required by both package manifests.

## Coding Style & Naming Conventions
Follow the existing style: strict TypeScript, ES modules, 2-space indentation, semicolons, and `.js` import suffixes inside `.ts` files. Prefer descriptive camelCase for functions and variables, PascalCase for classes and types, and kebab-case or lowercase filenames that match the surrounding package style. Keep modules focused; parser, lexer, AST, rulebook, and runtime concerns are intentionally separated.

## Testing Guidelines
Vitest is the test runner in both packages. Add unit tests next to the source file when the behavior is local, or use `test/` when the case is fixture-driven or story-driven. Name tests `*.test.ts` and keep `describe` blocks aligned to the exported unit under test. No coverage gate is configured, so contributors should add or update tests for every parser, compiler, runtime, or CLI behavior change.

## Commit & Pull Request Guidelines
Recent history favors Conventional Commit prefixes such as `feat:` and `chore(scope):`; keep using that format with short, imperative subjects. Pull requests should explain the user-visible or engine/compiler-facing change, note the package(s) touched, list the commands run, and include sample output when CLI behavior changes. Link the relevant spec or issue when the change implements or revises documented behavior.
