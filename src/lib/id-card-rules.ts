// Pure ID-card rules shared by the admin UI, the PDF route and tests.
// Client-safe: no server imports.

/** CR80 — the standard PVC ID-card size (ISO/IEC 7810 ID-1). */
export const CARD_MM = { width: 85.6, height: 53.98 } as const;
export const MM_TO_PT = 72 / 25.4;

export const MEMBER_CODE_PATTERN = /^BBA-\d{4}-\d{5,}$/;

type CardMember = {
  image: string | null;
  bloodGroup: string | null;
  memberCode: string | null;
  status: string;
};

export type CardIssue = { key: "photo" | "bloodGroup" | "memberCode" | "active"; label: string };

/**
 * What stops a card from being printed. Empty = ready. A photo is mandatory, and
 * it must be an uploaded photo (served from our media table), because that is
 * what gets embedded in the PDF.
 */
export function idCardIssues(m: CardMember): CardIssue[] {
  const issues: CardIssue[] = [];
  if (!m.memberCode) issues.push({ key: "memberCode", label: "No member ID yet — it is issued when the registration is approved" });
  if (m.status !== "active") issues.push({ key: "active", label: "Member is not active" });
  if (!m.image?.startsWith("/media/")) issues.push({ key: "photo", label: "Upload the member's photo" });
  if (!m.bloodGroup) issues.push({ key: "bloodGroup", label: "Set the member's blood group" });
  return issues;
}

/**
 * pdf-lib's standard fonts only cover WinAnsi (Latin-1). Strip accents and
 * replace anything else so a name can never make PDF generation throw.
 */
export function toPrintableLatin(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7e\u00a0-\u00ff]/g, "?")
    .trim();
}

/** `https://host` + `/verify/<token>` — the URL inside the card's QR code. */
export function verifyUrl(origin: string, token: string) {
  return `${origin.replace(/\/+$/, "")}/verify/${token}`;
}

export type ScanResult = { kind: "code"; code: string } | { kind: "token"; token: string } | null;

/**
 * Interpret front-desk scanner input: the Code 128 on the card gives a member
 * ID; a QR-capable scanner gives the verification URL. Typed input works too.
 */
export function parseScan(raw: string): ScanResult {
  const input = raw.trim();
  const code = input.toUpperCase();
  if (MEMBER_CODE_PATTERN.test(code)) return { kind: "code", code };
  const token = /(?:\/verify\/)?([0-9a-f]{32})\/?$/i.exec(input)?.[1];
  return token ? { kind: "token", token: token.toLowerCase() } : null;
}
