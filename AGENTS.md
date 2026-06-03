# Agent Development Guide

## Project Intent

A-JOURNEY is a lightweight Vite + TypeScript + WebGL2 first-person atmosphere scene. It does not use a 3D engine. Preserve the core direction: red sky, oppressive powerlines, distant mountains, slow dynamic clouds, damp green grassland, and distant broadcast-style music.

Default quality should remain performance-conscious and quiet. Use higher density or heavier effects only when the user explicitly asks for it.

## Development Rules

- Read `README.md` before making changes; use it as the source for commands, URL parameters, deployment notes, and project structure.
- Prefer small, targeted edits that follow the existing systems and visual direction.
- Do not introduce a rendering engine or large runtime dependency.
- Preserve URL-based controls for quality, frame pacing, render scale, camera, and shot tuning.
- Avoid adding UI unless the user asks.
- Avoid adding draw calls for visual tweaks when shader, instancing, or config changes are enough.
- Treat mobile as a first-class target. Do not break touch movement, touch-look, fullscreen behavior, browser-chrome hiding, or touch-unlocked audio.
- Keep `target/` as local reference material only; it is ignored by Git and must not be required at runtime.
- Keep generated output in ignored folders such as `dist/` or `artifacts/`.
- Keep this file limited to stable agent rules. Put usage instructions and detailed project documentation in `README.md`.

## Visual Rules

- Clouds must remain dynamic, but slow.
- Mountains and horizon detail should fade softly; avoid hard side cuts.
- Grass should read as damp green field, not flat neon green and not solid black.
- Towers and wires should keep their strong silhouette and depth layering.
- Background music should stay at a normal, non-startling volume.

## Testing

- Run `npm run build` after TypeScript or shader changes.
- When rendering, input, audio, layout, or performance behavior changes, run the verifier on desktop and mobile.
- Inspect verifier screenshots when the request is visual.

## Git Rules

- Do not commit `node_modules/`, `dist/`, `artifacts/`, or `target/`.
- Do not push or trigger deployment unless the user explicitly asks for push or deployment in the current task.
- Do not revert user changes unless explicitly asked.
