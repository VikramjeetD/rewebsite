"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { formatPrice, formatBedrooms, formatBathrooms } from "@/lib/utils";

/** Serializable subset passed from server component */
export interface MapListing {
  id: string;
  title: string;
  address: string;
  unit: string | null;
  neighborhood: string;
  type: "RENTAL" | "SALE";
  status: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number | null;
  latitude: number;
  longitude: number;
  slug: string;
}

interface AddressGroup {
  address: string;
  lat: number;
  lng: number;
  listings: MapListing[];
}

function groupByAddress(listings: MapListing[]): AddressGroup[] {
  const map = new Map<string, AddressGroup>();
  for (const l of listings) {
    // Group by address string (normalized)
    const key = l.address.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, {
        address: l.address,
        lat: l.latitude,
        lng: l.longitude,
        listings: [],
      });
    }
    map.get(key)!.listings.push(l);
  }
  return Array.from(map.values());
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#22c55e",
  IN_CONTRACT: "#eab308",
  DRAFT: "#6b7280",
  RENTED: "#3b82f6",
  SOLD: "#3b82f6",
  OFF_MARKET: "#6b7280",
};

function markerColor(listings: MapListing[]): string {
  // Use the "best" status in the group
  if (listings.some((l) => l.status === "ACTIVE")) return STATUS_COLORS.ACTIVE;
  if (listings.some((l) => l.status === "IN_CONTRACT"))
    return STATUS_COLORS.IN_CONTRACT;
  if (listings.some((l) => l.status === "DRAFT")) return STATUS_COLORS.DRAFT;
  return STATUS_COLORS.RENTED;
}

function buildInfoContent(group: AddressGroup): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const isMultiUnit = group.listings.length > 1;
  const header = `<div style="font-weight:700;font-size:14px;color:#111;margin-bottom:6px;">${esc(group.address)}</div>`;

  const rows = group.listings
    .sort((a, b) => {
      // Sort: ACTIVE first, then by unit
      const statusOrder = [
        "ACTIVE",
        "IN_CONTRACT",
        "DRAFT",
        "RENTED",
        "SOLD",
        "OFF_MARKET",
      ];
      const diff =
        statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      if (diff !== 0) return diff;
      return (a.unit ?? "").localeCompare(b.unit ?? "");
    })
    .map((l) => {
      const unitLabel = l.unit ? `Unit ${esc(l.unit)}` : l.title;
      const statusColor = STATUS_COLORS[l.status] ?? "#6b7280";
      const statusLabel = l.status.replace("_", " ");
      const price = formatPrice(l.price, l.type);
      const beds = formatBedrooms(l.bedrooms);
      const baths = formatBathrooms(l.bathrooms);
      const sqft = l.sqft ? ` &middot; ${l.sqft.toLocaleString()} sqft` : "";
      const editUrl = `/admin/listings/${l.id}/edit`;

      return `<a href="${esc(editUrl)}" style="display:block;padding:6px 0;border-top:1px solid #eee;text-decoration:none;color:inherit;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <span style="font-weight:600;font-size:13px;color:#111;">${isMultiUnit ? esc(unitLabel) : esc(l.title)}</span>
          <span style="font-size:11px;font-weight:600;color:${statusColor};text-transform:uppercase;">${statusLabel}</span>
        </div>
        <div style="font-size:12px;color:#555;margin-top:2px;">${price} &middot; ${beds} &middot; ${baths}${sqft}</div>
      </a>`;
    })
    .join("");

  const count = group.listings.length;
  const subtitle = isMultiUnit
    ? `<div style="font-size:12px;color:#888;margin-bottom:4px;">${count} unit${count !== 1 ? "s" : ""}</div>`
    : "";

  return `<div style="min-width:220px;max-width:320px;font-family:system-ui,-apple-system,sans-serif;padding:2px 0;">
    ${header}${subtitle}${rows}
  </div>`;
}

