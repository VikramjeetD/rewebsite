import { revalidatePath } from "next/cache";

/** Revalidates all listing-related paths. Optionally includes a specific listing slug. */
export function revalidateListingPaths(slug?: string) {
  revalidatePath("/admin/listings");
  revalidatePath("/listings");
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/listings/${slug}`);
  }
}
