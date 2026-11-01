import { candidateMoves, inr, resolvePolicy, termsFromPolicy, type NegotiationTerms } from "@ghostcart/core";

/**
 * The scripted shopper for a haggle reel. Everything here is pure: the seller's discount rules from
 * their list price and floor, the three offers the shopper makes, and the caption line. Prices come
 * from the same core rules the app runs, so the plan matches what the agent will actually do.
 */

/** One target seller, as read from the input file. */
export interface SellerRow {
  /** Instagram handle without the "@". */
  handle: string;
  product: string;
  /** Product photo: an http(s) URL, a local path, or empty. */
  photo: string;
  /** Whole rupees. */
  listPrice: number;
  /** The lowest the seller would plausibly go; the agent never agrees below it. */
  floorPrice: number;
  /** Shop name on screen; defaults to the handle. */
  shopName?: string;
}

/** What a shopper-facing deal exposes of the negotiation. */
export interface LiveState {
  currentOffer: number;
  rounds: number;
}

/**
 * Discount rules for a reel: the seller's floor becomes the product's price floor, the store's maximum
 * discount reaches exactly that floor, and the agent may give half of it on its own, so the agent's
 * own limit sits between the floor and the list price (mirrors the onboarding defaults).
 */
export function rulesFor(listPrice: number, floorPrice: number) {
  const maxDiscountPct = Math.min(90, Math.max(1, Math.ceil(((listPrice - floorPrice) / listPrice) * 100)));
  const autoApprovePct = Math.max(1, Math.floor(maxDiscountPct / 2));
  return { maxDiscountPct, autoApprovePct, floorPrice };
}

/** The agent's limits for this product, resolved the way the app resolves them (store rules + product floor). */
export function termsFor(row: Pick<SellerRow, "listPrice" | "floorPrice">, sellerName: string): NegotiationTerms {
  const rules = rulesFor(row.listPrice, row.floorPrice);
  const policy = resolvePolicy({
    store: { maxDiscountPct: rules.maxDiscountPct, autoApprovePct: rules.autoApprovePct },
    product: { floorPrice: rules.floorPrice },
  });
  const terms = termsFromPolicy(policy, row.listPrice, { sellerId: "reel", sellerName, category: "general", channel: "shop" });
  if (!terms) throw new Error("Haggling is off for this product.");
  return terms;
}

const step = (price: number) => (price >= 5000 ? 50 : 10);

/** A round, shopper-looking number near `price`, kept inside [lo, hi]. */
export function pretty(price: number, lo: number, hi: number) {
  const s = step(price);
  for (const r of [Math.round(price / s) * s, Math.floor(price / s) * s, Math.ceil(price / s) * s]) if (r >= lo && r <= hi) return r;
  return Math.min(hi, Math.max(lo, Math.round(price)));
}

/** Opening lowball: clearly under the seller's floor, by about a third of the discount band. */
export function lowball(terms: NegotiationTerms) {
  const { benchmark: list, floor } = terms;
  if (floor < 2) throw new Error("The floor price must be at least ₹2 so the opening offer can sit below it.");
  const under = Math.max(1, Math.round((list - floor) * 0.35));
  return pretty(floor - under, 1, floor - 1);
}

/** The price the agent would concede to next for an offer it can take alone (the app's own rule). */
function agentNext(terms: NegotiationTerms, state: LiveState) {
  const [first] = candidateMoves(state, terms, terms.autoLimit);
  return first.action === "accept" ? terms.autoLimit : first.price;
}

/**
 * Second offer: inside what the agent may give alone, but under what it would accept outright, so it
 * concedes once more instead of closing or asking the seller. Null when the agent has no room left.
 */
export function pushOffer(terms: NegotiationTerms, state: LiveState) {
  if (state.currentOffer <= terms.autoLimit) return null;
  const next = agentNext(terms, state);
  const lo = terms.autoLimit;
  const hi = next - 1;
  if (hi < lo) return null;
  return pretty(lo + Math.round((hi - lo) * 0.5), lo, hi);
}

/**
 * Closing offer: at or just above what the agent would concede to, so its first choice is to accept,
 * and above the shopper's previous offer so the thread reads as a real climb.
 */
export function closingOffer(terms: NegotiationTerms, state: LiveState, lastOffer = 0) {
  if (state.currentOffer <= terms.autoLimit) return null;
  const lo = Math.max(agentNext(terms, state), terms.autoLimit, lastOffer + 1);
  const hi = state.currentOffer - 1;
  if (hi < lo) return null;
  return pretty(lo + Math.round((hi - lo) * 0.25), lo, hi);
}

export const CAPTION_LANGS = ["en", "hi", "kn"] as const;
export type CaptionLang = (typeof CAPTION_LANGS)[number];

/** The line burned into the top of the reel. Plain statements of what the recording shows. */
export function caption(lang: CaptionLang, product: string, pushedFor: number, closedAt: number) {
  const x = inr(pushedFor);
  const y = inr(closedAt);
  switch (lang) {
    case "hi":
      return `आपका ${product}। खरीदार ने ${x} तक दबाव डाला, ${y} पर डील पक्की। न्यूनतम दाम आपने तय किया।`;
    case "kn":
      return `ನಿಮ್ಮ ${product}. ಖರೀದಿದಾರ ${x} ಕ್ಕೆ ಒತ್ತಾಯಿಸಿದರು, ${y} ಕ್ಕೆ ಡೀಲ್ ಮುಗಿಯಿತು. ಕನಿಷ್ಠ ಬೆಲೆ ನೀವೇ ಹಾಕಿದ್ದು.`;
    default:
      return `Your ${product}. Buyer pushed for ${x}, closed at ${y}. You set the floor.`;
  }
}

/** A safe file name from a handle: "@Sonic.Buds-BLR" → "sonic.buds-blr". */
export const fileStem = (handle: string) =>
  handle
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "seller";
