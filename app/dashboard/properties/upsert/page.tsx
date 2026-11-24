import { redirect } from "next/navigation";

// Legacy URL: /upsert?id=X -> /X/edit; /upsert[?...] -> /new[?...].
export default async function ListingUpsertPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { id, duplicateFrom } = params;
  if (typeof id === "string" && id && !duplicateFrom) {
    redirect(`/dashboard/properties/${encodeURIComponent(id)}/edit`);
  }
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) qs.append(k, x);
  }
  const query = qs.toString();
  redirect(`/dashboard/properties/new${query ? `?${query}` : ""}`);
}
