import { mkdir } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { chromium } from "playwright-core";

const targetUrl = process.env.TARGET_URL ?? "http://127.0.0.1:5181/";
const verifyDevice = process.env.VERIFY_DEVICE === "mobile" ? "mobile" : "desktop";
const isMobile = verifyDevice === "mobile";
const verifyOrientation = isMobile && process.env.VERIFY_ORIENTATION === "landscape" ? "landscape" : "portrait";
const simulateUnsupportedFullscreen = isMobile && process.env.VERIFY_FULLSCREEN_UNSUPPORTED === "1";
const verifyLabel = isMobile ? `${verifyDevice}-${verifyOrientation}` : verifyDevice;
const viewport = isMobile
  ? verifyOrientation === "landscape"
    ? { width: 844, height: 390 }
    : { width: 390, height: 844 }
  : { width: 1365, height: 768 };
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const screenshotPath = `artifacts/scene-check-${verifyLabel}-${runId}.png`;
const skyTurnScreenshotPath = `artifacts/scene-check-sky-turn-${verifyLabel}-${runId}.png`;
const latestScreenshotPath = `artifacts/scene-check-${verifyLabel}.png`;
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

await mkdir("artifacts", { recursive: true });

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--use-angle=swiftshader",
    `--window-size=${viewport.width},${viewport.height}`
  ]
});

const page = await browser.newPage({
  viewport,
  deviceScaleFactor: isMobile ? 2 : 1,
  hasTouch: isMobile,
  isMobile
});

if (isMobile) {
  await page.addInitScript((unsupportedFullscreen) => {
    if (unsupportedFullscreen) {
      Object.defineProperty(Element.prototype, "requestFullscreen", {
        configurable: true,
        value: undefined
      });
      Object.defineProperty(Element.prototype, "webkitRequestFullscreen", {
        configurable: true,
        value: undefined
      });
      Object.defineProperty(HTMLElement.prototype, "webkitRequestFullscreen", {
        configurable: true,
        value: undefined
      });
    }

    const audioVerify = {
      playCalls: 0,
      playResolved: 0,
      playRejected: 0,
      resumeCalls: 0,
      resumeResolved: 0,
      resumeRejected: 0
    };
    Object.defineProperty(window, "__audioVerify", {
      configurable: true,
      value: audioVerify
    });

    const originalPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      audioVerify.playCalls += 1;
      const result = originalPlay.apply(this, args);
      if (result && typeof result.then === "function") {
        result.then(
          () => {
            audioVerify.playResolved += 1;
          },
          () => {
            audioVerify.playRejected += 1;
          }
        );
      }
      return result;
    };

    const audioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    const originalResume = audioContextConstructor?.prototype?.resume;
    if (audioContextConstructor && originalResume) {
      audioContextConstructor.prototype.resume = function (...args) {
        audioVerify.resumeCalls += 1;
        const result = originalResume.apply(this, args);
        if (result && typeof result.then === "function") {
          result.then(
            () => {
              audioVerify.resumeResolved += 1;
            },
            () => {
              audioVerify.resumeRejected += 1;
            }
          );
        }
        return result;
      };
    }
  }, simulateUnsupportedFullscreen);
}

const messages = [];
const pageErrors = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) {
    if (message.text().includes("favicon.ico")) {
      return;
    }
    messages.push(`${message.type()}: ${message.text()}`);
  }
});

page.on("pageerror", (error) => {
  const text = error.stack ?? error.message;
  if (text.trim()) {
    pageErrors.push(text);
  }
});

const target = new URL(targetUrl);
target.searchParams.set("__verify", runId);
await page.goto(target.toString(), { waitUntil: "networkidle", timeout: 15000 });
await page.waitForFunction(
  () => {
    const canvas = document.querySelector("canvas");
    return canvas instanceof HTMLCanvasElement && canvas.width > 100 && canvas.height > 100;
  },
  null,
  { timeout: 8000 }
);
await page.waitForTimeout(600);

if (isMobile) {
  await page.touchscreen.tap(viewport.width * 0.78, viewport.height * 0.72);
  await page.waitForTimeout(300);
}

