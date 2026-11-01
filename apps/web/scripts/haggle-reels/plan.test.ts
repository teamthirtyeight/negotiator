import { candidateMoves, type Move, type NegotiationTerms } from "@ghostcart/core";
import { describe, expect, it } from "vitest";
import { caption, closingOffer, fileStem, lowball, pretty, pushOffer, rulesFor, termsFor, type LiveState } from "./plan";

/**
 * Runs the scripted shopper against the app's own move rules (candidateMoves) the way submitOffer
 * applies them, with the agent picking moves by `pick`: index 0 is what the template fallback does,
 * the last index is the least generous choice the model could make.
 */
function simulate(terms: NegotiationTerms, pick: (moves: Move[]) => Move) {
  const state: LiveState = { currentOffer: terms.opening, rounds: 0 };
  const offers: number[] = [];
  let closed: number | null = null;
  const actions: string[] = [];
  const submit = (offer: number) => {
    offers.push(offer);
    const move = pick(candidateMoves(state, terms, offer));
    actions.push(move.action);
    if (move.action === "escalate") throw new Error(`escalated at ${offer}`);
    if (move.action === "accept") closed = move.price;
    else {
      state.currentOffer = move.price;
      state.rounds += 1;
    }
  };
  submit(lowball(terms));
  const o2 = closed === null ? pushOffer(terms, state) : null;
  if (o2 !== null) submit(o2);
  const o3 = closed === null ? closingOffer(terms, state, offers.at(-1)) : null;
  if (o3 !== null) submit(o3);
  if (closed === null) {
    actions.push("take-it");
    closed = state.currentOffer;
  }
  return { offers, closed: closed as number, actions };
}

const grid: [number, number][] = [];
for (const list of [120, 499, 1500, 2500, 9000, 24999, 150000]) for (const share of [0.5, 0.7, 0.8, 0.9, 0.97, 0.995]) grid.push([list, Math.max(1, Math.floor(list * share))]);

describe("rulesFor", () => {
  it("puts the agent's own limit between the floor and the list price", () => {
    for (const [list, floor] of grid) {
      const t = termsFor({ listPrice: list, floorPrice: floor }, "ZZ Shop");
      expect(t.floor).toBe(floor);
      expect(t.autoLimit).toBeGreaterThanOrEqual(floor);
      expect(t.autoLimit).toBeLessThanOrEqual(list);
      expect(t.opening).toBeGreaterThanOrEqual(t.autoLimit);
      expect(t.opening).toBeLessThanOrEqual(list);
    }
  });
  it("never lets the agent-alone share exceed the maximum", () => {
    const r = rulesFor(1500, 1100);
    expect(r).toEqual({ maxDiscountPct: 27, autoApprovePct: 13, floorPrice: 1100 });
    expect(rulesFor(1500, 1495).autoApprovePct).toBeLessThanOrEqual(rulesFor(1500, 1495).maxDiscountPct);
  });
});

describe("scripted shopper", () => {
  const pickers: [string, (m: Move[]) => Move][] = [
    ["template (first move)", (m) => m[0]],
    ["least generous (last move)", (m) => m[m.length - 1]],
  ];
  for (const [name, pick] of pickers) {
    it(`always closes above the floor without a human, agent picking ${name}`, () => {
      for (const [list, floor] of grid) {
        const terms = termsFor({ listPrice: list, floorPrice: floor }, "ZZ Shop");
        const run = simulate(terms, pick);
        expect(run.offers[0], `${list}/${floor}`).toBeLessThan(floor);
        expect(run.offers.length).toBeLessThanOrEqual(3);
        for (let i = 1; i < run.offers.length; i++) expect(run.offers[i], `${list}/${floor}`).toBeGreaterThan(run.offers[i - 1]);
        expect(run.closed).toBeGreaterThanOrEqual(floor);
        expect(run.closed).toBeLessThanOrEqual(list);
        expect(run.actions).not.toContain("escalate");
      }
    });
  }
  it("tells the ₹1,500 earbuds story: lowball, concession, close", () => {
    const terms = termsFor({ listPrice: 1500, floorPrice: 1100 }, "ZZ Shop");
    const run = simulate(terms, (m) => m[0]);
    expect(run.offers).toEqual([960, 1330, 1340]);
    expect(run.actions).toEqual(["counter", "counter", "accept"]);
    expect(run.closed).toBe(1340);
  });
  it("rounds offers to shopper-looking numbers only inside the allowed band", () => {
    expect(pretty(1327, 1305, 1348)).toBe(1330);
    expect(pretty(1303, 1305, 1308)).toBe(1305);
    expect(pretty(9013, 9000, 9100)).toBe(9000);
  });
});

describe("caption", () => {
  it("states what the recording shows, in three languages", () => {
    expect(caption("en", "SonicBuds Pro", 960, 1330)).toBe("Your SonicBuds Pro. Buyer pushed for ₹960, closed at ₹1,330. You set the floor.");
    expect(caption("hi", "SonicBuds Pro", 960, 1330)).toContain("₹1,330");
    expect(caption("kn", "SonicBuds Pro", 960, 1330)).toContain("₹960");
  });
  it("makes safe file names from handles", () => {
    expect(fileStem("@Sonic.Buds-BLR")).toBe("sonic.buds-blr");
    expect(fileStem("zz_fitwear bengaluru!")).toBe("zz_fitwear_bengaluru");
  });
});
