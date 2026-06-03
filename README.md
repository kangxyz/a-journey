# A-JOURNEY

Live demo: https://kangxyz.github.io/a-journey/

A Vite + TypeScript + WebGL2 first-person atmospheric scene. The project renders a red sky, power towers, overhead wires, distant mountains, dynamic clouds, damp dark-green grassland, and background music with a distant broadcast feel.

## Features

- Real-time WebGL2 rendering without an external 3D engine.
- First-person walking camera with terrain-following movement.
- Procedural terrain, grass, towers, wires, mountains, and horizon detail.
- Dynamic red cloud layers, film grain, vignette, and color post-processing.
- Background music from `src/assets/audio/background.mp3`, processed with lightweight stereo delay and fade-in to avoid sudden loud playback.
- Built-in quality profiles. The default profile is tuned for quieter performance.

## Running

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build the production bundle:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Controls

- Click the canvas, then drag to look around.
- `W` / `A` / `S` / `D` to move.
- `Shift` to sprint.
- `F` to show or hide debug stats.
- On touch devices, use the lower-left touch joystick to move and drag on the right side of the screen to look around.
- On touch devices, use the fullscreen button to hide browser chrome when the browser supports page fullscreen.
- On touch devices, swipe up from the bottom-center double-chevron area to let the browser collapse its address bar.
- Background music starts after the first click, key press, or touch interaction.

## URL Parameters

Quality profiles:

```text
?quality=low
?quality=balanced
?quality=high
```

The default profile is `balanced`. Frame rate and render scale can also be overridden:

```text
?fps=30
?scale=0.78
```

Examples:

```text
http://127.0.0.1:5181/?quality=low
http://127.0.0.1:5181/?quality=high&fps=60
```

## Verification

The project includes a Playwright scene verifier. It captures screenshots, checks for page errors, confirms the rendered image is not black, verifies camera movement, and reads debug stats:

```bash
npm run verify
```

Run the mobile verifier whenever interaction, layout, rendering, or performance behavior changes:

```bash
npm run verify:mobile
npm run verify:mobile:landscape
npm run verify:mobile:no-fullscreen
```

Set `TARGET_URL` to verify a specific local page:

```bash
TARGET_URL="http://127.0.0.1:5181/?quality=low" npm run verify
TARGET_URL="http://127.0.0.1:5181/?quality=low" npm run verify:mobile
TARGET_URL="http://127.0.0.1:5181/?quality=low" npm run verify:mobile:landscape
TARGET_URL="http://127.0.0.1:5181/?quality=low" npm run verify:mobile:no-fullscreen
```

Verifier screenshots are written to `artifacts/`, which is ignored by Git.

## Deployment

`vite.config.ts` sets the Vite base path to `/a-journey/`, and `.github/workflows/deploy.yml` builds `dist/` and deploys it through GitHub Actions whenever `main` is pushed.

## Project Structure

```text
.github/workflows/       GitHub Pages deployment workflow
src/app/                 App entry point and render loop
src/audio/               Background music playback and Web Audio processing
src/assets/audio/        Audio assets
src/assets/procedural/   Procedural mesh generation
src/renderer/            WebGL buffer, shader, and framebuffer helpers
src/scene/               Scene systems, camera, input, and debug stats
src/shaders/             GLSL shader strings
scripts/                 Verification scripts
```

## Version Control Notes

These paths are ignored by Git:

- `node_modules/`
- `dist/`
- `artifacts/`
- `target/`

`target/` is reserved for local reference images and is not required at runtime.
