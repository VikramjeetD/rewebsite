"use client";

import { formatDistanceToNow } from "date-fns";
import { Building2 } from "lucide-react";
import type { BuildingAmenities } from "@/types";

interface BuildingsListProps {
  buildings: BuildingAmenities[];
}

export function BuildingsList({ buildings }: BuildingsListProps) {
  return (
    <div className="mt-10">
      <h2 className="mb-4 text-lg font-semibold text-white">Your Buildings</h2>
      <div className="border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/40">
              <th className="px-4 py-3 font-medium">Building</th>
              <th className="px-4 py-3 font-medium">Units</th>
              <th className="px-4 py-3 font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((building) => (
              <tr
                key={building.id}
                className="border-b border-white/5 hover:bg-white/5 transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-white/30 shrink-0" />
                    <span className="font-medium text-white">
                      {building.address}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-white/60">
                  {building.totalUnits ?? "—"}
                </td>
                <td className="px-4 py-3 text-white/40">
                  {formatDistanceToNow(building.updatedAt, {
                    addSuffix: true,
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
