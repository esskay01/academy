import "server-only";
// Explicit node entry: with moduleResolution "bundler" the package's "node" export condition isn't applied.
import bwipjs from "bwip-js/node";
import { eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import sharp from "sharp";
import { db } from "@/lib/db";
import { media, siteSettings, user } from "@/lib/db/schema";
import { CARD_MM, MM_TO_PT, idCardIssues, toPrintableLatin, verifyUrl } from "@/lib/id-card-rules";
import { capitalize, formatDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

export async function getIdCardMember(userId: string) {
  const [member] = await db
    .select({
      id: user.id,
      name: user.name,
      image: user.image,
      bloodGroup: user.bloodGroup,
      memberCode: user.memberCode,
      verifyToken: user.verifyToken,
      status: user.status,
      skillLevel: user.skillLevel,
      createdAt: user.createdAt,
      statusUpdatedAt: user.statusUpdatedAt,
    })
    .from(user)
    .where(eq(user.id, userId));
  return member;
}

export type IdCardMember = NonNullable<Awaited<ReturnType<typeof getIdCardMember>>>;

/** Public origin for the QR link — the same URL Better Auth is served from. */
export function publicOrigin(requestUrl?: string) {
  return process.env.BETTER_AUTH_URL?.trim() || (requestUrl ? new URL(requestUrl).origin : "http://localhost:3000");
}

async function loadPhoto(imageUrl: string) {
  const [row] = await db.select({ data: media.data }).from(media).where(eq(media.id, imageUrl.slice("/media/".length)));
  return row?.data ?? null;
}

// ---------------------------------------------------------------------------
// Layout helpers (points; origin bottom-left as in PDF)
// ---------------------------------------------------------------------------

const mm = (v: number) => v * MM_TO_PT;
const W = mm(CARD_MM.width);
const H = mm(CARD_MM.height);
/** Raster art is rendered at ~600 dpi so it stays sharp on 300 dpi card printers. */
const PX_PER_MM = 24;

const INK = rgb(0.02, 0.027, 0.059);
const MUTED = rgb(0.36, 0.38, 0.44);
const BRAND_DEEP = rgb(0.29, 0.48, 0.05);
const BLOOD = rgb(0.8, 0.1, 0.13);
const WHITE = rgb(1, 1, 1);

/** y for an element `height` tall whose top edge is `topMm` from the card's top. */
const fromTop = (topMm: number, heightPt = 0) => H - mm(topMm) - heightPt;

function fitText(text: string, font: PDFFont, maxWidth: number, size: number, minSize: number) {
  let s = size;
  while (s > minSize && font.widthOfTextAtSize(text, s) > maxWidth) s -= 0.25;
  if (font.widthOfTextAtSize(text, s) <= maxWidth) return { text, size: s };
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}...`, s) > maxWidth) t = t.slice(0, -1);
  return { text: `${t.trimEnd()}...`, size: s };
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = fitText(`${kept[maxLines - 1]} ${lines.slice(maxLines).join(" ")}`, font, maxWidth, size, size).text;
    return kept;
  }
  return lines;
}

/** drawText with letter spacing (pdf-lib 1.17 has no characterSpacing option). */
function spacedText(page: PDFPage, text: string, opts: { x: number; y: number; size: number; font: PDFFont; color: ReturnType<typeof rgb>; spacing: number }) {
  let x = opts.x;
  for (const ch of text) {
    page.drawText(ch, { x, y: opts.y, size: opts.size, font: opts.font, color: opts.color });
    x += opts.font.widthOfTextAtSize(ch, opts.size) + opts.spacing;
  }
}

const spacedWidth = (text: string, font: PDFFont, size: number, spacing: number) => font.widthOfTextAtSize(text, size) + spacing * (text.length - 1);

const SHUTTLE =
  '<g fill="none" stroke="#d4ff3a" stroke-width="2.6" stroke-linecap="round"><path d="M20 6 L26 40 M32 5 L32 40 M44 6 L38 40 M23 20 H41 M25 30 H39"/></g>' +
  '<path d="M20 6 L44 6 L38 40 L26 40 Z" fill="#d4ff3a" opacity=".22"/><path d="M24 40 H40 L38 48 A6 6 0 0 1 26 48 Z" fill="#d4ff3a"/>';

/** Rasterise decorative SVG art (no text — the image has no fonts) at print resolution. */
function art(svg: string, wMm: number, hMm: number) {
  const w = Math.round(wMm * PX_PER_MM);
  const h = Math.round(hMm * PX_PER_MM);
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${wMm} ${hMm}">${svg}</svg>`;
  return sharp(Buffer.from(doc)).png().toBuffer();
}

const headerArt = (hMm: number) =>
  art(
    `<defs>
      <radialGradient id="g1" cx="0.15" cy="0" r="0.7"><stop offset="0" stop-color="#c8f53c" stop-opacity=".55"/><stop offset="1" stop-color="#c8f53c" stop-opacity="0"/></radialGradient>
      <radialGradient id="g2" cx="0.95" cy="1" r="0.6"><stop offset="0" stop-color="#38e1ff" stop-opacity=".45"/><stop offset="1" stop-color="#38e1ff" stop-opacity="0"/></radialGradient>
      <linearGradient id="stripe" x1="0" x2="1"><stop offset="0" stop-color="#c8f53c"/><stop offset=".5" stop-color="#7cf0a0"/><stop offset="1" stop-color="#38e1ff"/></linearGradient>
    </defs>
    <rect width="${CARD_MM.width}" height="${hMm}" fill="#05070f"/>
    <rect width="${CARD_MM.width}" height="${hMm}" fill="url(#g1)"/>
    <rect width="${CARD_MM.width}" height="${hMm}" fill="url(#g2)"/>
    <g stroke="#ffffff" stroke-opacity=".07" stroke-width=".25" fill="none">
      <rect x="52" y="-6" width="40" height="30"/><line x1="72" y1="-6" x2="72" y2="24"/><line x1="52" y1="6" x2="92" y2="6"/>
    </g>
    <rect y="${hMm - 0.9}" width="${CARD_MM.width}" height="0.9" fill="url(#stripe)"/>
    <g transform="translate(4.6 ${(hMm - 8.6) / 2}) scale(0.155)">${SHUTTLE}</g>`,
    CARD_MM.width,
    hMm,
  );

const footerArt = (hMm: number) =>
  art(
    `<defs><linearGradient id="s" x1="0" x2="1"><stop offset="0" stop-color="#c8f53c"/><stop offset=".5" stop-color="#7cf0a0"/><stop offset="1" stop-color="#38e1ff"/></linearGradient>
    <radialGradient id="g" cx="1" cy="1" r=".8"><stop offset="0" stop-color="#38e1ff" stop-opacity=".35"/><stop offset="1" stop-color="#38e1ff" stop-opacity="0"/></radialGradient></defs>
    <rect width="${CARD_MM.width}" height="${hMm}" fill="#05070f"/><rect width="${CARD_MM.width}" height="${hMm}" fill="url(#g)"/>
    <rect width="${CARD_MM.width}" height="0.9" fill="url(#s)"/>`,
    CARD_MM.width,
    hMm,
  );

/** Photo cropped to 4:5 (face-aware), rounded corners and a thin lime frame. */
async function framedPhoto(bytes: Buffer, wMm: number, hMm: number) {
  const w = Math.round(wMm * PX_PER_MM);
  const h = Math.round(hMm * PX_PER_MM);
  const r = Math.round(1.6 * PX_PER_MM);
  const border = Math.max(2, Math.round(0.35 * PX_PER_MM));
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
  const frame = Buffer.from(
    `<svg width="${w}" height="${h}"><rect x="${border / 2}" y="${border / 2}" width="${w - border}" height="${h - border}" rx="${r - border / 2}" ry="${r - border / 2}" fill="none" stroke="#c8f53c" stroke-width="${border}"/></svg>`,
  );
  return sharp(bytes)
    .rotate() // honour EXIF orientation from phone cameras
    .resize(w, h, { fit: "cover", position: sharp.strategy.attention })
    .composite([
      { input: mask, blend: "dest-in" },
      { input: frame, blend: "over" },
    ])
    .png()
    .toBuffer();
}

/** Code 128 bars as exact vector rectangles (bwip-js emits stroked vertical lines). */
function drawCode128(page: PDFPage, text: string, x: number, y: number, width: number, height: number) {
  const svg = bwipjs.toSVG({ bcid: "code128", text, height: 10, paddingwidth: 0, paddingheight: 0 });
  const scale = width / Number(/viewBox="0 0 ([\d.]+)/.exec(svg)![1]);
  for (const [, sw, d] of svg.matchAll(/<path stroke="#000000" stroke-width="([\d.]+)" d="([^"]+)"/g)) {
    const barW = Number(sw) * scale;
    for (const [, cx] of d.matchAll(/M([\d.]+) [\d.]+L[\d.]+ [\d.]+/g)) {
      page.drawRectangle({ x: x + Number(cx) * scale - barW / 2, y, width: barW, height, color: INK });
    }
  }
}

/** QR code as a vector path, `size` points square with its top-left at (x, yTop). */
function drawQr(page: PDFPage, text: string, x: number, yTop: number, size: number) {
  // BWIPP's default QR error-correction level is M (~15% damage tolerance).
  const svg = bwipjs.toSVG({ bcid: "qrcode", text });
  const view = Number(/viewBox="0 0 ([\d.]+)/.exec(svg)![1]);
  const d = /<path d="([^"]+)"/.exec(svg)![1]!;
  // drawSvgPath uses SVG's y-down coordinates from the given origin.
  page.drawSvgPath(d, { x, y: yTop, scale: size / view, color: INK });
}

