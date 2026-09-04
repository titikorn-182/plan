import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const [url = "http://127.0.0.1:3000", widthArg = "1440", heightArg = "900", outputArg = ".impeccable/review/desktop.png"] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);
const output = path.resolve(outputArg);
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9333 + Math.floor(Math.random() * 400);
const profile = await mkdtemp(path.join(tmpdir(), "impeccable-cdp-"));

await mkdir(path.dirname(output), { recursive: true });

const chrome = spawn(chromePath, [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--disable-gpu-sandbox",
  "--disable-dev-shm-usage",
  "--use-gl=swiftshader",
  "--hide-scrollbars",
  "--no-first-run",
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore", windowsHide: true });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function fetchJson(endpoint, options) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(endpoint, options);
      if (response.ok) return response.json();
    } catch {
      // Chrome may still be starting.
    }
    await delay(150);
  }
  throw new Error(`Chrome DevTools endpoint did not become ready: ${endpoint}`);
}

let socket;
try {
  await fetchJson(`http://127.0.0.1:${port}/json/version`);
  const target = await fetchJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    id += 1;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width <= 600,
    screenWidth: width,
    screenHeight: height,
  });
  await send("Page.navigate", { url });
  await delay(1800);
  await send("Runtime.evaluate", {
    expression: `document.getAnimations().forEach((animation) => animation.finish()); new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
    awaitPromise: true,
  });
  const dimensions = await send("Runtime.evaluate", {
    expression: `({ width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) })`,
    returnByValue: true,
  });
  const pageWidth = Math.max(width, Math.min(dimensions.result.value.width, width));
  const pageHeight = Math.min(12000, Math.max(height, dimensions.result.value.height));
  const capture = await send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: pageWidth, height: pageHeight, scale: 1 },
  });
  await writeFile(output, Buffer.from(capture.data, "base64"));
  process.stdout.write(`${output} ${pageWidth}x${pageHeight}\n`);
} finally {
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  chrome.kill();
  await Promise.race([
    new Promise((resolve) => chrome.once("exit", resolve)),
    delay(1200),
  ]);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rm(profile, { recursive: true, force: true });
      break;
    } catch (error) {
      if (error?.code !== "EBUSY" || attempt === 5) break;
      await delay(250);
    }
  }
}
