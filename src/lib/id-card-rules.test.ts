import { describe, expect, it } from "vitest";
import { MEMBER_CODE_PATTERN, idCardIssues, parseScan, toPrintableLatin, verifyUrl } from "./id-card-rules";

const ready = { image: "/media/abc", bloodGroup: "B+", memberCode: "BBA-2026-00001", status: "active" };

describe("idCardIssues", () => {
  it("is empty when the card can be printed", () => {
    expect(idCardIssues(ready)).toEqual([]);
  });

  it("requires an uploaded photo", () => {
    expect(idCardIssues({ ...ready, image: null }).map((i) => i.key)).toEqual(["photo"]);
    // External URLs can't be embedded in the PDF.
    expect(idCardIssues({ ...ready, image: "https://example.com/p.jpg" }).map((i) => i.key)).toEqual(["photo"]);
  });

  it("lists every missing requirement", () => {
    const keys = idCardIssues({ image: null, bloodGroup: null, memberCode: null, status: "pending" }).map((i) => i.key);
    expect(keys.sort()).toEqual(["active", "bloodGroup", "memberCode", "photo"]);
  });

  it("refuses inactive members even with an ID", () => {
    expect(idCardIssues({ ...ready, status: "inactive" }).map((i) => i.key)).toEqual(["active"]);
  });
});

describe("member code format", () => {
  it("matches issued codes", () => {
    expect(MEMBER_CODE_PATTERN.test("BBA-2026-00042")).toBe(true);
    expect(MEMBER_CODE_PATTERN.test("BBA-2026-123456")).toBe(true);
    expect(MEMBER_CODE_PATTERN.test("bba-2026-1")).toBe(false);
  });
});

describe("toPrintableLatin", () => {
  it("keeps Latin-1, strips combining accents, replaces the rest", () => {
    expect(toPrintableLatin("Saina Nehwal")).toBe("Saina Nehwal");
    expect(toPrintableLatin("Zoë Łukasz")).toBe("Zoe ?ukasz");
    expect(toPrintableLatin("राम Kumar")).toBe("??? Kumar");
  });
});

describe("verifyUrl", () => {
  it("joins origin and token without double slashes", () => {
    expect(verifyUrl("https://app.sksap.com/", "tok")).toBe("https://app.sksap.com/verify/tok");
  });
});

describe("parseScan", () => {
  const token = "0123456789abcdef0123456789abcdef";
  it("reads a member ID from the Code 128 (case-insensitive)", () => {
    expect(parseScan(" bba-2026-00042 ")).toEqual({ kind: "code", code: "BBA-2026-00042" });
  });
  it("reads the token from a scanned QR URL or a bare token", () => {
    expect(parseScan(`https://app.sksap.com/verify/${token}`)).toEqual({ kind: "token", token });
    expect(parseScan(token.toUpperCase())).toEqual({ kind: "token", token });
  });
  it("rejects anything else", () => {
    expect(parseScan("hello")).toBeNull();
    expect(parseScan("https://evil.test/verify/short")).toBeNull();
  });
});