// ---------------------------------------------------------------------------
// PDF
// ---------------------------------------------------------------------------

type Academy = { academyName: string; address: string; phone: string; email: string };

export async function renderIdCardPdf(member: IdCardMember, origin: string): Promise<Uint8Array> {
  if (idCardIssues(member).length || !member.memberCode || !member.verifyToken || !member.image) {
    throw new Error("Member is not ready for an ID card");
  }
  const [settings] = await db
    .select({ academyName: siteSettings.academyName, address: siteSettings.address, phone: siteSettings.phone, email: siteSettings.email })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1));
  const academy: Academy = settings ?? { academyName: "Bajrang Badminton Academy", address: "", phone: "", email: "" };
  const photoBytes = await loadPhoto(member.image);
  if (!photoBytes) throw new Error("Member photo is missing from storage");

  const doc = await PDFDocument.create();
  doc.setTitle(`${toPrintableLatin(member.name)} — Member ID card ${member.memberCode}`);
  doc.setSubject(`Member ID ${member.memberCode}`);
  doc.setKeywords([member.memberCode, "ID card", "CR80"]);
  doc.setAuthor(academy.academyName);
  doc.setCreator("Bajrang Badminton Academy");
  doc.setProducer("pdf-lib");

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const mono = await doc.embedFont(StandardFonts.CourierBold);

  const HEADER_MM = 13.5;
  const PHOTO = { x: 4.2, top: HEADER_MM + 3.6, w: 24, h: 30 }; // 4:5 portrait
  const [header, photo, footer] = await Promise.all([
    headerArt(HEADER_MM).then((b) => doc.embedPng(b)),
    framedPhoto(photoBytes, PHOTO.w, PHOTO.h).then((b) => doc.embedPng(b)),
    footerArt(9).then((b) => doc.embedPng(b)),
  ]);

  const shortAcademy = toPrintableLatin(academy.academyName.split(" ")[0] ?? "Bajrang").toUpperCase();
  const name = toPrintableLatin(member.name);
  const since = formatDate(member.statusUpdatedAt ?? member.createdAt);

  // ----- Front ---------------------------------------------------------------
  const front = doc.addPage([W, H]);
  front.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });
  front.drawImage(header, { x: 0, y: fromTop(HEADER_MM), width: W, height: mm(HEADER_MM) });
  front.drawText(shortAcademy, { x: mm(13.2), y: fromTop(6.2), size: 10.5, font: bold, color: WHITE });
  spacedText(front, "BADMINTON ACADEMY", { x: mm(13.2), y: fromTop(9.4), size: 5.2, font: bold, color: rgb(0.78, 0.96, 0.24), spacing: 1.1 });
  // "MEMBER" pill, right-aligned in the header.
  const pillText = "MEMBER";
  // Text width + 0.6pt character spacing per letter + padding.
  const pillW = spacedWidth(pillText, bold, 5.6, 0.6) + mm(3.6);
  front.drawRectangle({ x: W - mm(4.2) - pillW, y: fromTop(8.6), width: pillW, height: mm(4.2), color: rgb(0.78, 0.96, 0.24) });
  spacedText(front, pillText, { x: W - mm(4.2) - pillW + mm(1.8), y: fromTop(7.35), size: 5.6, font: bold, color: INK, spacing: 0.6 });

  front.drawImage(photo, { x: mm(PHOTO.x), y: fromTop(PHOTO.top, mm(PHOTO.h)), width: mm(PHOTO.w), height: mm(PHOTO.h) });

  const colX = mm(PHOTO.x + PHOTO.w + 4);
  const colW = W - colX - mm(4.2);
  const nameFit = fitText(name, bold, colW, 12.5, 7.5);
  front.drawText(nameFit.text, { x: colX, y: fromTop(PHOTO.top + 4.4), size: nameFit.size, font: bold, color: INK });

  const label = (text: string, x: number, topMm: number) =>
    spacedText(front, text, { x, y: fromTop(topMm), size: 4.6, font: bold, color: MUTED, spacing: 0.7 });

  label("MEMBER ID", colX, PHOTO.top + 9.8);
  front.drawText(member.memberCode, { x: colX, y: fromTop(PHOTO.top + 13.9), size: 10.4, font: mono, color: INK });

  // Blood group — a red block so it can be found at a glance in an emergency.
  label("BLOOD GROUP", colX, PHOTO.top + 19.2);
  const bgText = member.bloodGroup!;
  const bgW = Math.max(mm(9), bold.widthOfTextAtSize(bgText, 11) + mm(3.6));
  front.drawRectangle({ x: colX, y: fromTop(PHOTO.top + 27.6), width: bgW, height: mm(7), color: BLOOD });
  front.drawText(bgText, { x: colX + (bgW - bold.widthOfTextAtSize(bgText, 11)) / 2, y: fromTop(PHOTO.top + 25.3), size: 11, font: bold, color: WHITE });

  const col2 = colX + Math.max(bgW, mm(13)) + mm(4);
  label("LEVEL", col2, PHOTO.top + 19.2);
  front.drawText(capitalize(member.skillLevel), { x: col2, y: fromTop(PHOTO.top + 22.7), size: 7.4, font: bold, color: INK });
  label("MEMBER SINCE", col2, PHOTO.top + 25.9);
  front.drawText(since, { x: col2, y: fromTop(PHOTO.top + 29.4), size: 7.4, font: bold, color: INK });

  // Bottom accent stripe.
  front.drawRectangle({ x: 0, y: 0, width: W, height: mm(1.6), color: rgb(0.78, 0.96, 0.24) });
  front.drawRectangle({ x: W * 0.55, y: 0, width: W * 0.45, height: mm(1.6), color: rgb(0.22, 0.88, 1) });

  // ----- Back ----------------------------------------------------------------
  const back = doc.addPage([W, H]);
  back.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });

  const QR = { size: 23, right: 4.2, top: 4.2 };
  const qrX = W - mm(QR.right + QR.size);
  drawQr(back, verifyUrl(origin, member.verifyToken), qrX, fromTop(QR.top), mm(QR.size));
  const scanText = "SCAN TO VERIFY";
  spacedText(back, scanText, { x: qrX + (mm(QR.size) - spacedWidth(scanText, bold, 5, 0.4)) / 2, y: fromTop(QR.top + QR.size + 2.6), size: 5, font: bold, color: INK, spacing: 0.4 });

  const leftX = mm(4.2);
  const leftW = qrX - leftX - mm(4);
  spacedText(back, "IF FOUND, PLEASE RETURN TO", { x: leftX, y: fromTop(6.4), size: 4.6, font: bold, color: MUTED, spacing: 0.6 });
  const academyFit = fitText(toPrintableLatin(academy.academyName), bold, leftW, 8, 6);
  back.drawText(academyFit.text, { x: leftX, y: fromTop(10), size: academyFit.size, font: bold, color: INK });
  let lineTop = 13.4;
  for (const line of wrap(toPrintableLatin(academy.address), regular, 6, leftW, 3)) {
    back.drawText(line, { x: leftX, y: fromTop(lineTop), size: 6, font: regular, color: INK });
    lineTop += 2.7;
  }
  lineTop += 0.6;
  for (const line of [academy.phone, academy.email].filter(Boolean).map(toPrintableLatin)) {
    back.drawText(line, { x: leftX, y: fromTop(lineTop), size: 6, font: bold, color: BRAND_DEEP });
    lineTop += 2.7;
  }

  // Code 128 of the member ID, for front-desk USB scanners (Admin → Verify card).
  const BAR = { top: 30.2, h: 7.2, w: 50 };
  drawCode128(back, member.memberCode, leftX, fromTop(BAR.top, mm(BAR.h)), mm(BAR.w), mm(BAR.h));
  const codeW = spacedWidth(member.memberCode, mono, 6.6, 0.5);
  spacedText(back, member.memberCode, { x: leftX + (mm(BAR.w) - codeW) / 2, y: fromTop(BAR.top + BAR.h + 3), size: 6.6, font: mono, color: INK, spacing: 0.5 });


  const FOOT = 9;
  back.drawImage(footer, { x: 0, y: 0, width: W, height: mm(FOOT) });
  const note = "Valid only with an active membership. Scan the QR code for live status.";
  const noteFit = fitText(note, regular, W - mm(8.4), 5.2, 4.4);
  back.drawText(noteFit.text, { x: mm(4.2), y: mm(FOOT / 2 - 0.8), size: noteFit.size, font: regular, color: rgb(0.85, 0.88, 0.92) });

  // Classic cross-reference table (no object streams): older card-printer RIPs and
  // drivers handle it more reliably.
  return doc.save({ useObjectStreams: false });
}
