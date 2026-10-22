import { getWardsByProvince, hasProvince } from "@/lib/server/administrative-catalog";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  if (!hasProvince(code)) return Response.json({ message: "Không tìm thấy tỉnh/thành phố." }, { status: 404 });
  return Response.json(getWardsByProvince(code), { headers: { "Cache-Control": "public, max-age=300" } });
}
