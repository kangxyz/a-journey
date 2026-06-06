# AGENTS.md

Guidance for AI agents and human contributors working on A-JOURNEY.

## Project goal

A-JOURNEY is a small Vite + TypeScript + WebGL2 first-person atmosphere scene. Keep it easy to run, easy to understand, and easy to modify. Preserve the current mood and behavior unless a task explicitly asks for a change.

Core direction:

- Red sky and heavy atmosphere.
- Power towers and wires with strong silhouettes.
- Distant mountains, dynamic clouds, terrain, and overgrown grass.
- First-person movement that follows terrain.
- Mobile touch controls, fullscreen helpers, and touch-unlocked audio.
- No 3D engine or large gameplay framework.

## Commands

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Use a fixed port for verifier commands:

```bash
npm run dev -- --host 127.0.0.1 --port 5181
```

Build:

```bash
npm run build
```

Smoke verify after starting the dev server on port `5181`:

```bash
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify
```

Mobile verifier commands:

```bash
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile:landscape
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile:no-fullscreen
```

There is no lint command yet. `npm run build` is the minimum static check for code changes.

## Read before editing

For every task, start with:

1. `README.md` for project status, commands, controls, and main files.
2. `TODO.md` for known issues and next small tasks.
3. `package.json` for available scripts.
4. `src/main.ts` and `src/app/App.ts` for startup, canvas sizing, render loop, audio, and fullscreen setup.
5. `src/scene/Scene.ts` for render order, frame flow, URL overrides, regeneration, and stats.
6. `src/scene/SceneConfig.ts` before changing visual tuning or quality-related constants.
7. `src/scene/Input.ts`, `src/app/MobileFullscreenButton.ts`, and `src/style.css` before changing input or mobile behavior.
8. The relevant render class and shader file before changing a visual feature.

## Code style and boundaries

- Keep the project flat and small.
- Prefer targeted edits over broad rewrites.
- Avoid adding `engine/`, `core/`, entity-component systems, plugin systems, or other framework-style layers while the project remains this small.
- Avoid adding a 3D engine or large dependency unless explicitly requested.
- Keep TypeScript strictness intact.
- Prefer typed fields in `SceneConfig` over scattered magic constants.
- Keep WebGL ownership simple: the class that allocates a GL resource should dispose it.
- Keep URL parameters documented and backward compatible when possible.
- Treat mobile behavior as first-class; verify touch, fullscreen, layout, and audio paths when they are affected.

## Project guardrails

- Architecture cleanup should stay behavior-preserving.
- Keep current controls, URL parameters, audio behavior, mobile helpers, and verifier scripts unless a task explicitly changes them.
- Keep generated and local-only files out of commits: `node_modules/`, `dist/`, `artifacts/`, `target/`, `demo/`, logs, `.env`, and secrets.
- Check screenshots when visual behavior changes and a verifier/browser is available.
- Keep onboarding in `README.md`, `AGENTS.md`, and `TODO.md` unless the project grows enough to need more.

## Task handoff

At the end of every task, report:

- Short judgment of the current state.
- Files changed.
- Commands run and results.
- Commands not run, with the reason.
- Commit SHA or PR reference.
- Small follow-up suggestions.

Update `TODO.md` when you discover a durable next step, known issue, or small task for a future agent.
