# Agent Workflow

This guide helps coding agents and maintainers continue work across long tasks or new chat sessions.

`AGENTS.md` is the stable operating contract. This document explains the day-to-day workflow.

## Startup protocol

At the start of a new task:

1. Read `AGENTS.md`.
2. Read `README.md` for commands, controls, deployment, and public project notes.
3. Read `docs/ARCHITECTURE.md` for runtime flow and module boundaries.
4. Read `docs/DEVELOPMENT.md` for verification and change playbooks.
5. Read `docs/TASK_LOG.md` for current handoff state.
6. Inspect the source files relevant to the requested change before editing.
7. State verification limits honestly in the final handoff.

Repository files are the source of truth. Check them directly instead of relying on memory from older sessions.

## Long-running task protocol

Use this protocol when work spans multiple commits, many files, uncertain design choices, or more than one session.

### 1. Establish scope

Record:

- Goal.
- Non-goals.
- Files or systems likely to change.
- Validation commands expected.
- Known risks.

For large tasks, add or update an entry in `docs/TASK_LOG.md` before broad edits.

### 2. Work in small vertical slices

Prefer complete slices that can compile independently:

```text
config type -> system behavior -> render integration -> docs -> verification
```

Avoid moving many files and changing behavior in the same slice. When a refactor is needed, do the mechanical move first, verify imports, then change behavior.

### 3. Keep a handoff trail

Update `docs/TASK_LOG.md` when any of these happen:

- Architecture or module boundaries changed.
- An intended slice is incomplete.
- Verification was skipped because of environment limits.
- A risk was discovered that future agents must know.
- Follow-up tasks were created.

The task log should be concise. It is a coordination file, not a diary.

### 4. Verify at the right level

Use the smallest reliable validation set for the change:

| Change type | Minimum validation |
| --- | --- |
| Docs only | Review rendered Markdown mentally; no runtime build required. |
| TypeScript only | `npm run build`. |
| Shader/rendering | `npm run build` plus desktop verifier and screenshot inspection. |
| Mobile layout/input | Mobile portrait, landscape, and no-fullscreen verifiers. |
| Audio startup | Mobile verifier, plus manual reasoning about autoplay gesture path. |
| Deployment | `npm run build` and workflow review. |

When validation cannot run, say exactly what was and was not run.

## Handoff format

Use this shape in `docs/TASK_LOG.md` and final responses for larger work:

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

## Commit guidance

- Keep commits focused by topic.
- Leave generated files from ignored paths out of commits.
- Revert user changes only when explicitly requested.
- Update `main` only when the current task explicitly asks for repository modification.
- Mention verification limits in the handoff.

## Multi-agent coordination rules

- Treat `docs/TASK_LOG.md` as the shared scratchpad for repository state that must survive a new session.
- Prefer durable docs over chat-only explanations for architectural decisions.
- If a decision affects future work, document it under `docs/ARCHITECTURE.md` or `docs/DEVELOPMENT.md`, not only in `AGENTS.md`.
- For large design decisions, add a short decision note in the task log before implementation.
- Keep `AGENTS.md` stable and high-signal. Put detailed procedures here.

## Safe refactor strategy

For structural changes:

1. Add docs for the intended boundary.
2. Move files without behavior changes.
3. Fix imports and run `npm run build`.
4. Commit the mechanical move.
5. Apply behavior changes in a follow-up commit.
6. Run visual/mobile verifiers if render behavior changed.
7. Update docs and task log.

This keeps future agents from debugging behavior changes hidden inside file moves.

## Source inspection checklist

Before editing a system, inspect:

- The system class.
- Its shader module.
- Its config fields in `SceneConfig`.
- Its render order in `Scene`.
- Any verifier expectation that reads its visible output or stats.
- README/docs sections that describe related controls or behavior.

## Communication rules

- Be explicit about assumptions.
- Share partial findings during long reviews.
- Keep repository handoff notes durable when they affect future work.
- Choose small reversible documentation or structure improvements instead of broad rewrites when uncertainty is high.
