import { describe, expect, it } from "vitest";
import { cleanHandle, parseSellers } from "./input";

describe("parseSellers", () => {
  it("reads a CSV with the documented columns and common spellings", () => {
    const csv = `Instagram handle,Product name,Photo URL,Listed price,Assumed floor
@zz_sonicbuds_blr,SonicBuds Pro ANC,https://example.test/buds.jpg,"₹1,500",1100
zz_fitpulse,FitPulse S2,,2500,1900
`;
    const { rows, errors } = parseSellers(csv, "csv");
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { handle: "zz_sonicbuds_blr", product: "SonicBuds Pro ANC", photo: "https://example.test/buds.jpg", listPrice: 1500, floorPrice: 1100, shopName: undefined },
      { handle: "zz_fitpulse", product: "FitPulse S2", photo: "", listPrice: 2500, floorPrice: 1900, shopName: undefined },
    ]);
  });

  it("reports bad rows by line and keeps the good ones", () => {
    const csv = `handle,product,price,floor
zz_ok,Earbuds,1500,1100
zz_bad,Earbuds,1500,1600
zz_ok,Again,1500,1100
no handle!,Thing,abc,1
`;
    const { rows, errors } = parseSellers(csv, "csv");
    expect(rows.map((r) => r.handle)).toEqual(["zz_ok"]);
    expect(errors).toEqual([
      "Line 3: floor must be below the price.",
      "Line 4: duplicate handle zz_ok.",
      "Line 5: handle must be an Instagram username (letters, digits, dots, underscores); price must be whole rupees, at least ₹2.",
    ]);
  });

  it("rejects a CSV without the required columns", () => {
    expect(parseSellers("name,cost\nx,1\n", "csv").errors[0]).toMatch(/needs handle, product, price and floor/);
  });

  it("reads JSON arrays with the same keys", () => {
    const { rows, errors } = parseSellers(JSON.stringify([{ handle: "https://instagram.com/zz_phones/", product: "Redmi Note 11", price: 9000, floor: 7500, shop: "ZZ Phones" }]), "json");
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ handle: "zz_phones", listPrice: 9000, floorPrice: 7500, shopName: "ZZ Phones" });
  });

  it("cleans handles", () => {
    expect(cleanHandle("@@zz_x")).toBe("zz_x");
    expect(cleanHandle("https://www.instagram.com/zz_x?hl=en")).toBe("zz_x");
  });
});
