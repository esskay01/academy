import { getSession, isAdmin } from "@/lib/dal";
import { getIdCardMember, publicOrigin, renderIdCardPdf } from "@/lib/id-card";
import { idCardIssues } from "@/lib/id-card-rules";

/**
 * The member's ID card as a 2-page CR80 PDF (front, back) for PVC card printers.
 * `?download=1` saves it; otherwise it opens inline for preview/printing.
 * Admin-only — route handlers are public endpoints, so check here, not just in the layout.
 */
export async function GET(request: Request, ctx: RouteContext<"/admin/members/[id]/id-card/pdf">) {
  const session = await getSession();
  if (!session || !isAdmin(session)) {
    return Response.json({ error: "Admins only." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const member = await getIdCardMember(id);
  if (!member) return Response.json({ error: "Member not found." }, { status: 404 });

  const issues = idCardIssues(member);
  if (issues.length) {
    return Response.json({ error: "This member's ID card can't be printed yet.", issues: issues.map((i) => i.label) }, { status: 409 });
  }

  const pdf = await renderIdCardPdf(member, publicOrigin(request.url));
  const download = new URL(request.url).searchParams.has("download");
  const filename = `${member.memberCode}-id-card.pdf`;
  return new Response(pdf as Uint8Array<ArrayBuffer>, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
