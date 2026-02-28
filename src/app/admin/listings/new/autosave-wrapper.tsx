"use client";

import { useCallback } from "react";
import { ListingForm } from "@/components/admin/listing-form";

interface NewListingAutosaveProps {
  action: (
    prevState: string | null,
    formData: FormData
  ) => Promise<string | null>;
}

export function NewListingAutosave({ action }: NewListingAutosaveProps) {
  const handleDraftCreated = useCallback((id: string) => {
    window.history.replaceState(null, "", `/admin/listings/${id}/edit`);
  }, []);

  return (
    <ListingForm
      action={action}
      enableAutosave
      onDraftCreated={handleDraftCreated}
    />
  );
}
