import { BuildingSync } from "@/components/admin/building-sync";
import { BuildingsList } from "@/components/admin/buildings-list";
import { getBuildingsList } from "@/actions/building-sync";

export default async function BuildingSyncPage() {
  const buildings = await getBuildingsList();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Building Sync</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste a building&apos;s availability page to sync all units at once.
          The system will detect new units, removed units, and unchanged units.
        </p>
      </div>
      <BuildingSync />
      {buildings.length > 0 && <BuildingsList buildings={buildings} />}
    </div>
  );
}
