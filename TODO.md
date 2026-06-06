# TODO

Small, durable follow-up tasks for A-JOURNEY. Keep this list practical and update it when a task discovers a real next step.

## Next priorities

1. Keep the project flat and easy to inspect while the prototype is small.
2. Preserve the current scene behavior while adding any new gameplay step.
3. Make the verifier browser path configurable so `npm run verify` is easier to run outside the current macOS Chrome setup.
4. If `Scene.ts` becomes harder to scan, first extract URL/config/profile parsing into one small helper file. Avoid a broad architecture rewrite.
5. When adding gameplay, start with a small state or interaction file rather than introducing an engine-style framework.

## Known issues

- `scripts/verify-scene.mjs` currently launches Chrome from a fixed macOS Google Chrome path.
- There is no separate lint command; `npm run build` is the minimum static check.
- The scene is still a visual prototype. There is no objective, progression, inventory, save data, or game-state loop yet.
- Mobile behavior depends on `Input`, `MobileFullscreenButton`, `style.css`, the manifest, and verifier assumptions, so mobile changes need extra care.

## Good small tasks for future agents

- Add a configurable browser path or fallback discovery to `scripts/verify-scene.mjs` without adding a large dependency.
- Add a tiny README screenshot or visual note once a stable screenshot is chosen.
- Document any new URL parameter at the same time it is added.
- Add one small gameplay interaction prototype while keeping rendering code unchanged.
- Review `Scene.makeInitialConfig()` and extract only the URL/profile parsing if it starts blocking work.
