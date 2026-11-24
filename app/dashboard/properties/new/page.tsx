import { Suspense } from "react";
import { redirect } from "next/navigation";
import ListingEditor from "./ListingEditor";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CreatePropertyListingPage({ searchParams }: { searchParams: SearchParams }) {
  const { id, duplicateFrom } = await searchParams;
  // Legacy edit URL: /new?id=X -> /X/edit (duplicateFrom wins, as before).
  if (typeof id === "string" && id && !duplicateFrom) {
    redirect(`/dashboard/properties/${encodeURIComponent(id)}/edit`);
  }
  return (
    <Suspense fallback={null}>
      <ListingEditor mode="create" />
    </Suspense>
  );
}
