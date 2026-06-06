# Architecture

A-JOURNEY is a lightweight Vite + TypeScript + WebGL2 first-person atmosphere scene. The current implementation is intentionally engine-free: the app owns the browser shell and render loop, the scene owns simulation and render-system orchestration, and each system owns its WebGL resources.

This document records the current architecture and the intended growth path so future contributors and agents can extend the project without rediscovering the design from source every time.

## Current runtime flow

```text
index.html
  -> src/main.ts
    -> App
      -> GLDevice               WebGL2 context and global GL state defaults
      -> Input                  keyboard, pointer-lock, touch movement/look UI
      -> BroadcastAudio         touch-unlocked background audio and filtering
      -> MobileFullscreenButton mobile fullscreen and browser-chrome helpers
      -> Scene                  camera, scene config, systems, render order
        -> Framebuffer          offscreen color/depth target
        -> render systems       sky/clouds/mountains/terrain/details/towers/wires/grass
        -> PostProcessSystem    fullscreen post pass from offscreen textures
```

`App` is the browser runtime shell. Keep DOM concerns, resize policy, frame pacing, quality-level frame targets, audio startup, and fullscreen affordances there.

`Scene` is the current orchestration layer. It builds `SceneConfig`, owns the camera, creates each render system, updates frame state, renders into a framebuffer, and then runs post-processing.

`FrameContext` is the per-frame data bus passed to render systems. Prefer adding shared per-frame values there instead of introducing hidden globals.

## Module boundaries

```text
.github/workflows/       GitHub Pages deployment workflow
public/                  Static public assets and manifest
scripts/                 Playwright screenshot/input/audio verifiers
src/main.ts              Browser entry point
src/style.css            Canvas, debug overlay, touch UI, fullscreen/mobile CSS
src/app/                 Runtime shell and mobile browser helpers
src/audio/               Background audio startup and broadcast-style effects
src/assets/              Runtime assets and procedural mesh builders
src/math/                Small math, vector, matrix, RNG, and noise helpers
src/renderer/            WebGL2 resource helpers and fullscreen/framebuffer utilities
src/scene/               Scene orchestration, camera, input, config, render systems
src/shaders/             GLSL shader strings grouped by render system
docs/                    Architecture, development, workflow, and handoff docs
```

Keep these boundaries strict:

- `src/app/` may touch DOM, browser lifecycle, window sizing, and high-level runtime policy.
- `src/scene/` should not create arbitrary UI, except where an existing scene-adjacent helper already owns input/debug behavior.
- `src/renderer/` should remain reusable WebGL infrastructure, not scene-specific art direction.
- `src/assets/procedural/` should generate mesh/data inputs and stay independent from WebGL uploads.
- `src/shaders/` should contain shader source only. Pair shader changes with the owning system change when behavior changes.
- `src/math/` should stay dependency-free and deterministic.

## Render frame lifecycle

Each rendered frame follows this sequence:

1. `App` skips frames when the document is hidden or when target frame pacing has not elapsed.
2. `App.resize()` computes the canvas backing size using the selected quality profile, DPR cap, render scale, and pixel budget.
3. `Scene.frame(dt, width, height)` updates debug keys, FPS smoothing, framebuffer size, camera movement, and grass tile data.
4. `Scene` builds a `FrameContext` with GL, time, camera matrices/vectors, config, debug mode, and mutable stats.
5. Systems render in the current painter/depth order:

   ```text
   SkySystem
   CloudSheetSystem
   MountainSystem
   TerrainSystem
   HorizonDetailSystem
   TowerSystem
   WireSystem
   FieldClumpSystem
   GrassSystem
   PostProcessSystem
   ```

6. Systems update `frame.stats` for the debug overlay.
7. `Scene` returns `SceneStats` to `App`, and `DebugOverlay` displays them when enabled.

Do not reorder systems casually. Any render-order change should explain the visual reason and include screenshots from the verifier artifacts.

## Render system contract

A render system should usually follow this shape:

```ts
export class ExampleSystem {
  constructor(private readonly gl: WebGL2RenderingContext, private readonly config: SceneConfig) {
    // Compile shader programs, upload static buffers, allocate dynamic buffers.
  }

  update?(dt: number, ...inputs: unknown[]): void {
    // Optional CPU-side simulation or streaming data rebuild.
  }

  render(frame: FrameContext): void {
    // Set GL state intentionally, bind program/buffers, draw, update frame.stats.
  }

  dispose(): void {
    // Delete every WebGL resource owned by this system.
  }
}
```

