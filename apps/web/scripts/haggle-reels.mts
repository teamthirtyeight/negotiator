/**
 * Batch haggle reels for seller outreach: turns a list of target sellers into phone-shaped (9:16) videos
 * of a shopper haggling with GhostCart's agent over that seller's own product, at that seller's prices.
 *
 *   pnpm haggle-reels <sellers.csv|sellers.json> [--out ./reels] [--caption en,hi,kn|none] [--port 3456]
 *                      [--no-ai] [--keep-db] [--pace 1]
 *
 * For each seller it creates a ZZ test business with a live GhostCart Shop and the one product (the
 * seller's floor as the product's price floor, the agent alone to halfway), runs its own `next dev` on a
 * spare port with the test payment gateway and a fixed login code, drives a scripted shopper through a
 * haggle that always closes, records the screen, and writes <handle>.mp4 plus results.csv/json.
 *
 * Local only: it refuses to run with DATABASE_URL or on Vercel, and never talks to a live partner API
 * (Vobiz, AgenticOrg, Pine Labs, Shiprocket and the rest are blanked for the server it starts). The
 * database it seeds, the server log and the frames live in a temp folder outside the repo (a database
 * folder inside apps/web makes Turbopack rebuild and reload on every request); it's removed at the end
 * unless --keep-db.
 */
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { inr, type NegotiationTerms } from "@ghostcart/core";
import { parseSellers } from "./haggle-reels/input";
import { CAPTION_LANGS, caption, closingOffer, fileStem, lowball, pushOffer, termsFor, type CaptionLang, type LiveState, type SellerRow } from "./haggle-reels/plan";

const run = promisify(execFile);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const WEB_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/** `pnpm haggle-reels` runs with cwd apps/web; paths the user typed are relative to where they ran it. */
const USER_CWD = process.env.INIT_CWD ?? process.cwd();
/** Outside the repo on purpose: see the note at the top. */
const WORK_DIR = path.join(tmpdir(), "ghostcart-haggle-reels");
const DB_DIR = path.join(WORK_DIR, "pglite");
const LOGIN_CODE = "246810";
const VIEWPORT = { width: 540, height: 960 };
const SCALE = 2; // 540×960 CSS px at 2× = 1080×1920 frames
const FPS = 12;
const MIN_SECONDS = 32;
const MAX_SECONDS = 45;

// ---------- arguments ----------

interface Args {
  input: string;
  out: string;
  captions: CaptionLang[];
  port: number;
  ai: boolean;
  keepDb: boolean;
  pace: number;
}

function usage(code: number): never {
  console.log(`Usage: pnpm haggle-reels <sellers.csv|sellers.json> [options]

Options:
  --out <dir>          Where the videos and results go (default ./reels)
  --caption <langs>    Caption line at the top: comma-separated en, hi, kn; or none (default en)
  --port <n>           Port for the dev server the tool starts (default 3456)
  --no-ai              Template agent replies even if ANTHROPIC_API_KEY is set (deterministic wording)
  --keep-db            Keep the seeded database (${DB_DIR}) after the run (default: removed)
  --pace <factor>      Stretch or shrink the pauses between beats (default 1)`);
  process.exit(code);
}

function parseArgs(argv: string[]): Args {
  const args: Args = { input: "", out: "reels", captions: ["en"], port: 3456, ai: true, keepDb: false, pace: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) usage(1);
      return v;
    };
    if (a === "--help" || a === "-h") usage(0);
    else if (a === "--out") args.out = next();
    else if (a === "--port") args.port = Number(next());
    else if (a === "--no-ai") args.ai = false;
    else if (a === "--keep-db") args.keepDb = true;
    else if (a === "--pace") args.pace = Number(next());
    else if (a === "--caption") {
      const v = next();
      args.captions = v === "none" ? [] : v.split(",").map((s) => s.trim() as CaptionLang);
      for (const l of args.captions) if (!CAPTION_LANGS.includes(l)) throw new Error(`Unknown caption language "${l}". Use en, hi, kn or none.`);
    } else if (a.startsWith("--")) throw new Error(`Unknown option ${a}`);
    else if (!args.input) args.input = a;
    else throw new Error(`Unexpected argument ${a}`);
  }
  if (!args.input) usage(1);
  if (!(args.port > 0 && args.port < 65536)) throw new Error("--port must be a port number.");
  if (!(args.pace > 0.2 && args.pace < 5)) throw new Error("--pace must be between 0.2 and 5.");
  return args;
}

