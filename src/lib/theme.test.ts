import { describe, expect, it } from "vitest";
import { parseTheme, resolveTheme } from "./theme";

describe("theme", () => {
  it("resolves system preference", () => {
    expect(resolveTheme("system", true)).toBe("light");
    expect(resolveTheme("system", false)).toBe("dark");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  it("falls back to the default for unknown values", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("purple")).toBe("dark");
    expect(parseTheme(null)).toBe("dark");
  });
});