Rules for new systems:

- Own and dispose all WebGL resources you allocate.
- Restore or explicitly set GL state needed by later systems.
- Prefer instancing, procedural meshes, and shader variation over many draw calls.
- Add config fields to `SceneConfig` instead of scattering magic constants.
- Add debug stats only when they help verify performance or correctness.
- Keep deterministic generation based on `SceneConfig.seed` when possible.

## Configuration and quality profiles

`SceneConfig` is the typed source of scene constants. URL/profile overrides currently live in `Scene.makeInitialConfig()` and render-scale/frame-pacing choices live in `App`.

This is acceptable for the current size, but future growth should extract these responsibilities:

```text
src/scene/config/defaultSceneConfig.ts
src/scene/config/qualityProfiles.ts
src/scene/config/urlParams.ts
src/app/renderScalePolicy.ts
```

Recommended migration order:

1. Move URL parsing into a small pure helper with tests or documented examples.
2. Move quality overrides into named profile objects.
3. Keep `SceneConfig` as the merged runtime shape.
4. Only then split render systems into `src/scene/systems/` if the directory becomes hard to scan.

Avoid a big-bang restructure. Move one boundary at a time and keep imports compiling after every commit.

## Game-scene extension path

The current project is an atmospheric scene, not yet a full gameplay framework. Add game behavior as a thin layer rather than rewriting the renderer.

Suggested future structure:

```text
src/game/
  GameState.ts             Persistent game/session state
  GameDirector.ts          High-level scene beats, objectives, triggers
  InteractionSystem.ts     Player proximity/raycast/trigger handling
  NarrativeEvents.ts       Data-only event definitions

src/scene/
  Scene.ts                 Rendering and camera orchestration
  systems/                 Render-only systems after gradual migration
  config/                  Default config, profiles, URL parsing
```

Guidelines:

- Keep `Scene` responsible for visual simulation and rendering.
- Keep `GameDirector` responsible for story/objective state.
- Keep interaction state data-driven and serializable where possible.
- Use `FrameContext` or a narrow adapter to expose camera/world data to gameplay.
- Do not let gameplay systems directly mutate low-level GL state.

## Recommended target structure

A mature version of the project can grow toward this layout:

```text
src/
  app/                     Runtime shell, frame scheduler, resize policy
  platform/                Browser feature helpers: fullscreen, pointer lock, mobile chrome
  audio/                   Audio sources, graph/effects, unlock policy
  game/                    Game state, objectives, interactions, narrative triggers
  scene/
    Scene.ts               Scene coordinator
    Camera.ts              Terrain-following first-person camera
    config/                Defaults, quality profiles, URL overrides
    systems/               Sky, terrain, vegetation, towers, wires, clouds, post
  renderer/                WebGL2 device/resource/pass helpers
  assets/
    audio/                 Runtime audio assets
    procedural/            Mesh/data generation
  shaders/                 GLSL strings or shader modules
  math/                    Deterministic math/noise/RNG helpers
```

The current layout is still small enough that immediate moves are not mandatory. Prefer this target as a guide for future refactors, not as a reason to churn working code.

## Design risks to watch

- `Scene` can become a god object if URL parsing, quality profiles, gameplay, and render-system orchestration all remain there.
- Mobile behavior is tightly coupled to CSS, input, fullscreen helpers, and verifier expectations. Treat it as a first-class target.
- Visual changes can be technically correct while breaking the intended mood. Use screenshots and the visual rules in `AGENTS.md`.
- Verifier scripts depend on a local browser setup. When a verifier cannot run, document the exact reason in the task log or final handoff.
- Adding dependencies can quickly undermine the engine-free design. Prefer focused utilities over runtime frameworks.

## Architectural definition of done

A structural change is done when:

- The module boundary being changed is documented here or in `docs/DEVELOPMENT.md`.
- `npm run build` passes, unless the change is docs-only or the environment cannot run it.
- Relevant desktop/mobile verifier commands are run for rendering, input, audio, layout, or performance changes.
- Any unverified risk is written in `docs/TASK_LOG.md` or the final handoff.
- New agents can understand the new boundary from docs without reading every source file.