function createMarkerDot(color: string, count: number): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `
    width:${count > 1 ? 28 : 14}px;
    height:${count > 1 ? 28 : 14}px;
    background:${color};
    border:2px solid rgba(255,255,255,0.9);
    border-radius:50%;
    cursor:pointer;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:11px;
    font-weight:700;
    color:#fff;
    transition:transform 0.15s;
    box-shadow:0 1px 4px rgba(0,0,0,0.4);
  `;
  if (count > 1) el.textContent = String(count);
  return el;
}

// ── Filter types ─────────────────────────────────────────────────────────────

type TypeFilter = "ALL" | "RENTAL" | "SALE";
type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "IN_CONTRACT"
  | "DRAFT"
  | "RENTED"
  | "SOLD"
  | "OFF_MARKET";

// ── Component ────────────────────────────────────────────────────────────────

export function ListingsMap({ listings }: { listings: MapListing[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const filteredListings = listings.filter((l) => {
    if (typeFilter !== "ALL" && l.type !== typeFilter) return false;
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    return true;
  });

  const renderMarkers = useCallback((filtered: MapListing[]) => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    for (const m of markersRef.current) m.map = null;
    markersRef.current = [];

    const { AdvancedMarkerElement } = google.maps.marker;
    const iw =
      infoWindowRef.current ??
      new google.maps.InfoWindow({ disableAutoPan: false });
    infoWindowRef.current = iw;

    const groups = groupByAddress(filtered);
    const bounds = new google.maps.LatLngBounds();

    for (const group of groups) {
      const position = { lat: group.lat, lng: group.lng };
      bounds.extend(position);

      const dot = createMarkerDot(
        markerColor(group.listings),
        group.listings.length
      );
      const marker = new AdvancedMarkerElement({
        map,
        position,
        content: dot,
        title: group.address,
      });

      marker.element.addEventListener("mouseenter", () => {
        dot.style.transform = "scale(1.4)";
        iw.setContent(buildInfoContent(group));
        iw.open({ map, anchor: marker });
      });
      marker.element.addEventListener("mouseleave", () => {
        dot.style.transform = "scale(1)";
      });
      marker.element.addEventListener("click", () => {
        iw.setContent(buildInfoContent(group));
        iw.open({ map, anchor: marker });
      });

      markersRef.current.push(marker);
    }

    if (groups.length > 0) {
      map.fitBounds(bounds, 50);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (mapRef.current) return;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !mapContainerRef.current) return;

    setOptions({ key: apiKey, v: "weekly" });

    Promise.all([importLibrary("maps"), importLibrary("marker")]).then(() => {
      if (!mapContainerRef.current) return;
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: 40.7128, lng: -74.006 }, // NYC default
        zoom: 12,
        ...(mapId ? { mapId } : {}),
        colorScheme: google.maps.ColorScheme.DARK,
        disableDefaultUI: false,
        gestureHandling: "greedy",
      });
      mapRef.current = map;
      setMapLoaded(true);
    });
  }, []);

  // Re-render markers when filters or map ready changes
  useEffect(() => {
    if (mapLoaded) renderMarkers(filteredListings);
  }, [mapLoaded, filteredListings, renderMarkers]);

  const typeButtons: { value: TypeFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "RENTAL", label: "Rentals" },
    { value: "SALE", label: "Sales" },
  ];

  const statusButtons: { value: StatusFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "ACTIVE", label: "Active" },
    { value: "IN_CONTRACT", label: "In Contract" },
    { value: "DRAFT", label: "Draft" },
    { value: "RENTED", label: "Rented" },
    { value: "SOLD", label: "Sold" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 pb-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wider text-white/40 mr-1">
            Type
          </span>
          {typeButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setTypeFilter(btn.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                typeFilter === btn.value
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wider text-white/40 mr-1">
            Status
          </span>
          {statusButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setStatusFilter(btn.value)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === btn.value
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/60 hover:bg-white/20"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/40">
          {filteredListings.length} listing
          {filteredListings.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Map */}
      <div className="relative flex-1 rounded-xl overflow-hidden bg-white/5">
        <div ref={mapContainerRef} className="absolute inset-0" />
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
            Loading map...
          </div>
        )}
      </div>
    </div>
  );
}
