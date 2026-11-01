import { parseCsv } from "../../src/lib/shop/products";
import type { SellerRow } from "./plan";

/**
 * Reads the target-seller list: a CSV with a header row, or a JSON array of objects. Column names are
 * matched after lowercasing and collapsing spaces, dashes and brackets, and the common spellings below
 * all work, so a sheet exported from the outreach tracker imports as-is.
 */
const ALIASES: Record<keyof SellerRow, string[]> = {
  handle: ["handle", "instagram", "instagram_handle", "ig", "ig_handle", "username", "seller"],
  product: ["product", "product_name", "title", "item", "listing"],
  photo: ["photo", "image", "image_url", "photo_url", "picture", "product_photo"],
  listPrice: ["price", "list_price", "listed_price", "listing_price", "selling_price"],
  floorPrice: ["floor", "floor_price", "assumed_floor", "assumed_floor_price", "minimum", "min_price", "lowest"],
  shopName: ["shop", "shop_name", "store", "store_name", "business"],
};

const normKey = (k: string) => k.trim().toLowerCase().replace(/[\s\-()]+/g, "_").replace(/_+$/, "");

function fieldFor(key: string): keyof SellerRow | undefined {
  const k = normKey(key);
  return (Object.keys(ALIASES) as (keyof SellerRow)[]).find((f) => f === k || ALIASES[f].includes(k));
}

/** "@Sonic_Buds" or "https://instagram.com/sonic_buds/" → "Sonic_Buds". */
export function cleanHandle(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@+/, "")
    .trim();
}

const rupees = (v: string) => {
  const n = Number(v.replace(/[₹,\s]/g, "").replace(/\.0+$/, ""));
  return Number.isInteger(n) ? n : NaN;
};

/** One row's problems; an empty list means it can be recorded. */
export function validateRow(row: SellerRow): string[] {
  const errors: string[] = [];
  if (!/^[A-Za-z0-9._]{1,30}$/.test(row.handle)) errors.push("handle must be an Instagram username (letters, digits, dots, underscores)");
  if (row.product.length < 2) errors.push("product name is missing");
  if (row.product.length > 160) errors.push("product name is longer than 160 characters");
  if (!(row.listPrice >= 2)) errors.push("price must be whole rupees, at least ₹2");
  if (!(row.floorPrice >= 1)) errors.push("floor must be whole rupees, at least ₹1");
  if (row.floorPrice >= row.listPrice) errors.push("floor must be below the price");
  if (row.photo && !/^https?:\/\//i.test(row.photo) && !/\.(jpe?g|png|webp)$/i.test(row.photo)) errors.push("photo must be an http(s) URL or a .jpg/.png/.webp file");
  return errors;
}

function toRow(record: Record<string, unknown>): SellerRow {
  const get = (f: keyof SellerRow) => {
    for (const [key, value] of Object.entries(record)) if (fieldFor(key) === f && value !== undefined && value !== null) return String(value).trim();
    return "";
  };
  return {
    handle: cleanHandle(get("handle")),
    product: get("product"),
    photo: get("photo"),
    listPrice: rupees(get("listPrice")),
    floorPrice: rupees(get("floorPrice")),
    shopName: get("shopName") || undefined,
  };
}

export interface ParsedInput {
  rows: SellerRow[];
  /** "Line 3: …" for CSV, "Item 2: …" for JSON. Bad rows are left out; the rest still run. */
  errors: string[];
}

export function parseSellers(text: string, format: "csv" | "json"): ParsedInput {
  const records: Record<string, unknown>[] = [];
  const labels: string[] = [];
  if (format === "json") {
    const data: unknown = JSON.parse(text);
    const list = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as { sellers?: unknown }).sellers) ? (data as { sellers: unknown[] }).sellers : null;
    if (!list) return { rows: [], errors: ["JSON must be an array of sellers (or { sellers: [...] })."] };
    list.forEach((item, i) => {
      if (item && typeof item === "object") {
        records.push(item as Record<string, unknown>);
        labels.push(`Item ${i + 1}`);
      }
    });
  } else {
    const [header, ...lines] = parseCsv(text.replace(/^﻿/, ""));
    if (!header) return { rows: [], errors: ["The file is empty."] };
    const fields = header.map(fieldFor);
    if (!fields.includes("handle") || !fields.includes("product") || !fields.includes("listPrice") || !fields.includes("floorPrice"))
      return { rows: [], errors: ["The header row needs handle, product, price and floor columns (photo is optional)."] };
    lines.forEach((cells, i) => {
      records.push(Object.fromEntries(header.map((h, j) => [h, cells[j] ?? ""])));
      labels.push(`Line ${i + 2}`);
    });
  }

  const rows: SellerRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  records.forEach((record, i) => {
    const row = toRow(record);
    const problems = validateRow(row);
    const key = row.handle.toLowerCase();
    if (!problems.length && seen.has(key)) problems.push(`duplicate handle ${row.handle}`);
    if (problems.length) errors.push(`${labels[i]}: ${problems.join("; ")}.`);
    else {
      seen.add(key);
      rows.push(row);
    }
  });
  return { rows, errors };
}
