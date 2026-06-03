# Agent Development Guide

This file describes how coding agents should work on this project.

## Project Intent

A-JOURNEY is a Vite + TypeScript + WebGL2 first-person atmosphere scene. The art direction is red sky, oppressive powerlines, distant mountains, dynamic clouds, and damp dark-green grassland. Keep the project lightweight and self-contained; it does not use a 3D engine.

Default mode is performance-conscious. Do not trade away the quiet default profile unless the user explicitly asks for higher quality.

## Start Here

- Read `README.md` for project usage and URL parameters.
- Read `src/app/App.ts` for render budget, frame pacing, and quality URL parameters.
- Read `src/scene/Scene.ts` and `src/scene/SceneConfig.ts` before changing scene density or quality behavior.
- Shader code lives in `src/shaders/`; procedural mesh builders live in `src/assets/procedural/`.
- Background audio is `src/assets/audio/background.mp3`; playback logic is in `src/audio/BroadcastAudio.ts`.

## Development Rules

- Prefer small, targeted changes that preserve the existing visual direction.
- Do not introduce a rendering engine or large runtime dependency.
- Keep default quality quiet: balanced should remain capped around 30fps, DPR cap 1, and internal pixels around 900k or less.
- Preserve existing URL controls: `?quality=low|balanced|high`, `?fps=`, and `?scale=`.
- Do not add UI controls unless the user asks. Debug stats are toggled with `F`.
- Avoid adding draw calls for visual tweaks when shader or instancing changes are enough.
- Mobile is a first-class target. Preserve touch movement, touch-look, fullscreen entry, browser-chrome swipe hiding, and touch-unlocked audio when changing input, layout, render sizing, camera behavior, or audio startup.
- Keep `target/` as local reference material only. It is ignored by Git and should not be required at runtime.
- Generated output belongs in `dist/` or `artifacts/`; both are ignored.

## Visual Constraints

- Red sky and cloud movement are core to the scene. Clouds should remain dynamic but slow.
- Mountain and horizon detail should fade softly at the sides; avoid hard cuts.
- Grass should read as damp dark-green field, not flat neon green and not solid black.
- Powerlines and towers should keep their oppressive silhouette and depth layering.
- Background music should stay at a normal, non-startling volume with a distant broadcast feel.

## Performance Budgets

For default `quality=balanced`, keep roughly within these targets:

- Internal canvas pixels: `<= 900k`
- Draw calls: do not increase from the current baseline without a strong reason
- Grass instances: about `<= 560`
- Wire segments: about `6000-7500`
- Towers: do not significantly increase default instance count

Use `quality=high` for denser geometry and higher render scale. Use `quality=low` for further reduced load.

## Testing

Always run a build after TypeScript or shader changes:

```bash
npm run build
```

When rendering behavior changes, run the scene verifier against the default page:

```bash
TARGET_URL="http://127.0.0.1:5181/" npm run verify
TARGET_URL="http://127.0.0.1:5181/" npm run verify:mobile
TARGET_URL="http://127.0.0.1:5181/" npm run verify:mobile:landscape
```

For quality-path changes, also verify:

```bash
TARGET_URL="http://127.0.0.1:5181/?quality=low" npm run verify
TARGET_URL="http://127.0.0.1:5181/?quality=low" npm run verify:mobile
TARGET_URL="http://127.0.0.1:5181/?quality=low" npm run verify:mobile:landscape
TARGET_URL="http://127.0.0.1:5181/?quality=high" npm run verify
TARGET_URL="http://127.0.0.1:5181/?quality=high" npm run verify:mobile
TARGET_URL="http://127.0.0.1:5181/?quality=high" npm run verify:mobile:landscape
```

The verifier writes screenshots to `artifacts/`. Inspect screenshots when visual quality is part of the request.

## Git Notes

- The repository tracks source files, scripts, README/AGENTS docs, and runtime assets under `src/assets/`.
- Do not commit `node_modules/`, `dist/`, `artifacts/`, or `target/`.
- If moving an asset, update code references and verify `npm run build`.
- Do not revert user changes unless explicitly asked.
