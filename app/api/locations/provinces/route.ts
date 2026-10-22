import { getProvinces } from "@/lib/server/administrative-catalog";

export function GET() {
  return Response.json(getProvinces(), { headers: { "Cache-Control": "public, max-age=300" } });
}
