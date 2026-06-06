# AGENTS.md

This file is the stable operating contract for coding agents working on A-JOURNEY. Keep it high-signal and durable. Put detailed procedures in `docs/AGENT_WORKFLOW.md` and project design details in `docs/ARCHITECTURE.md`.

## Read order for every task

1. `AGENTS.md` for stable rules.
2. `README.md` for public commands, controls, deployment, and project overview.
3. `docs/ARCHITECTURE.md` for runtime flow, module boundaries, render order, and target structure.
4. `docs/DEVELOPMENT.md` for verification commands and change playbooks.
5. `docs/AGENT_WORKFLOW.md` for long-running task and handoff protocol.
6. `docs/TASK_LOG.md` for current cross-session state.
7. Relevant source files before editing.

## Project intent

A-JOURNEY is a lightweight Vite + TypeScript + WebGL2 first-person atmosphere scene. It is intentionally self-contained and does not use a 3D engine.

Preserve the core direction:

- Red sky and heavy atmosphere.
- Oppressive power towers and wires.
- Soft distant mountains and horizon detail.
- Slow dynamic clouds.
- Damp green overgrown grassland.
- Background music with a distant broadcast feel.
- First-person movement that follows terrain.
- Mobile touch controls, fullscreen affordances, and touch-unlocked audio.

Default quality should remain performance-conscious and calm. Use heavier density or effects only when the task explicitly asks for it or when a profile-specific change keeps `quality=low` usable.

## Stable module boundaries

- `src/app/`: browser shell, canvas sizing, frame pacing, runtime quality policy, fullscreen/mobile browser helpers.
- `src/audio/`: background audio element, unlock flow, Web Audio graph, volume/fade policy.
- `src/assets/`: runtime assets and procedural mesh/data generation.
- `src/math/`: dependency-free math, matrix, vector, RNG, and noise helpers.
- `src/renderer/`: reusable WebGL2 resource helpers. Keep it scene-agnostic.
- `src/scene/`: scene config, camera, input, debug overlay, render-system orchestration, and current render systems.
- `src/shaders/`: GLSL shader strings grouped by owning render system.
- `scripts/`: verifier scripts only.
- `docs/`: durable architecture, development, workflow, and task-handoff documentation.

When the scene grows, follow the target structure in `docs/ARCHITECTURE.md` instead of inventing a new layout in a single task.

## Coding rules

- Prefer small, targeted edits that preserve the existing systems and visual direction.
- Do not introduce a rendering engine or large runtime dependency unless explicitly requested.
- Keep TypeScript strictness intact. Avoid `any` unless wrapping unavoidable browser API gaps.
- Add or update typed config fields in `SceneConfig` instead of scattering magic constants.
- Prefer deterministic procedural generation based on `SceneConfig.seed`.
- Keep WebGL ownership clear: the class that allocates a GL resource must dispose it.
- Set GL state intentionally in each render system; do not assume a previous system left the state you need.
- Avoid broad file moves mixed with behavior changes.
- Do not add UI unless requested, except for debug or mobile affordances that are part of the task.

## Visual rules

- Preserve the established mood before increasing realism or brightness.
- Clouds must remain dynamic but slow.
- Mountains and horizon detail should fade softly; avoid hard side cuts.
- Grass should read as a damp green field, not flat neon green and not solid black.
- Towers and wires should keep strong silhouettes and depth layering.
- Post-processing should support the mood without hiding scene readability.
- Background music should remain at a normal, non-startling volume.

## Runtime compatibility rules

- Keep documented URL controls stable: `quality`, `fps`, `scale`, `fov`, `dof`, `camX`, `camY`, `camZ`, `yaw`, and `pitch`.
- Treat mobile as a first-class target. Do not break touch movement, touch-look, fullscreen behavior, browser-chrome helpers, safe-area layout, or touch-unlocked audio.
- Preserve the `/a-journey/` Vite base path unless deployment requirements change.
- Do not commit generated/local files such as `node_modules/`, `dist/`, `artifacts/`, `demo/`, or `target/`.

## Verification rules

- Run `npm run build` after TypeScript, shader, config-shape, import, or runtime changes.
- Run the desktop verifier for rendering, camera, shader, post-process, terrain, vegetation, tower, wire, or performance changes.
- Run mobile verifiers for input, layout, fullscreen, audio, quality, CSS, manifest, or mobile performance changes.
- Inspect verifier screenshots for visual changes.
- If verification cannot run, state exactly what was not run and why in the handoff.
- Docs-only changes do not require a runtime build unless they change executable examples or commands.

## Long-running task rules

- Use `docs/TASK_LOG.md` for work that spans multiple commits, many files, uncertain design choices, or multiple sessions.
- Record scope, changed files, validation, decisions, risks, and next steps.
- Keep task-log entries concise and useful for a new agent with no chat history.
- Prefer durable documentation updates over chat-only explanations for architecture decisions.
- Keep `AGENTS.md` stable. Move detailed process changes to `docs/AGENT_WORKFLOW.md`.

## Git rules

- Commit or push only when the current task explicitly requests repository modification.
- Keep commits focused by topic.
- Do not revert user changes unless explicitly asked.
- Do not deploy manually unless explicitly asked.
- Remember that pushing to `main` can trigger the GitHub Pages workflow.

## Handoff checklist

Before finishing a task, report:

- What changed.
- Commit SHA or PR reference when repository changes were made.
- Validation that was run.
- Validation that was not run, with the exact reason.
- Any follow-up risks or recommended next steps.
