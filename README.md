# A-JOURNEY

Live demo: <https://kangxyz.github.io/a-journey/>

A-JOURNEY is a lightweight Vite + TypeScript + WebGL2 first-person atmosphere scene. It renders a red sky, oppressive power towers and wires, distant mountains, slow dynamic clouds, wind-swept overgrown grassland, and background music with a distant broadcast feel. The project is self-contained and does not use a 3D engine.

## Highlights

- WebGL2 rendering without an external engine.
- First-person walking camera with terrain-following movement.
- Procedural terrain, instanced grass, towers, wires, mountains, clouds, and horizon detail.
- Dense near-field grass with distance-based LOD and shader-based far grassland continuity.
- Color post-processing, vignette, film grain, and depth-of-field.
- Touch controls, mobile fullscreen helpers, and touch-unlocked audio.
- URL-controlled quality profiles and shot-tuning parameters.

## Documentation Map

- `AGENTS.md` is the stable operating contract for coding agents.
- `docs/ARCHITECTURE.md` explains runtime flow, module boundaries, render order, target structure, and game-scene extension seams.
- `docs/DEVELOPMENT.md` covers local commands, URL/debug controls, verification, change playbooks, deployment notes, and git hygiene.
- `docs/AGENT_WORKFLOW.md` defines startup, long-running task, handoff, and multi-agent coordination protocols.
- `docs/TASK_LOG.md` is the durable cross-session handoff log for long tasks and future agents.

## Quick Start

Requirements: a recent Node.js runtime and npm.

```bash
npm install
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

Build and preview the production bundle:

```bash
npm run build
npm run preview
```

## Controls

- Click or tap once to unlock input and background music.
- Drag to look around.
- `W` / `A` / `S` / `D` moves the camera.
- `Shift` sprints.
- `F` toggles debug stats.
- On touch devices, use the lower-left joystick to move and drag on the right side to look.
- On touch devices, use the fullscreen button when supported, or swipe up from the bottom-center chevrons to help the browser collapse its chrome.

## URL Parameters

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

Examples:

```text
http://127.0.0.1:5181/a-journey/?quality=low
http://127.0.0.1:5181/a-journey/?quality=high&fps=60
http://127.0.0.1:5181/a-journey/?fov=50&dof=0.45&camX=-74&yaw=3.055&pitch=0.335
```

## Rendering Profiles

`quality=balanced` is the default. It targets a quiet profile around 30fps, DPR capped at 1, and an internal pixel budget around 900k. The current default shot keeps dense near grass while using stable distance LOD and terrain/grassland shader detail to avoid expensive far-field blades.

`quality=low` reduces render scale, terrain detail, grass density, tower count, and wire samples. `quality=high` restores higher render scale, denser grass, more wire samples, and higher scene density for screenshots or stronger machines.

## Verification

The Playwright verifier captures screenshots, checks for page errors, confirms that the scene is not black, verifies camera movement, and reads debug stats. Start the dev server before running these commands, and replace the port in `TARGET_URL` if Vite is not running on `5181`.

Run the default desktop check:

```bash
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify
```

Run mobile checks when rendering, input, layout, audio, or performance behavior changes:

```bash
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile:landscape
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile:no-fullscreen
```

Verifier screenshots are written to `artifacts/`, which is ignored by Git.

## Deployment

`vite.config.ts` sets the Vite base path to `/a-journey/`. The GitHub Pages workflow in `.github/workflows/deploy.yml` builds `dist/` and deploys it when `main` is pushed.

## Project Structure

```text
.github/workflows/       GitHub Pages deployment workflow
docs/                    Architecture, development, agent workflow, and task handoff docs
public/                  Static public assets and web manifest
scripts/                 Playwright verification scripts
src/main.ts              Browser entry point
src/style.css            Page, canvas, and mobile control styles
src/app/                 App shell, render loop, quality controls, mobile fullscreen UI
src/audio/               Background audio startup and broadcast effect
src/assets/              Mesh utilities, procedural mesh builders, and runtime assets
src/math/                Lightweight math, RNG, and noise helpers
src/renderer/            WebGL2 buffer, shader, framebuffer, and fullscreen-pass helpers
src/scene/               Scene systems, camera, input, config, and debug overlay
src/shaders/             GLSL shader strings grouped by render system
index.html               Vite HTML entry
vite.config.ts           Vite config and GitHub Pages base path
package.json             npm scripts and dependency metadata
AGENTS.md                Stable agent operating contract
```

## Notes

- Coding agents should read `AGENTS.md` and the docs in `docs/` before changing the project.
- `docs/TASK_LOG.md` is the cross-session handoff log for long tasks.
- `src/assets/audio/background.mp3` is the runtime background track.
- `target/` is reserved for local reference images and is not required at runtime.
- `demo/` is reserved for local technical demos used as reference during migration work.
- `node_modules/`, `dist/`, `artifacts/`, `target/`, and `demo/` are ignored by Git.
