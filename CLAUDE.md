# GhostCart: team guide for humans and coding agents

@AGENTS.md

GhostCart is an AI negotiation agent. A shopper haggles live with an agent that has a real discount budget, offers past the agent's limit go to a human (deal desk or the seller, on screen or by phone), and an agreed price is locked with a UPI payment. It won AI Builders Day (Airtribe × Pine Labs, Bengaluru, 24 Oct 2026). We're now turning it into a product: **the seller negotiation agent first, the consumer app second** (see [docs/ROADMAP.md](docs/ROADMAP.md)).

Team: `architect-moaaz` (Moaaz), `rajathc93`, `lakshmie6x`, `ginger205`, and Claude. Every change, from any of us, goes through a pull request into `main`; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Commands

```bash
pnpm install
pnpm dev          # apps/web on http://localhost:3000; without Redis env vars data is in memory
pnpm --filter @ghostcart/mobile start   # the Expo app (see apps/mobile/README.md)
pnpm check        # typecheck, lint, test, build across the workspace (what CI runs)
pnpm test         # vitest in every package
pnpm --filter @ghostcart/web build   # must pass: Next 16 cacheComponents enforces prerender rules
```

## Map

| Area | Where |
| --- | --- |
| Negotiation state (offers, approvals, lock payment or price grant) | `apps/web/src/lib/negotiate.ts`; shop haggles start in `apps/web/src/lib/shop/negotiation.ts` |
| Consumer catalogue (search across live sellers) | `apps/web/src/lib/shop/catalogue.ts`, `apps/web/src/app/page.tsx`, `apps/web/src/app/search` |
| Money rules: budget, floor, auto-approve limit, allowed moves | `packages/core` (`terms.ts`, `moves.ts`; pure, property-tested). `packages/agent` wraps it |
| Agent wording and free-text reading (Claude via Vercel AI SDK 7) | `packages/agent` (`chooseMove`, `readIntent`) |
| Human approvals: deal desk, sellers, AgenticOrg recommendations | `apps/web/src/lib/deal-desk.ts`, `apps/web/src/app/api/admin/*`, `apps/web/src/app/api/seller/*` |
| Staff access: roster (`STAFF`), roles, audit trail | `apps/web/src/lib/staff.ts` (`requireStaff` on every admin route) |
| AgenticOrg agent tools (MCP server) and trigger | `apps/web/src/app/api/mcp/route.ts`, `apps/web/src/lib/agenticorg.ts`, [docs/agenticorg-setup.md](docs/agenticorg-setup.md) |
| Voice approvals and login codes (Vobiz) | `apps/web/src/lib/vobiz.ts`, `apps/web/src/lib/voice-*.ts`, `apps/web/src/lib/otp.ts`, `apps/web/src/app/api/voice/*` |
| Payments (Pine Labs; test gateway off in production unless `ALLOW_TEST_PAYMENTS=1`) and checkout | `packages/payments` (Pine Labs client, webhook verification), `apps/web/src/lib/pinelabs-mock.ts`, `payments.ts`, `checkout.ts` |
| Accounts, sellers, sessions | `apps/web/src/lib/session.ts` (server-side, revocable), `users.ts`, `sellers.ts`, `deal-access.ts`, `apps/web/src/app/api/auth/*`; OTP-verified signup in `api/signup` and `api/sellers` |
| Rate limits | `apps/web/src/lib/rate-limit.ts` |
| Analytics and demographics | `apps/web/src/lib/analytics.ts`, `apps/web/src/lib/demographics.ts`, `apps/web/src/app/api/track` |
| Storage: Redis (short-lived keys; in-memory in dev) and Postgres via `STORE_MODE` | `apps/web/src/lib/store.ts`, `pg-store.ts`, `packages/db` (Drizzle schema, migrations), [docs/database.md](docs/database.md) |
| Shopper data rights (consent records, export, erasure) and the grievance officer | `apps/web/src/lib/privacy/*`, `apps/web/src/app/grievance` |
| Seller disclosures (E-Commerce Rules), draft legal pages | `apps/web/src/lib/shop/disclosure.ts`, `apps/web/src/app/legal` |
| Security headers (CSP, HSTS) and controls | `apps/web/security-headers.ts`, [docs/security.md](docs/security.md) |
| Per-org data export, analytics warehouse (nightly daily metrics) | `apps/web/src/lib/shop/export.ts`, `apps/web/src/lib/warehouse.ts` |
| ONDC buyer app (signing, registry, callbacks, mock network) | `apps/web/src/lib/ondc/*`, [docs/ondc.md](docs/ondc.md) |
| Mobile app (Expo: shopper + seller approvals with push) | `apps/mobile`, push in `apps/web/src/lib/push.ts`, app sessions via `x-gc-*` headers in `apps/web/src/lib/session.ts` |
| Channel plumbing (common message shape, Meta and Shopify signatures and OAuth) | `packages/channels` |
| Negotiation API for every channel, typed client | `apps/web/src/app/api/v1/sessions`, `packages/sdk`, [docs/api.md](docs/api.md) |
| Load tests (k6) | `load/`, [load/README.md](load/README.md) |
| Haggle reels for seller outreach (batch 9:16 recordings of a scripted haggle on a seller's own product) | `apps/web/scripts/haggle-reels.mts`, rules and offers in `apps/web/scripts/haggle-reels/plan.ts`; see README |
| UI | `apps/web/src/app/*` pages, `apps/web/src/components/*` |

## Rules we learned the hard way

1. **No scraping or bot-check circumvention.** The hackathon's page-scraping flow is gone. Product data comes from sellers (their own catalogue, Shopify/Woo sync, Amazon SP-API) and, for price comparison, official affiliate APIs only. Never route around a block.
2. **Code sets every price; the LLM only talks.** `computeTerms` and `candidateMoves` decide what's allowed, and the model picks a move and writes the reply. Never let a model output become a price without the code-side bounds check.
3. **Humans approve what the agent can't.** Anything below the auto-approve limit escalates; after a human rejects, the agent holds at its final offer and never pages them again for the same deal.
4. **Honest UI copy.** Social proof, timers and claims use real data only ("be the first" rather than fake counts). Test-mode payments are labelled as test mode.
5. **Secrets never go in the repo or in chat.** `.env*` is gitignored except `.env.example`. Production values live in Vercel (`vercel env add`). Rotate anything that leaks.
6. **Consent and privacy.** Shoppers consent to deal contact at signup; we store only what's needed, and analytics never asks for age or gender.
7. **Test data on production is prefixed `ZZ`** (names like "ZZ Test (Claude)") so it can be found and removed.
8. **Next.js 16 specifics:** no `dynamic` route config (cacheComponents is on); read `params` and current time inside `<Suspense>` or client effects; check `node_modules/next/dist/docs/` before using an API from memory.