// ---------- seeding (in-process, before the server starts) ----------

interface Seeded {
  row: SellerRow;
  storeName: string;
  slug: string;
  productId: string;
  shopperPhone: string;
  terms: NegotiationTerms;
}

/** A local photo is copied under public/uploads (what the seller upload route uses in dev); URLs stay. */
async function placePhoto(row: SellerRow, inputDir: string, base: string) {
  if (!row.photo) return undefined;
  if (/^https?:\/\//i.test(row.photo)) return row.photo;
  const src = path.resolve(inputDir, row.photo);
  const ext = path.extname(src).toLowerCase().replace(".jpeg", ".jpg");
  const rel = path.posix.join("uploads", "zz-reels", `${fileStem(row.handle)}${ext}`);
  const target = path.join(WEB_DIR, "public", rel);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(src, target);
  return `${base}/${rel}`;
}

async function seed(rows: SellerRow[], inputDir: string, base: string): Promise<Seeded[]> {
  // Imported only now: the lib opens the embedded database on first use, after PGLITE_DATA_DIR is set.
  const [{ getDb }, { createOrg }, { createProduct }, { setPolicy }, { createStore, updateStore }, { rulesFor }] = await Promise.all([
    import("../src/lib/db"),
    import("../src/lib/shop/orgs"),
    import("../src/lib/shop/products"),
    import("../src/lib/shop/policies"),
    import("../src/lib/shop/stores"),
    import("./haggle-reels/plan"),
  ]);
  const out: Seeded[] = [];
  for (const [i, row] of rows.entries()) {
    const storeName = row.shopName ?? row.handle;
    // Test numbers (CONTRIBUTING.md): nothing ever calls them, and the server this tool starts has no Vobiz.
    const ownerPhone = `+9190000${30000 + i}`;
    const shopperPhone = `+9190000${50000 + i}`;
    const org = await createOrg({ name: `ZZ Reel ${row.handle}`, ownerPhone, ownerName: `ZZ Reel Owner ${row.handle}` });
    const draft = await createStore({ orgId: org.id, name: storeName, platform: "ghostcart_shop" });
    // Live and trusted, as the mobile and load-test seeds do: a draft shop can't be haggled with, and the
    // "new" tier caps orders at ₹10,000.
    const store = (await updateStore(draft.id, { status: "live", tier: "trusted" }))!;
    const rules = rulesFor(row.listPrice, row.floorPrice);
    await setPolicy(store.id, "store", null, { maxDiscountPct: rules.maxDiscountPct, autoApprovePct: rules.autoApprovePct });
    const photo = await placePhoto(row, inputDir, base);
    const product = await createProduct(store.id, { title: row.product, price: row.listPrice, stock: 25, category: "Electronics", sku: `ZZREEL-${fileStem(row.handle).toUpperCase()}`, images: photo ? [photo] : [] }, "reel");
    await setPolicy(store.id, "product", product.id, { floorPrice: rules.floorPrice });
    out.push({ row, storeName, slug: store.slug, productId: product.id, shopperPhone, terms: termsFor(row, storeName) });
    console.log(`seeded ${row.handle}: ${row.product} ${inr(row.listPrice)} (floor ${inr(row.floorPrice)}, agent alone to ${inr(out[i].terms.autoLimit)}) → /s/${store.slug}/${product.id}`);
  }
  // Release the database files before the dev server opens the same folder.
  const db = (await getDb()) as unknown as { $client?: { close?: () => Promise<void> } };
  await db.$client?.close?.();
  return out;
}

// ---------- the dev server ----------

/** Env for the server: this tool's database, mock payments, a fixed login code, and no live partner API. */
function serverEnv(port: number, base: string, ai: boolean) {
  const blank = [
    "KV_REST_API_URL", "KV_REST_API_TOKEN", "DATABASE_URL", "DATABASE_URL_UNPOOLED",
    "VOBIZ_AUTH_ID", "VOBIZ_AUTH_TOKEN", "VOBIZ_FROM_NUMBER", "VOBIZ_DESK_PHONE",
    "AGENTICORG_AGENT_ID", "AGENTICORG_API_KEY", "AGENTICORG_EMAIL", "AGENTICORG_PASSWORD",
    "BLOB_READ_WRITE_TOKEN", "SHIPROCKET_EMAIL", "SHIPROCKET_PASSWORD", "KYC_PROVIDER",
    "TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN",
    "OTEL_EXPORTER_OTLP_ENDPOINT", "POSTHOG_KEY", "RESEND_API_KEY", "EXPO_ACCESS_TOKEN",
    "SHOPIFY_API_KEY", "SHOPIFY_API_SECRET", "META_APP_SECRET", "FLIPKART_APP_SECRET", "WHATSAPP_ORDER_TOKEN",
    "FIRECRAWL_API_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "MCP_TOKEN", "ADMIN_TOKEN", "EXPERIMENTS", "DEMO_SIMULATE",
  ];
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of blank) env[k] = "";
  Object.assign(env, {
    PORT: String(port),
    PGLITE_DATA_DIR: DB_DIR,
    STORE_MODE: "redis", // the in-memory store (no Redis is configured), like `pnpm dev` without Upstash
    E2E_LOGIN_CODE: LOGIN_CODE,
    NEXT_PUBLIC_APP_URL: base,
    PINELABS_MODE: "mock",
    PINELABS_BASE_URL: `${base}/api/mock-pinelabs`,
    PINELABS_CLIENT_ID: "zz-reels",
    PINELABS_CLIENT_SECRET: "zz-reels",
    SETTLEMENT_PROVIDER: "mock", // the shop refuses haggles without a settlement gateway; mock holds nothing real
    NODE_ENV: "development",
  });
  if (!ai) env.ANTHROPIC_API_KEY = "";
  return env;
}

