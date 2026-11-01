/**
 * Shopper-facing words in English and Hindi. Pure data and lookups, safe in client components; the
 * server reads the chosen language with getLang() (lib/lang.ts). Add a language by adding a column.
 * The Hindi was written for launch and should be checked by a native speaker before wide release;
 * consent sentences change only together with the records that quote them (DEAL_CONTACT_WORDING).
 */
export const LANGS = ["en", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_NAMES: Record<Lang, string> = { en: "English", hi: "हिन्दी" };
export const LANG_COOKIE = "gc_lang";

const dict = {
  "home.tagline": { en: "Every price here is open to a bargain.", hi: "यहाँ हर दाम पर मोलभाव हो सकता है।" },
  "home.intro": {
    en: "Real sellers, each with their own AI agent. Make an offer and haggle; anything bigger than the agent can give goes to the seller.",
    hi: "असली विक्रेता, हर एक का अपना AI एजेंट। अपना दाम बताइए और मोलभाव कीजिए; एजेंट जितनी छूट नहीं दे सकता, वह बात विक्रेता तक जाती है।",
  },
  "home.search": { en: "Search, or paste an Amazon or Flipkart link", hi: "खोजें, या Amazon या Flipkart का लिंक डालें" },
  "home.searchButton": { en: "Search", hi: "खोजें" },
  "home.forSellers": { en: "For sellers", hi: "विक्रेताओं के लिए" },
  "home.onOffer": { en: "On offer now", hi: "अभी ऑफ़र पर" },
  "home.shops": { en: "Shops", hi: "दुकानें" },
  "home.loading": { en: "Loading what's on offer…", hi: "ऑफ़र लोड हो रहे हैं…" },
  "home.empty": { en: "The first sellers are setting up their shops. Check back soon.", hi: "पहले विक्रेता अपनी दुकानें तैयार कर रहे हैं। जल्द ही फिर देखें।" },
  "home.how1": { en: "You make the offer", hi: "दाम आप बताते हैं" },
  "home.how1b": { en: "Bargain in your own words. The agent counters within the discount the seller set.", hi: "अपने शब्दों में मोलभाव कीजिए। एजेंट विक्रेता की तय छूट के अंदर जवाब देता है।" },
  "home.how2": { en: "A person signs off on big discounts", hi: "बड़ी छूट पर फ़ैसला इंसान करता है" },
  "home.how2b": { en: "Offers past the agent's limit go to the seller, on their phone or dashboard.", hi: "एजेंट की सीमा से कम के ऑफ़र विक्रेता के फ़ोन या डैशबोर्ड पर जाते हैं।" },
  "home.how3": { en: "Paid safely", hi: "सुरक्षित भुगतान" },
  "home.how3b": { en: "UPI through Pine Labs. The seller is paid only after your order is delivered.", hi: "Pine Labs के ज़रिए UPI। विक्रेता को पैसा आपका ऑर्डर पहुँचने के बाद ही मिलता है।" },
  "footer.account": { en: "Your account and data", hi: "आपका खाता और डेटा" },
  "footer.complaint": { en: "Make a complaint", hi: "शिकायत करें" },
  "footer.legal": { en: "Terms and policies", hi: "नियम और नीतियाँ" },
  "footer.tagline": { en: "Haggle with real Indian sellers. Each has their own AI agent; big discounts need a person's yes.", hi: "असली भारतीय विक्रेताओं से मोलभाव कीजिए। हर एक का अपना AI एजेंट है; बड़ी छूट पर इंसान की हाँ ज़रूरी है।" },
  "footer.shop": { en: "Shop", hi: "ख़रीदारी" },
  "footer.sell": { en: "Sell", hi: "बेचें" },
  "footer.help": { en: "Help and policies", hi: "मदद और नीतियाँ" },
  "footer.browse": { en: "Browse shops", hi: "दुकानें देखें" },
  "footer.search": { en: "Search", hi: "खोजें" },
  "footer.sellWith": { en: "Sell with GhostCart", hi: "GhostCart पर बेचें" },
  "footer.setup": { en: "Set up your store", hi: "अपनी दुकान बनाएँ" },
  "footer.dashboard": { en: "Seller dashboard", hi: "विक्रेता डैशबोर्ड" },
  "footer.terms": { en: "Terms of use", hi: "उपयोग की शर्तें" },
  "footer.privacy": { en: "Privacy policy", hi: "गोपनीयता नीति" },
  "footer.returns": { en: "Returns and refunds", hi: "वापसी और रिफ़ंड" },
  "footer.sellerTerms": { en: "Seller terms", hi: "विक्रेता की शर्तें" },
  "footer.payments": { en: "Payments by Pine Labs, a licensed payment aggregator. Sellers are paid after your order is delivered.", hi: "भुगतान Pine Labs के ज़रिए, जो एक लाइसेंसशुदा पेमेंट एग्रीगेटर है। विक्रेता को पैसा आपका ऑर्डर पहुँचने के बाद मिलता है।" },
  "nav.main": { en: "Main", hi: "मुख्य" },
  "nav.shop": { en: "Shop", hi: "ख़रीदारी" },
  "nav.rescue": { en: "Rescue my cart", hi: "मेरा कार्ट बचाएँ" },
  "nav.live": { en: "Live deals", hi: "लाइव डील" },
  "nav.pricing": { en: "Pricing", hi: "क़ीमतें" },
  "nav.menu": { en: "Menu", hi: "मेन्यू" },
  "nav.login": { en: "Log in", hi: "लॉग इन" },
  "nav.myDeals": { en: "My deals", hi: "मेरी डील" },

  "product.offer": { en: "Make an offer", hi: "अपना दाम बताएँ" },
  "product.starting": { en: "Starting…", hi: "शुरू हो रहा है…" },
  "product.inStock": { en: "{n} in stock", hi: "{n} स्टॉक में" },
  "product.outOfStock": { en: "Out of stock", hi: "स्टॉक में नहीं" },
  "product.shipsFrom": { en: "ships from {store}", hi: "{store} से भेजा जाएगा" },
  "product.fixed": { en: "This item is sold at a fixed price.", hi: "यह सामान तय दाम पर बिकता है।" },
  "product.origin": { en: "Country of origin: {c}", hi: "मूल देश: {c}" },
  "product.back": { en: "← Back to {site}", hi: "← {site} पर वापस" },

  "alert.open": { en: "Tell me if the price drops", hi: "दाम घटे तो मुझे बताएँ" },
  "alert.label": { en: "Tell me if the listed price drops to (₹)", hi: "दाम इतना (₹) होने पर बताएँ" },
  "alert.set": { en: "Set alert", hi: "अलर्ट लगाएँ" },
  "alert.saving": { en: "Saving…", hi: "सेव हो रहा है…" },
  "alert.done": { en: "Done. We'll tell you once if the price drops to {price} or less.", hi: "हो गया। दाम {price} या उससे कम होने पर हम आपको एक बार बताएँगे।" },
  "alert.failed": { en: "Couldn't set the alert. Try again.", hi: "अलर्ट नहीं लग पाया। फिर कोशिश करें।" },

  "signup.title": { en: "Quick sign-up so the seller can reach you about this deal", hi: "जल्दी साइन-अप करें, ताकि विक्रेता इस डील के बारे में आपसे बात कर सके" },
  "signup.before": { en: "Been here before?", hi: "पहले आ चुके हैं?" },
  "signup.login": { en: "Log in with a code", hi: "कोड से लॉग इन करें" },
  "signup.name": { en: "Your name", hi: "आपका नाम" },
  "signup.phone": { en: "Mobile number", hi: "मोबाइल नंबर" },
  "signup.consent": {
    en: "GhostCart and this seller can contact me on this number about this deal. No marketing.",
    hi: "GhostCart और यह विक्रेता इस डील के बारे में मुझसे इस नंबर पर संपर्क कर सकते हैं। कोई मार्केटिंग नहीं।",
  },
  "signup.calling": { en: "We're calling {phone} now with your 6-digit code.", hi: "हम अभी {phone} पर कॉल करके आपका 6 अंकों का कोड बता रहे हैं।" },
  "signup.code": { en: "6-digit code", hi: "6 अंकों का कोड" },
  "signup.call": { en: "Call me with a code", hi: "कोड के लिए मुझे कॉल करें" },
  "signup.verify": { en: "Verify and start haggling", hi: "पुष्टि करें और मोलभाव शुरू करें" },
  "signup.wait": { en: "One moment…", hi: "एक पल…" },
  "signup.failed": { en: "Couldn't sign you up. Try again.", hi: "साइन-अप नहीं हो पाया। फिर कोशिश करें।" },

  "privilege.kicker": { en: "GhostCart Privilege", hi: "GhostCart प्रिविलेज" },
  "privilege.title": { en: "A private offer on your cart from {store}", hi: "{store} की ओर से आपके कार्ट पर निजी ऑफ़र" },
  "privilege.closed": { en: "This offer is closed", hi: "यह ऑफ़र बंद हो चुका है" },
  "privilege.intro": {
    en: "Make {store} an offer on everything below. Their agent answers straight away, and anything it can't agree goes to the seller.",
    hi: "नीचे दिए सारे सामान के लिए {store} को अपना दाम बताइए। उनका एजेंट तुरंत जवाब देता है, और जो वह तय नहीं कर सकता वह विक्रेता तक जाता है।",
  },
  "privilege.payStore": { en: "If you agree a price, you pay on {store}'s own checkout with a one-time code.", hi: "दाम तय होने पर आप {store} के अपने चेकआउट पर एक बार के कोड से भुगतान करते हैं।" },
  "privilege.payGhostCart": { en: "If you agree a price, you pay on GhostCart's checkout by UPI.", hi: "दाम तय होने पर आप GhostCart के चेकआउट पर UPI से भुगतान करते हैं।" },
  "privilege.atList": { en: "{n} items at list price", hi: "{n} सामान, सूची के दाम पर" },
  "privilege.offerAll": { en: "Make an offer on all {n} items", hi: "सभी {n} सामान के लिए दाम बताएँ" },
  "privilege.until": { en: "This link works until {when} IST. Prices are checked again when you start.", hi: "यह लिंक {when} IST तक चलेगा। शुरू करते समय दाम फिर से जाँचे जाते हैं।" },
  "privilege.stopAsk": { en: "Don't want offers on this cart?", hi: "इस कार्ट पर ऑफ़र नहीं चाहिए?" },
  "privilege.stop": { en: "Stop offers", hi: "ऑफ़र बंद करें" },
  "privilege.stopped": { en: "Done. {store} won't send you offers on this cart again.", hi: "हो गया। {store} अब इस कार्ट पर आपको ऑफ़र नहीं भेजेगा।" },
  "privilege.invalid": { en: "This link isn't valid", hi: "यह लिंक मान्य नहीं है" },
  "privilege.invalidHelp": { en: "Check you copied the whole link from your message.", hi: "देख लें कि आपने संदेश से पूरा लिंक कॉपी किया है।" },
} satisfies Record<string, Record<Lang, string>>;

export type MessageKey = keyof typeof dict;

export function t(lang: Lang, key: MessageKey, vars: Record<string, string | number> = {}) {
  const text = dict[key][lang] ?? dict[key].en;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

/** The language from the cookie, else the browser's preference, else English. */
export function pickLang(cookie: string | undefined, acceptLanguage: string | null | undefined): Lang {
  if (isLang(cookie)) return cookie;
  const first = (acceptLanguage ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("hi") ? "hi" : "en";
}