const canvasStats = await page.evaluate(() => {
  const canvas = document.querySelector("canvas");
  const overlay = document.querySelector(".debug-overlay");
  const fullscreenButton = document.querySelector(".fullscreen-button");
  const fullscreenButtonStyle = fullscreenButton instanceof HTMLElement ? getComputedStyle(fullscreenButton) : null;
  const browserChromeSwipe = document.querySelector(".browser-chrome-swipe");
  const browserChromeSwipeStyle = browserChromeSwipe instanceof HTMLElement ? getComputedStyle(browserChromeSwipe) : null;
  const scrollingElement = document.scrollingElement;
  const fullscreenTarget = document.documentElement;
  const fullscreenSupported =
    typeof fullscreenTarget.requestFullscreen === "function" ||
    typeof fullscreenTarget.webkitRequestFullscreen === "function";

  if (!(canvas instanceof HTMLCanvasElement)) {
    return { ok: false, reason: "missing canvas" };
  }

  const sample = document.createElement("canvas");
  sample.width = 96;
  sample.height = 54;
  const ctx = sample.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return { ok: false, reason: "missing 2d context" };
  }

  ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
  const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let nonBlack = 0;
  let redDominant = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    red += r;
    green += g;
    blue += b;

    if (r + g + b > 18) {
      nonBlack += 1;
    }

    if (r > g * 1.8 && r > b * 2.4 && r > 24) {
      redDominant += 1;
    }
  }

  const count = pixels.length / 4;
  return {
    ok: true,
    width: canvas.width,
    height: canvas.height,
    clientWidth: canvas.clientWidth,
    clientHeight: canvas.clientHeight,
    avg: [red / count, green / count, blue / count],
    nonBlackRatio: nonBlack / count,
    redDominantRatio: redDominant / count,
    touchControlsPresent: Boolean(document.querySelector(".touch-controls")),
    fullscreenButtonPresent: Boolean(fullscreenButton),
    fullscreenSupported,
    fullscreenButtonVisible:
      Boolean(fullscreenButtonStyle) &&
      fullscreenButtonStyle?.display !== "none" &&
      fullscreenButtonStyle?.visibility !== "hidden" &&
      Number(fullscreenButtonStyle?.opacity ?? 0) > 0,
    browserChromeSwipePresent: Boolean(browserChromeSwipe),
    browserChromeSwipeVisible:
      Boolean(browserChromeSwipeStyle) &&
      browserChromeSwipeStyle?.display !== "none" &&
      browserChromeSwipeStyle?.visibility !== "hidden",
    scrollHeight: scrollingElement?.scrollHeight ?? 0,
    innerHeight: window.innerHeight,
    canScrollForBrowserChrome: (scrollingElement?.scrollHeight ?? 0) > window.innerHeight + 40,
    manifestHref: document.querySelector('link[rel="manifest"]')?.getAttribute("href") ?? "",
    overlayText: overlay?.textContent ?? ""
  };
});

const screenshot = await page.screenshot({ path: screenshotPath, fullPage: false });
await page.screenshot({ path: latestScreenshotPath, fullPage: false });
if (isMobile) {
  await dragTouchPointer(page, viewport.width * 0.70, viewport.height * 0.42, viewport.width * 0.88, viewport.height * 0.45, 14, 31);
} else {
  await page.mouse.move(500, 260);
  await page.mouse.down();
  await page.mouse.move(760, 292, { steps: 14 });
  await page.mouse.up();
}
await page.waitForTimeout(360);
const skyTurnScreenshot = await page.screenshot({ path: skyTurnScreenshotPath, fullPage: false });
await page.keyboard.press("F");
await page.waitForFunction(
  () => document.querySelector(".debug-overlay")?.textContent?.includes("FPS"),
  null,
  { timeout: 5000 }
);
const debugTextBeforeMove = await page.locator(".debug-overlay").textContent();
if (isMobile) {
  await holdTouchPointer(
    page,
    viewport.width * 0.22,
    viewport.height * 0.78,
    viewport.width * 0.22,
    viewport.height * 0.64,
    14,
    900,
    41
  );
} else {
  await page.keyboard.down("w");
  await page.waitForTimeout(900);
  await page.keyboard.up("w");
}
await page.waitForTimeout(250);
const debugTextAfterMove = await page.locator(".debug-overlay").textContent();
const audioStats = isMobile
  ? await page.evaluate(() => {
      const audio = document.querySelector("audio");
      return {
        verify: window.__audioVerify ?? null,
        elementPresent: audio instanceof HTMLAudioElement,
        paused: audio instanceof HTMLAudioElement ? audio.paused : null,
        volume: audio instanceof HTMLAudioElement ? audio.volume : null,
        readyState: audio instanceof HTMLAudioElement ? audio.readyState : null,
        currentTime: audio instanceof HTMLAudioElement ? audio.currentTime : null,
        src: audio instanceof HTMLAudioElement ? audio.currentSrc || audio.src : ""
      };
    })
  : null;