function portFree(port: number) {
  return new Promise<boolean>((resolve) => {
    const s = createServer();
    s.once("error", () => resolve(false));
    s.listen(port, "127.0.0.1", () => s.close(() => resolve(true)));
  });
}

async function startServer(port: number, base: string, ai: boolean, logFile: string) {
  if (!(await portFree(port))) throw new Error(`Port ${port} is in use. Pass --port with a free one (don't point this at a running \`pnpm dev\`).`);
  const { openSync } = await import("node:fs");
  const log = openSync(logFile, "w");
  const child = spawn(path.join(WEB_DIR, "node_modules", ".bin", "next"), ["dev", "-p", String(port)], {
    cwd: WEB_DIR,
    env: serverEnv(port, base, ai),
    detached: true, // its own process group, so every helper process goes with it
    stdio: ["ignore", log, log],
  });
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`The dev server exited early (see ${logFile}).`);
    try {
      const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) return child;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(`The dev server didn't answer on ${base} within 3 minutes (see ${logFile}).`);
}

function stopServer(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null || !child.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
}

// ---------- recording ----------

interface Frame {
  file: string;
  at: number;
}

/** Screenshots on a timer: the only capture that honours the 2× device scale, so the reel is a true 1080×1920. */
function startRecorder(page: Page, dir: string) {
  const frames: Frame[] = [];
  let on = true;
  let n = 0;
  const loop = (async () => {
    while (on) {
      const t0 = Date.now();
      try {
        const buf = await page.screenshot({ type: "jpeg", quality: 88, caret: "initial", timeout: 4000 });
        const file = path.join(dir, `f${String(++n).padStart(5, "0")}.jpg`);
        await writeFile(file, buf);
        frames.push({ file, at: t0 });
      } catch {
        // mid-navigation or closing: the previous frame simply lasts longer
      }
      const wait = 1000 / FPS - (Date.now() - t0);
      if (wait > 0) await sleep(wait);
    }
  })();
  return {
    stop: async () => {
      on = false;
      await loop;
      return frames;
    },
  };
}

interface PublicDealLite {
  status: string;
  dealPrice: number;
  negotiation?: { currentOffer: number; rounds: number; messages: { from: string; text: string; price?: number }[] };
}

interface ReelResult {
  handle: string;
  product: string;
  file: string;
  variants: string[];
  listPrice: number;
  floorPrice: number;
  openingOffer: number | null;
  closingPrice: number | null;
  durationSeconds: number | null;
  dealId: string | null;
  storeUrl: string;
  transcript: string[];
  failure: string | null;
}

