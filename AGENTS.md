# AGENTS.md

A-JOURNEY is a lightweight Vite + TypeScript + WebGL2 first-person scene. Keep changes small, preserve the existing atmosphere and mobile behavior, and use `README.md` for commands and project details.

## Rules

- Read `README.md` before changing build/dev commands, URL parameters, deployment, or project structure.
- Prefer existing renderer and scene systems; do not add a 3D engine or large runtime dependency unless explicitly requested.
- Do not break documented URL controls, touch controls, fullscreen behavior, browser-chrome helpers, or touch-unlocked audio.
- Avoid adding UI unless requested.
- For visual changes, preserve the established mood and check screenshots for obvious regressions.
- Run `npm run build` after TypeScript or shader changes; run relevant verifiers for rendering, input, audio, layout, or performance changes.
- Do not commit generated/local files such as `node_modules/`, `dist/`, `artifacts/`, `demo/` or `target/`.
- Do not push, deploy, or revert user changes unless explicitly asked.