await browser.close();

const screenshotStats = analyzePngScreenshot(screenshot);
const skyCameraDelta = compareSkyRegion(screenshot, skyTurnScreenshot);
const cameraMoved = parseCameraZ(debugTextAfterMove) !== parseCameraZ(debugTextBeforeMove);

console.log(
  JSON.stringify(
    {
      targetUrl,
      verifyDevice,
      verifyOrientation: isMobile ? verifyOrientation : null,
      simulateUnsupportedFullscreen,
      screenshotPath,
      skyTurnScreenshotPath,
      latestScreenshotPath,
      canvasStats,
      audioStats,
      screenshotStats,
      skyCameraDelta,
      debugTextBeforeMove,
      debugTextAfterMove,
      cameraMoved,
      messages,
      pageErrors
    },
    null,
    2
  )
);

if (pageErrors.length > 0 || messages.some((message) => message.startsWith("error:"))) {
  process.exitCode = 1;
} else if (screenshotStats.nonBlackRatio < 0.2 || screenshotStats.redDominantRatio < 0.2) {
  process.exitCode = 2;
} else if (
  isMobile &&
  (!canvasStats.touchControlsPresent ||
    (canvasStats.fullscreenSupported && !canvasStats.fullscreenButtonVisible) ||
    (!canvasStats.fullscreenSupported && canvasStats.fullscreenButtonVisible) ||
    !canvasStats.browserChromeSwipeVisible ||
    !canvasStats.canScrollForBrowserChrome ||
    !canvasStats.manifestHref.includes("manifest.webmanifest"))
) {
  process.exitCode = 4;
} else if (
  isMobile &&
  (!audioStats ||
    !audioStats.elementPresent ||
    audioStats.paused ||
    !audioStats.verify ||
    audioStats.verify.playCalls < 1 ||
    audioStats.verify.playRejected > 0 ||
    typeof audioStats.volume !== "number" ||
    audioStats.volume <= 0 ||
    audioStats.volume > 0.32)
) {
  process.exitCode = 5;
} else if (!debugTextBeforeMove?.includes("Draw") || !debugTextBeforeMove.includes("Grass inst") || !cameraMoved || skyCameraDelta.avgAbsDiff < 1.8) {
  process.exitCode = 3;
}

async function dragTouchPointer(page, startX, startY, endX, endY, steps, pointerId) {
  await dispatchTouchPointer(page, "pointerdown", startX, startY, pointerId);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await dispatchTouchPointer(page, "pointermove", startX + (endX - startX) * t, startY + (endY - startY) * t, pointerId);
    await page.waitForTimeout(16);
  }
  await dispatchTouchPointer(page, "pointerup", endX, endY, pointerId);
}

async function holdTouchPointer(page, startX, startY, endX, endY, steps, holdMs, pointerId) {
  await dispatchTouchPointer(page, "pointerdown", startX, startY, pointerId);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    await dispatchTouchPointer(page, "pointermove", startX + (endX - startX) * t, startY + (endY - startY) * t, pointerId);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(holdMs);
  await dispatchTouchPointer(page, "pointerup", endX, endY, pointerId);
}