async function recordSeller(browser: Browser, s: Seeded, base: string, framesDir: string, pace: number, browserLog: string) {
  const hold = (ms: number) => sleep(ms * pace);
  const ctx: BrowserContext = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE, isMobile: true, hasTouch: true, colorScheme: "dark", locale: "en-IN" });
  const page = await ctx.newPage();
  // What the page said, for when a recording fails (navigations, console errors, HMR reloads).
  const log: string[] = [];
  const note = (line: string) => log.push(`${new Date().toISOString()} ${line}`);
  page.on("console", (m) => note(`console.${m.type()} ${m.text().slice(0, 300)}`));
  page.on("pageerror", (e) => note(`pageerror ${e.message.slice(0, 300)}`));
  page.on("framenavigated", (f) => f === page.mainFrame() && note(`navigated ${f.url()}`));
  const flush = () => writeFile(browserLog, `${log.join("\n")}\n`);
  // The dev server's floating Next.js badge would otherwise sit in every frame.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
  const deal = async (id: string): Promise<PublicDealLite> => (await ctx.request.get(`${base}/api/deal?id=${id}`)).json();
  try {
    // The shopper signs up through the normal two-step API (the context shares the cookie jar with the page).
    const signup = { name: "ZZ Reel Shopper", phone: s.shopperPhone, consent: true, source: "reel" };
    const sent = await ctx.request.post(`${base}/api/signup`, { data: signup });
    if (!sent.ok()) throw new Error(`signup step 1 failed: ${(await sent.text()).slice(0, 200)}`);
    const verified = await ctx.request.post(`${base}/api/signup`, { data: { ...signup, code: LOGIN_CODE } });
    if (!verified.ok()) throw new Error(`signup step 2 failed: ${(await verified.text()).slice(0, 200)}`);

    const started = Date.now();
    const rec = startRecorder(page, framesDir);
    // Beat 1: the seller's product page, with photo, name and list price.
    await page.goto(`${base}/s/${s.slug}/${s.productId}`, { waitUntil: "load", timeout: 60_000 });
    const offerButton = page.getByRole("button", { name: /make an offer/i });
    await offerButton.waitFor({ timeout: 30_000 });
    await hold(3500);
    // Beat 2: the agent opens.
    await offerButton.click();
    await page.waitForURL(/\/deal\//, { timeout: 60_000 });
    const dealId = page.url().split("/deal/")[1].split(/[?#]/)[0];
    const input = page.locator("#counter-offer");
    await input.waitFor({ timeout: 60_000 });
    let d = await deal(dealId);
    if (d.negotiation?.currentOffer !== s.terms.opening) console.warn(`  ${s.row.handle}: agent opened at ${d.negotiation?.currentOffer}, expected ${s.terms.opening}`);
    await hold(3500);

    const live = (x: PublicDealLite): LiveState => ({ currentOffer: x.negotiation!.currentOffer, rounds: x.negotiation!.rounds });
    const counter = async (price: number) => {
      const before = d.negotiation!.messages.length;
      await input.scrollIntoViewIfNeeded();
      await input.click();
      await input.pressSequentially(String(price), { delay: 110 * pace });
      await hold(500);
      await input.press("Enter");
      const deadline = Date.now() + 90_000;
      for (;;) {
        await sleep(250);
        d = await deal(dealId);
        const answered = (d.negotiation?.messages.length ?? 0) >= before + 2 || d.status !== "negotiating";
        if (answered && !(await page.getByText("Seller agent is thinking").count())) break;
        if (Date.now() > deadline) throw new Error(`no reply to ${inr(price)} within 90s`);
      }
      await hold(3500);
    };

    // Beats 3–5: lowball under the floor, a push the agent still concedes to, then a close.
    const opening = lowball(s.terms);
    await counter(opening);
    const o2 = d.status === "negotiating" ? pushOffer(s.terms, live(d)) : null;
    if (o2 !== null) await counter(o2);
    const o3 = d.status === "negotiating" ? closingOffer(s.terms, live(d), o2 ?? opening) : null;
    if (o3 !== null) await counter(o3);
    if (d.status === "negotiating") {
      await page.getByRole("button", { name: /^Take it at/ }).click();
      const deadline = Date.now() + 60_000;
      while (d.status === "negotiating" && Date.now() < deadline) {
        await sleep(300);
        d = await deal(dealId);
      }
    }
    if (d.status !== "pending") throw new Error(`the deal ended as "${d.status}" instead of an agreed price`);

    // Beat 6: the agreed price on the invoice, then the receipt.
    await page.getByText("GHOSTCART FLASH INVOICE").waitFor({ timeout: 30_000 });
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await hold(3000);
    await page.getByText("Deal price").scrollIntoViewIfNeeded();
    await hold(3000);
    while (Date.now() - started < MIN_SECONDS * 1000) await sleep(200);
    const frames = await rec.stop();
    const transcript = d.negotiation!.messages.map((m) => `${m.from === "shopper" ? "Shopper" : "Agent"}: ${m.text}`);
    return { frames, dealId, openingOffer: opening, closingPrice: d.dealPrice, transcript };
  } finally {
    await ctx.close();
    await flush().catch(() => {});
  }
}

// ---------- encoding ----------

/** The caption rendered by the browser (system fonts shape Devanagari and Kannada properly), as a transparent PNG strip. */
async function captionImage(browser: Browser, text: string, file: string) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 400 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.setContent(
    `<body style="margin:0;background:transparent"><div id="bar" style="box-sizing:border-box;width:1080px;padding:30px 44px 26px;background:rgba(21,19,31,.94);color:#edeaf5;border-bottom:5px solid #f4b740;font:600 38px/1.35 -apple-system,'Segoe UI','Kohinoor Devanagari','Noto Sans Kannada','Noto Sans Devanagari',system-ui,sans-serif">${text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</div></body>`,
  );
  await page.locator("#bar").screenshot({ path: file, omitBackground: true });
  await ctx.close();
}

async function encode(frames: Frame[], out: string, captionPng?: string) {
  if (!frames.length) throw new Error("no frames were captured");
  const list = frames
    .map((f, i) => {
      const next = frames[i + 1]?.at ?? f.at + 1000 / FPS;
      return `file '${f.file}'\nduration ${Math.max(0.02, (next - f.at) / 1000).toFixed(3)}`;
    })
    .join("\n");
  const listFile = path.join(path.dirname(frames[0].file), `${path.basename(out, ".mp4")}.txt`);
  await writeFile(listFile, `${list}\nfile '${frames.at(-1)!.file}'\n`);
  const video = `[0:v]fps=30,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=#15131f,setsar=1`;
  const filter = captionPng ? `${video}[v0];[v0][1:v]overlay=0:0[v]` : `${video}[v]`;
  const inputs = ["-f", "concat", "-safe", "0", "-i", listFile, ...(captionPng ? ["-i", captionPng] : []), "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo"];
  const audioIndex = captionPng ? 2 : 1;
  await run("ffmpeg", [
    "-y", "-v", "error", ...inputs,
    "-filter_complex", filter, "-map", "[v]", "-map", `${audioIndex}:a`,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "64k", "-shortest", "-t", String(MAX_SECONDS), "-movflags", "+faststart", out,
  ]);
  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]);
  return Math.round(Number(stdout.trim()) * 10) / 10;
}

