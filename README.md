# GhostCart

An AI negotiation agent: a shopper haggles live with an agent that has a real discount budget, a human approves
anything past its limit, and the agreed price is locked with a Pine Labs UPI payment. Where we're taking it:
[docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md). How we work: [CLAUDE.md](CLAUDE.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## Local
```bash
pnpm install
cp .env.example apps/web/.env.local   # fill in ANTHROPIC_API_KEY, PINELABS_* (or PINELABS_MODE=mock)
pnpm dev
pnpm test
```
Without Redis env vars, deals live in memory (single process only).

## Deploy (Vercel)
1. Project Root Directory: `apps/web`. Add **Upstash Redis** from the Vercel Marketplace (injects `KV_REST_API_URL` / `KV_REST_API_TOKEN`).
2. Set the remaining env vars from `.env.example`: `NEXT_PUBLIC_APP_URL` (production URL), `STAFF`, `VOBIZ_*` (login codes), Pine Labs keys.
3. Ask Pine Labs to point webhooks at `https://<app>/api/webhooks/pinelabs` and set `PINELABS_WEBHOOK_SECRET`.

## Haggle reels (seller outreach)

Turns a list of target sellers into phone-shaped videos of a shopper haggling with GhostCart's agent over
that seller's own product, at that seller's prices: the opening DM for the Bengaluru launch wedge
([docs/launch.md](docs/launch.md)). Local only; it needs `ffmpeg` on the PATH and Playwright's Chromium
(`pnpm --filter @ghostcart/web exec playwright install chromium`, once).

```bash
pnpm haggle-reels apps/web/scripts/haggle-reels/sample/sellers.csv --out ./reels --caption en,hi,kn
```

**Input** (CSV with a header row, or a JSON array with the same keys), one row per seller:

| column | meaning |
| --- | --- |
| `handle` | Instagram handle, with or without `@` (also `instagram`, `username`) |
| `product` | the product shown and haggled over (also `title`, `item`) |
| `photo` | product photo: an http(s) URL or a local `.jpg`/`.png`/`.webp` path relative to the file; optional |
| `price` | listed price in whole rupees (`₹1,500` is fine; also `list_price`) |
| `floor` | the seller's assumed floor; the agent never agrees below it (also `floor_price`, `assumed_floor`) |
| `shop` | optional shop name on screen; defaults to the handle |

Bad rows are reported with their line number and skipped; the rest still run.

**What it does per seller:** creates a ZZ test business with a live GhostCart Shop and that one product, using
the same rules code as onboarding (max discount down to the floor, the agent alone to half of it, the floor as
the product's price floor); starts its own `next dev` on a spare port (default 3456) with the test payment
gateway, a fixed login code and every live partner API blanked; signs a ZZ shopper up; and drives a scripted
haggle that the app's own move rules guarantee will close without a human: a lowball under the floor, a push the
agent still concedes to, a closing offer, and "Take it" if the agent hasn't accepted by then. Every price on
screen is set by code; the agent only writes the words (template replies without `ANTHROPIC_API_KEY`, or
pass `--no-ai`).

**Output** in `--out` (default `./reels`): `<handle>.mp4` per seller, 1080×1920 H.264, 31–45 s, with the
caption "Your [product]. Buyer pushed for ₹X, closed at ₹Y. You set the floor." burned in at the top;
`--caption hi` or `kn` adds `<handle>.hi.mp4` / `<handle>.kn.mp4` with the Hindi or Kannada line, `--caption none`
leaves it off. `results.csv` and `results.json` hold, per seller: handle, file, list price, floor, opening
offer, closing price, duration, the English line for the DM text, the transcript (JSON) and any failure
reason. `dev-server.log` is the server's output and `browser-<handle>.log` each page's console, for debugging.
Stop your own `pnpm dev` first: Next.js runs one dev server per project, so the tool's server can't start beside it.

**Flags:** `--out <dir>`, `--caption en,hi,kn|none`, `--port <n>`, `--no-ai`, `--keep-db` (keeps the seeded
database in the temp folder it prints, for a look at the shops), `--pace <factor>` (stretches the pauses).

The recordings are for outreach to the seller shown. Nothing in them says the seller has signed up, and no
money moves: the deal page is labelled test mode.