async function dispatchTouchPointer(page, type, x, y, pointerId) {
  await page.evaluate(
    ({ type, x, y, pointerId }) => {
      const canvas = document.querySelector("canvas");
      if (!(canvas instanceof HTMLCanvasElement)) return;
      const target = type === "pointerdown" ? canvas : window;
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          cancelable: true,
          pointerId,
          pointerType: "touch",
          isPrimary: true,
          clientX: x,
          clientY: y,
          buttons: type === "pointerup" ? 0 : 1,
          pressure: type === "pointerup" ? 0 : 0.5
        })
      );
    },
    { type, x, y, pointerId }
  );
}

function parseCameraZ(text) {
  const match = text?.match(/Cam\s+[-\d.]+,\s+[-\d.]+,\s+([-\d.]+)/);
  return match ? Number(match[1]) : Number.NaN;
}

function analyzePngScreenshot(buffer) {
  const png = decodePng(buffer);
  let red = 0;
  let green = 0;
  let blue = 0;
  let nonBlack = 0;
  let redDominant = 0;
  const stride = png.channels;

  for (let i = 0; i < png.pixels.length; i += stride) {
    const r = png.pixels[i] ?? 0;
    const g = png.pixels[i + 1] ?? 0;
    const b = png.pixels[i + 2] ?? 0;
    red += r;
    green += g;
    blue += b;
    if (r + g + b > 18) nonBlack += 1;
    if (r > g * 1.8 && r > b * 2.4 && r > 24) redDominant += 1;
  }

  const count = png.width * png.height;
  return {
    width: png.width,
    height: png.height,
    avg: [red / count, green / count, blue / count],
    nonBlackRatio: nonBlack / count,
    redDominantRatio: redDominant / count
  };
}

function compareSkyRegion(beforeBuffer, afterBuffer) {
  const before = decodePng(beforeBuffer);
  const after = decodePng(afterBuffer);
  const width = Math.min(before.width, after.width);
  const height = Math.min(before.height, after.height);
  const yMax = Math.floor(height * 0.68);
  let diff = 0;
  let count = 0;

  for (let y = 0; y < yMax; y++) {
    for (let x = 0; x < width; x++) {
      const bi = (y * before.width + x) * before.channels;
      const ai = (y * after.width + x) * after.channels;
      diff += Math.abs((before.pixels[bi] ?? 0) - (after.pixels[ai] ?? 0));
      diff += Math.abs((before.pixels[bi + 1] ?? 0) - (after.pixels[ai + 1] ?? 0));
      diff += Math.abs((before.pixels[bi + 2] ?? 0) - (after.pixels[ai + 2] ?? 0));
      count += 3;
    }
  }

  return { avgAbsDiff: diff / Math.max(1, count), sampledPixels: width * yMax };
}

function decodePng(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error("Screenshot is not a PNG.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format bitDepth=${bitDepth} colorType=${colorType}.`);
  }

  const channels = colorType === 6 ? 4 : 3;
  const compressed = Buffer.concat(idat);
  const raw = inflateSync(compressed);
  const rowBytes = width * channels;
  const pixels = new Uint8Array(width * height * channels);
  let src = 0;
  let dst = 0;
  const prior = new Uint8Array(rowBytes);
  const row = new Uint8Array(rowBytes);

  for (let y = 0; y < height; y++) {
    const filter = raw[src++] ?? 0;
    row.fill(0);
    for (let x = 0; x < rowBytes; x++) {
      const value = raw[src++] ?? 0;
      const left = x >= channels ? row[x - channels] ?? 0 : 0;
      const up = prior[x] ?? 0;
      const upLeft = x >= channels ? prior[x - channels] ?? 0 : 0;
      row[x] = (value + pngFilter(filter, left, up, upLeft)) & 255;
    }
    pixels.set(row, dst);
    prior.set(row);
    dst += rowBytes;
  }

  return { width, height, channels, pixels };
}

function pngFilter(filter, left, up, upLeft) {
  if (filter === 0) return 0;
  if (filter === 1) return left;
  if (filter === 2) return up;
  if (filter === 3) return Math.floor((left + up) / 2);
  if (filter === 4) {
    const p = left + up - upLeft;
    const pa = Math.abs(p - left);
    const pb = Math.abs(p - up);
    const pc = Math.abs(p - upLeft);
    if (pa <= pb && pa <= pc) return left;
    return pb <= pc ? up : upLeft;
  }
  throw new Error(`Unsupported PNG filter ${filter}.`);
}
