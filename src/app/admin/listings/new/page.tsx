import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ListingForm } from "@/components/admin/listing-form";
import { createListingAction } from "@/actions/listings";
import { UrlExtractor } from "@/components/admin/url-extractor";
import { NewListingAutosave } from "./autosave-wrapper";

export default function NewListingPage() {
  async function handleCreate(
    _prevState: string | null,
    formData: FormData
  ): Promise<string | null> {
    "use server";
    try {
      await createListingAction(formData);
      return null;
    } catch (e) {
      if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
      if (typeof e === "object" && e !== null && "digest" in e) throw e;
      return e instanceof Error ? e.message : "Failed to create listing";
    }
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-[var(--primary)]">
        Add New Listing
      </h1>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Import from URL</h2>
            <p className="text-sm text-gray-500">
              Paste a StreetEasy, building website, or any listing URL to
              auto-extract data
            </p>
          </CardHeader>
          <CardContent>
            <UrlExtractor />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Manual Entry</h2>
        </CardHeader>
        <CardContent>
          <NewListingAutosave action={handleCreate} />
        </CardContent>
      </Card>
    </div>
  );
}
