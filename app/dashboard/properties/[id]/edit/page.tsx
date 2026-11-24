import { Suspense } from "react";
import ListingEditor from "../../new/ListingEditor";

export default async function EditPropertyListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={null}>
      <ListingEditor mode="edit" listingId={id} />
    </Suspense>
  );
}
