# Task Log

This file is the durable handoff surface for long-running work. Keep it concise and useful for a new agent entering the repository with no chat history.

## Active tasks

- None.

## Recent handoffs

### 2026-06-06 Project documentation and agent workflow baseline

Status: done

Scope:
- Review the repository structure and current game-scene architecture.
- Add durable docs for architecture, development, agent workflow, and future maintenance.
- Expand `AGENTS.md` so future agents can start long tasks safely.

Changed:
- `docs/ARCHITECTURE.md`: current runtime flow, module boundaries, render-system contract, target structure, game-scene extension path.
- `docs/DEVELOPMENT.md`: commands, URL/debug controls, verification matrix, change playbooks, git hygiene.
- `docs/AGENT_WORKFLOW.md`: startup protocol, long-task protocol, handoff format, multi-agent coordination rules.
- `docs/TASK_LOG.md`: persistent handoff log and template.
- `AGENTS.md`: expanded stable agent operating contract.
- `README.md`: documentation map and updated project-structure notes.

Validation:
- Docs-only change; no runtime build or visual verifier was required.
- Repository inspection covered README, package scripts, TypeScript config, Vite config, deployment workflow, app shell, scene orchestration, scene config, input, camera, renderer helpers, audio, mobile fullscreen helper, CSS, manifest, and verifier script.

Decisions:
- Keep the current source layout in place for now because it is small and working.
- Document the target structure instead of performing a risky big-bang refactor.
- Treat `docs/TASK_LOG.md` as the cross-session coordination file.

Risks / next steps:
- `Scene` currently owns orchestration, URL config parsing, quality profile overrides, and regeneration. Extract config/profile parsing before adding complex gameplay.
- `scripts/verify-scene.mjs` currently assumes a macOS Chrome executable path. Make browser discovery configurable before relying on it in non-macOS CI.
- When gameplay is added, prefer a thin `src/game/` layer that reads scene/camera state rather than moving low-level rendering responsibilities.

## Template

```text
### YYYY-MM-DD Short task title

Status: done | partial | blocked

Scope:
- ...

Changed:
- path: summary

Validation:
- command: result
- not run: reason

Decisions:
- ...

Risks / next steps:
- ...
```
