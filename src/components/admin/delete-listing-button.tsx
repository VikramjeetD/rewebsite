"use client";

import { deleteListingAction } from "@/actions/listings";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface DeleteListingButtonProps {
  listingId: string;
  listingTitle: string;
}

export function DeleteListingButton({
  listingId,
  listingTitle,
}: DeleteListingButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!window.confirm(`Delete "${listingTitle}"? This cannot be undone.`)) {
      return;
    }
    startTransition(async () => {
      await deleteListingAction(listingId);
      router.refresh();
    });
  }

  return (
    <Button
      variant="danger"
      size="sm"
      onClick={handleDelete}
      disabled={isPending}
    >
      {isPending ? "Deleting..." : "Delete"}
    </Button>
  );
}
