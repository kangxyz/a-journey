# A-JOURNEY

Live demo: <https://kangxyz.github.io/a-journey/>

A-JOURNEY is a small Vite + TypeScript + WebGL2 first-person atmosphere scene. It renders a red sky, distant mountains, power towers and wires, dynamic clouds, overgrown grassland, post-processing, mobile touch controls, and background music with a distant broadcast feel.

The project is intentionally self-contained and does not use a 3D engine.

## Current status

This is an early-stage single-scene game prototype. The current focus is to keep the project easy to run, easy to inspect, and easy to extend without adding a large framework. Preserve existing behavior first; add gameplay features in small steps.

## Install

Requirements: a recent Node.js runtime and npm.

```bash
npm install
```

## Run locally

```bash
npm run dev
```

The Vite dev server serves the app under the configured base path. Use the port printed by Vite:

```text
http://127.0.0.1:<port>/a-journey/
```

For repeatable verifier commands, start Vite on a fixed local port:

```bash
npm run dev -- --host 127.0.0.1 --port 5181
```

## Build

```bash
npm run build
```

This runs TypeScript checking through `tsc` and then builds the Vite production bundle.

Preview the production build:

```bash
npm run preview
```

## Verify

The repository includes a Playwright-based smoke verifier that captures screenshots, checks for page errors, confirms the scene is not black, verifies camera movement, and reads debug stats.

Start the dev server on port `5181`, then run:

```bash
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify
```

Run mobile checks when changing input, layout, fullscreen behavior, audio, quality, CSS, or mobile performance:

```bash
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile:landscape
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile:no-fullscreen
```

Verifier screenshots are written to `artifacts/`, which is ignored by Git.

Note: `scripts/verify-scene.mjs` currently launches Chrome from a macOS Google Chrome path. On other environments, `npm run build` is the minimum static check until the verifier browser path is made configurable.

There is no separate lint command yet.

## Controls

- Click or tap once to unlock input and background music.
- Drag to look around.
- `W` / `A` / `S` / `D` moves the camera.
- `Shift` sprints.
- `F` toggles debug stats.
- `1` through `5` switch debug render modes.
- `R` regenerates the procedural scene seed.
- On touch devices, use the lower-left joystick to move and drag on the right side to look.
- On touch devices, use the fullscreen button when supported, or swipe up from the bottom-center chevrons to help the browser collapse its chrome.

## URL parameters

Quality:

```text
?quality=low
?quality=balanced
?quality=high
```

Performance overrides:

```text
?fps=30
?scale=0.78
```

Camera and shot tuning:

```text
?fov=48
?dof=0.34
?camX=-74&camY=1.30&camZ=66&yaw=3.055&pitch=0.335
```

Mobile portrait uses a separate default shot tuned around the foreground tower. URL camera parameters still override it.

## Main files

```text
README.md                Project overview and run/verify commands
AGENTS.md                Agent and contributor guidance
TODO.md                  Small follow-up tasks and known issues
.github/workflows/       GitHub Pages deployment workflow
public/                  Static public assets and web manifest
scripts/                 Playwright smoke verifier
src/main.ts              Browser entry point
src/style.css            Page, canvas, debug overlay, and mobile control styles
src/app/App.ts           App shell, render loop, quality controls, mobile fullscreen UI
src/audio/               Background audio startup and broadcast effect
src/assets/              Runtime assets, mesh utilities, and procedural builders
src/math/                Lightweight math, RNG, and noise helpers
src/renderer/            WebGL2 buffer, shader, framebuffer, and fullscreen-pass helpers
src/scene/Scene.ts       Scene orchestration, render order, config overrides, stats
src/scene/SceneConfig.ts Typed scene defaults and tuning values
src/scene/Input.ts       Keyboard, pointer, and touch controls
src/shaders/             GLSL shader strings grouped by visual feature
index.html               Vite HTML entry
vite.config.ts           Vite config and GitHub Pages base path
package.json             npm scripts and dependency metadata
```

## Deployment

`vite.config.ts` sets the Vite base path to `/a-journey/`. The GitHub Pages workflow builds `dist/` and deploys it when `main` is pushed.

## Notes

- Keep the project small and flat.
- Prefer preserving existing behavior over broad rewrites.
- `src/assets/audio/background.mp3` is the runtime background track.
- `target/` and `demo/` are local reference folders and are not required at runtime.
- `node_modules/`, `dist/`, `artifacts/`, `target/`, and `demo/` are ignored by Git.
