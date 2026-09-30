/** Rough password strength for the live meter on sign-up (0 = empty … 4 = strong). */
export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string };

const LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;

export function passwordStrength(pw: string): PasswordStrength {
  if (!pw) return { score: 0, label: LABELS[0] };
  if (pw.length < 8) return { score: 1, label: LABELS[1] };

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  // Long passphrases are strong even without symbols.
  let score = pw.length >= 16 ? 3 : variety >= 3 ? 2 : 1;
  if (pw.length >= 12 && variety >= 3) score++;
  if (variety === 4) score++;
  // Repeated single characters ("aaaaaaaa") are never better than weak.
  if (/^(.)\1+$/.test(pw)) score = 1;

  const clamped = Math.min(4, score) as PasswordStrength["score"];
  return { score: clamped, label: LABELS[clamped] };
}
