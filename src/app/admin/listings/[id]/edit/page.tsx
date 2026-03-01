import { getListingById } from "@/lib/firestore";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ListingForm } from "@/components/admin/listing-form";
import { updateListingAction, deleteListingAction } from "@/actions/listings";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

interface EditListingPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({
  params,
}: EditListingPageProps) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  async function handleUpdate(
    _prevState: string | null,
    formData: FormData
  ): Promise<string | null> {
    "use server";
    try {
      await updateListingAction(id, formData);
      return null;
    } catch (e) {
      if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
      if (typeof e === "object" && e !== null && "digest" in e) throw e;
      return e instanceof Error ? e.message : "Failed to update listing";
    }
  }

  async function handleDelete() {
    "use server";
    await deleteListingAction(id);
    redirect("/admin/listings");
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Edit Listing</h1>
        <form action={handleDelete}>
          <Button type="submit" variant="danger" size="sm">
            Delete Listing
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-white">Listing Details</h2>
        </CardHeader>
        <CardContent>
          <ListingForm listing={listing} action={handleUpdate} enableAutosave />
        </CardContent>
      </Card>
    </div>
  );
}
