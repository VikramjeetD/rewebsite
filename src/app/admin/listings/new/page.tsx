import { createListingAction, updateListingAction } from "@/actions/listings";
import { getListingById } from "@/lib/firestore";
import { NewListingAutosave } from "./autosave-wrapper";

interface NewListingPageProps {
  searchParams: Promise<{ draftId?: string }>;
}

export default async function NewListingPage({
  searchParams,
}: NewListingPageProps) {
  const { draftId } = await searchParams;
  const draft = draftId ? await getListingById(draftId) : null;

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

  async function handleUpdate(
    _prevState: string | null,
    formData: FormData
  ): Promise<string | null> {
    "use server";
    if (!draftId) return "No draft ID";
    try {
      await updateListingAction(draftId, formData);
      return null;
    } catch (e) {
      if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
      if (typeof e === "object" && e !== null && "digest" in e) throw e;
      return e instanceof Error ? e.message : "Failed to save listing";
    }
  }

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-[var(--primary)]">
        Add New Listing
      </h1>

      <NewListingAutosave
        listing={draft ?? undefined}
        action={draft ? handleUpdate : handleCreate}
      />
    </div>
  );
}
