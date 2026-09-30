import { describe, expect, it } from "vitest";
import { passwordStrength } from "./password";

describe("passwordStrength", () => {
  it("is empty for no input", () => {
    expect(passwordStrength("").score).toBe(0);
  });

  it("is weak below the minimum length or for repeated characters", () => {
    expect(passwordStrength("Ab1!").score).toBe(1);
    expect(passwordStrength("aaaaaaaaaaaaaaaaaaaa").score).toBe(1);
  });

  it("rewards variety and length", () => {
    expect(passwordStrength("password").label).toBe("Weak");
    expect(passwordStrength("Password1").label).toBe("Fair");
    expect(passwordStrength("Password1234").label).toBe("Good");
    expect(passwordStrength("Player@12345").label).toBe("Strong");
  });

  it("treats long passphrases as at least good", () => {
    expect(passwordStrength("correct horse battery").score).toBeGreaterThanOrEqual(3);
  });
});