// ---------- results ----------

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

async function writeResults(results: ReelResult[], outDir: string) {
  const header = ["handle", "product", "file", "list_price", "floor_price", "opening_offer", "closing_price", "off_list", "duration_s", "variants", "dm_line", "failure"];
  const lines = results.map((r) =>
    [
      r.handle, r.product, r.file, r.listPrice, r.floorPrice, r.openingOffer, r.closingPrice,
      r.closingPrice === null ? "" : r.listPrice - r.closingPrice, r.durationSeconds, r.variants.join(" "),
      r.closingPrice === null || r.openingOffer === null ? "" : caption("en", r.product, r.openingOffer, r.closingPrice), r.failure,
    ]
      .map(csvCell)
      .join(","),
  );
  await writeFile(path.join(outDir, "results.csv"), `${header.join(",")}\n${lines.join("\n")}\n`);
  await writeFile(path.join(outDir, "results.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
}

// ---------- main ----------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (process.env.DATABASE_URL || process.env.VERCEL_ENV) {
    console.error("Refusing: haggle reels run on a local embedded database only (unset DATABASE_URL; never on Vercel).");
    process.exit(1);
  }
  const inputPath = path.resolve(USER_CWD, args.input);
  const outDir = path.resolve(USER_CWD, args.out);
  const format = inputPath.toLowerCase().endsWith(".json") ? "json" : "csv";
  const { rows, errors } = parseSellers(await readFile(inputPath, "utf8"), format);
  for (const e of errors) console.warn(`skipping: ${e}`);
  if (!rows.length) {
    console.error("No sellers to record.");
    process.exit(1);
  }
  const base = `http://localhost:${args.port}`;
  // Everything the run writes while the server is up goes here, so nothing lands in the repo tree the dev
  // watcher is looking at; the finished files are copied to --out at the end.
  await rm(WORK_DIR, { recursive: true, force: true });
  const staged = path.join(WORK_DIR, "out");
  const tmp = path.join(WORK_DIR, "frames");
  await mkdir(staged, { recursive: true });
  await mkdir(tmp, { recursive: true });

  process.chdir(WEB_DIR); // the lib resolves its migrations folder from apps/web
  process.env.PGLITE_DATA_DIR = DB_DIR;
  console.log(`Seeding ${rows.length} seller${rows.length === 1 ? "" : "s"} into ${DB_DIR}…`);
  const seeded = await seed(rows, path.dirname(inputPath), base);

  let server: ChildProcess | undefined;
  let browser: Browser | undefined;
  const cleanup = async () => {
    await browser?.close().catch(() => {});
    stopServer(server);
    // Only now, with the server gone: --out may be inside the repo, which the dev watcher is looking at.
    await mkdir(outDir, { recursive: true });
    for (const name of await readdir(staged)) await copyFile(path.join(staged, name), path.join(outDir, name));
    if (args.keepDb) console.log(`Kept the seeded database at ${DB_DIR}`);
    else await rm(DB_DIR, { recursive: true, force: true });
    await rm(tmp, { recursive: true, force: true });
    await rm(staged, { recursive: true, force: true });
  };
  process.on("SIGINT", () => {
    stopServer(server);
    process.exit(130);
  });

  const results: ReelResult[] = [];
  try {
    console.log(`Starting the dev server on ${base} (log: ${path.join(outDir, "dev-server.log")} once done)…`);
    server = await startServer(args.port, base, args.ai, path.join(staged, "dev-server.log"));
    // Compile the two pages once, so the first recording doesn't wait on Turbopack.
    await fetch(`${base}/s/${seeded[0].slug}/${seeded[0].productId}`).catch(() => {});
    await fetch(`${base}/deal/warmup`).catch(() => {});
    browser = await chromium.launch();

    for (const s of seeded) {
      const stem = fileStem(s.row.handle);
      const result: ReelResult = {
        handle: s.row.handle, product: s.row.product, file: "", variants: [], listPrice: s.row.listPrice, floorPrice: s.row.floorPrice,
        openingOffer: null, closingPrice: null, durationSeconds: null, dealId: null, storeUrl: `${base}/s/${s.slug}/${s.productId}`, transcript: [], failure: null,
      };
      results.push(result);
      const framesDir = path.join(tmp, stem);
      await mkdir(framesDir, { recursive: true });
      try {
        console.log(`Recording ${s.row.handle}…`);
        const rec = await recordSeller(browser, s, base, framesDir, args.pace, path.join(staged, `browser-${stem}.log`));
        Object.assign(result, { dealId: rec.dealId, openingOffer: rec.openingOffer, closingPrice: rec.closingPrice, transcript: rec.transcript });
        const langs: (CaptionLang | null)[] = args.captions.length ? args.captions : [null];
        for (const [i, lang] of langs.entries()) {
          let png: string | undefined;
          if (lang) {
            png = path.join(framesDir, `caption-${lang}.png`);
            await captionImage(browser, caption(lang, s.row.product, rec.openingOffer, rec.closingPrice), png);
          }
          const name = i === 0 ? `${stem}.mp4` : `${stem}.${lang}.mp4`;
          const seconds = await encode(rec.frames, path.join(staged, name), png);
          const file = path.join(outDir, name);
          if (i === 0) Object.assign(result, { file, durationSeconds: seconds });
          else result.variants.push(file);
        }
        console.log(`  ${result.file} (${result.durationSeconds}s): pushed for ${inr(rec.openingOffer)}, closed at ${inr(rec.closingPrice)}`);
      } catch (err) {
        result.failure = err instanceof Error ? err.message : String(err);
        console.error(`  failed: ${result.failure}`);
      } finally {
        await rm(framesDir, { recursive: true, force: true });
      }
    }
  } finally {
    await writeResults(results, staged).catch((err) => console.error("couldn't write results", err));
    await cleanup();
  }
  const ok = results.filter((r) => !r.failure).length;
  console.log(`Done: ${ok}/${results.length} reels in ${outDir} (results.csv, results.json).`);
  process.exit(ok === results.length ? 0 : 2);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
