# Development Guide

This guide turns the current README commands into a change workflow for maintainers and coding agents.

## Environment

Use a recent Node.js runtime and npm. The GitHub Pages workflow currently uses Node 22, so prefer Node 22 locally when possible.

Install dependencies:

```bash
npm install
```

Start a local dev server:

```bash
npm run dev
```

For repeatable verifier runs, use a fixed local port:

```bash
npm run dev -- --host 127.0.0.1 --port 5181
```

Build the production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Verification commands

The verifier captures screenshots, checks for page errors, validates that the render is not black, exercises camera movement, reads debug stats, and checks mobile controls/audio when requested.

With the dev server running on port `5181`:

```bash
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile:landscape
TARGET_URL="http://127.0.0.1:5181/a-journey/" npm run verify:mobile:no-fullscreen
```

Verifier screenshots are written to `artifacts/`, which is ignored by Git.

### Verifier environment note

`scripts/verify-scene.mjs` currently launches Chrome from the macOS path:

```text
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

On Linux/CI/non-macOS environments, agents may need to adjust the script or document that only static checks were possible. Do not claim visual verification if the browser did not actually run.

## URL controls

Quality profiles:

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

Rules:

- Keep documented URL parameters stable unless a task explicitly requests a breaking change.
- Clamp user-provided numeric parameters before applying them to config.
- When adding a URL parameter, document it in `README.md` and this file.
- Prefer typed helpers for new URL parsing instead of duplicating ad hoc parsing.

## Debug controls

Runtime controls currently include:

- `F`: toggle debug overlay.
- `1`: final view.
- `2`: fog debug.
- `3`: grass LOD debug.
- `4`: wire debug.
- `5`: no-post/debug mode.
- `R`: regenerate procedural seed and rebuild scene resources.

When adding debug controls, update the README or this guide and make sure the controls do not interfere with normal first-person movement.

## Change playbooks

### Visual atmosphere changes

Use this for sky, fog, clouds, terrain colors, grass color/density, towers, wires, mountains, post-processing, or camera defaults.

1. Locate the owning config section in `SceneConfig` and the owning render system.
2. Prefer config/shader adjustments over broad code changes.
3. Preserve the core mood: red sky, oppressive power towers/wires, soft distant mountains, slow dynamic clouds, damp green grassland, distant broadcast feel.
4. Run `npm run build` if TypeScript or shader strings changed.
5. Run desktop verifier and inspect `artifacts/scene-check-desktop.png`.
6. Run mobile verifiers when layout, quality, input, or performance could change.
7. Record any intentional visual change in the task handoff.

### New render system

1. Add config fields to `SceneConfig` first.
2. Add procedural mesh/data helpers under `src/assets/procedural/` when needed.
3. Add shader strings under `src/shaders/`.
4. Add the system under `src/scene/` now, or `src/scene/systems/` after that migration starts.
5. Instantiate and dispose it from `Scene`.
6. Place it deliberately in the render order documented in `docs/ARCHITECTURE.md`.
7. Update debug stats only if useful.
8. Verify build and screenshots.

### Input, mobile, or fullscreen changes

Touch behavior spans `Input`, `MobileFullscreenButton`, CSS, web manifest, and verifier assertions.

Checklist:

- Test pointer-lock mouse drag and keyboard movement on desktop.
- Test touch joystick and touch-look on portrait mobile.
- Test mobile landscape layout.
- Test the unsupported-fullscreen fallback path.
- Preserve browser-chrome swipe affordances unless replacing them with a verified alternative.
- Keep touch-unlocked audio working after the first user gesture.

### Audio changes

Audio startup is constrained by browser autoplay rules.

Checklist:

- Keep audio start behind a trusted user gesture.
- Keep mobile native playback volume conservative.
- Do not make startup volume startling.
- Verify the mobile audio path when possible.
- Do not commit large replacement audio unless the task explicitly requires it.

### Performance changes

The default balanced profile is performance-conscious. Before increasing density, samples, render scale, or draw calls:

- Explain why the visual gain is worth the cost.
- Check low/balanced/high quality behavior separately.
- Preserve `quality=low` as a real fallback.
- Prefer shader detail, instancing, LOD, and distance fades over more objects.
- Watch debug overlay values: draw calls, grass tiles, grass instances, wire segments, tower count.

### Deployment changes

GitHub Pages deploys from `main` through `.github/workflows/deploy.yml`. A push to `main` can trigger deployment.

Rules:

- Do not modify deployment unless the task asks for it.
- Keep `vite.config.ts` base path aligned with the repository Pages path.
- Do not commit `dist/`; Pages builds it in Actions.

## Git hygiene

Do not commit generated or local-only files:

```text
node_modules/
dist/
artifacts/
target/
demo/
*.log
.env
.env.*
```

Use focused commits. If a change is docs-only, say so in the commit message or handoff.

## Definition of done

A task is done when:

- The requested behavior or documentation is implemented.
- The relevant docs are updated when commands, structure, URL params, controls, or workflow changed.
- `npm run build` was run for TypeScript/shader/runtime changes, or the reason it was not run is stated.
- Relevant verifier commands were run for rendering/input/audio/layout/performance changes, or the exact blocker is stated.
- `docs/TASK_LOG.md` is updated for long-running or multi-session work.
