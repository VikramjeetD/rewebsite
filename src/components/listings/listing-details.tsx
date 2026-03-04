"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  formatPrice,
  formatBedrooms,
  formatBathrooms,
  formatEffectiveRent,
} from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ExternalLink,
  Building2,
  Layers,
  Hash,
  Info,
  X,
  Car,
  TrainFront,
  Footprints,
  Bike,
  Grid3X3,
  MapPin,
  Box,
} from "lucide-react";
import { BuildingViewer } from "./building-viewer";
import { groupAmenitiesByCategory } from "@/lib/amenities";
import { format } from "date-fns";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import Image from "next/image";
import type { Listing, BuildingAmenities } from "@/types";
/** Google Routes API response types */
interface TransitLine {
  name?: string;
  nameShort?: string;
  color?: string;
  textColor?: string;
}

interface TransitDetails {
  transitLine?: TransitLine;
  stopCount?: number;
}

interface RouteStep {
  travelMode: string;
  polyline?: { encodedPolyline: string };
  transitDetails?: TransitDetails;
  duration?: string;
  staticDuration?: string;
  localizedValues?: {
    staticDuration?: { text: string };
  };
}

interface RouteLeg {
  steps: RouteStep[];
}

interface Route {
  duration?: string;
  distanceMeters: number;
  polyline?: { encodedPolyline: string };
  legs?: RouteLeg[];
}

/** Google Places (new) API types */
interface PlacesNewApi {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(options: {
      input: string;
      sessionToken?: object | null;
      includedRegionCodes?: string[];
      language?: string;
    }): Promise<{ suggestions: PlacesSuggestionResult[] }>;
  };
}

interface PlacesSuggestionResult {
  placePrediction?: {
    text?: { text: string };
    mainText?: { text: string };
    secondaryText?: { text: string };
  };
}

function getPlacesNewApi(): PlacesNewApi | null {
  try {
    const places = google.maps.places as unknown as PlacesNewApi;
    if (places?.AutocompleteSuggestion) return places;
  } catch { /* not available */ }
  return null;
}

function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let shift = 0,
      result = 0,
      b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) return `${Math.round(meters * 3.28084)} ft`;
  return `${miles.toFixed(1)} mi`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${hours} hr ${rem} min` : `${hours} hr`;
}

function mergeTransitSteps(steps: RouteStep[]): RouteStep[] {
  const merged: RouteStep[] = [];
  for (const step of steps) {
    const last = merged[merged.length - 1];
    if (step.travelMode === "WALK" && last?.travelMode === "WALK") {
      const prevSec = parseInt(last.staticDuration?.replace("s", "") || "0");
      const curSec = parseInt(step.staticDuration?.replace("s", "") || "0");
      const totalSec = prevSec + curSec;
      const totalMin = Math.max(1, Math.round(totalSec / 60));
      merged[merged.length - 1] = {
        ...last,
        staticDuration: `${totalSec}s`,
        localizedValues: {
          ...last.localizedValues,
          staticDuration: { text: `${totalMin} min` },
        },
      };
    } else {
      merged.push({ ...step });
    }
  }
  return merged;
}

interface ListingDetailsProps {
  listing: Listing;
  buildingInfo?: BuildingAmenities | null;
}

export function ListingDetails({ listing, buildingInfo }: ListingDetailsProps) {
  const [activeModal, setActiveModal] = useState<"floorplan" | "map" | "3d" | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const routePolylinesRef = useRef<google.maps.Polyline[]>([]);
  const routeMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);
  const placesLoadedRef = useRef(false);
  const sessionTokenRef = useRef<object | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const [autocompletePos, setAutocompletePos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const [directionsInput, setDirectionsInput] = useState("");
  const [directionType, setDirectionType] = useState<"to" | "from">("to");
  const [suggestions, setSuggestions] = useState<
    Array<{ text: string; mainText: string; secondaryText: string }>
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [travelMode, setTravelMode] = useState("TRANSIT");
  const [directionsResult, setDirectionsResult] = useState<{
    distance: string;
    duration: string;
    steps: RouteStep[];
  } | null>(null);
  const [directionsError, setDirectionsError] = useState("");
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);

  useEffect(() => {
    if (activeModal !== "map" || !listing.latitude || !listing.longitude) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    setOptions({ key: apiKey, v: "weekly" });

    Promise.all([
      importLibrary("maps"),
      importLibrary("marker"),
    ]).then(([, markerLib]) => {
      if (!mapRef.current) return;
      const { AdvancedMarkerElement } = markerLib as typeof google.maps.marker;
      const position = { lat: listing.latitude!, lng: listing.longitude! };
      const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
      const map = new google.maps.Map(mapRef.current, {
        center: position,
        zoom: 15,
        ...(mapId ? { mapId } : {}),
        colorScheme: google.maps.ColorScheme.DARK,
      });
      const marker = new AdvancedMarkerElement({ position, map });
      const transitLayer = new google.maps.TransitLayer();
      transitLayer.setMap(map);
      transitLayerRef.current = transitLayer;
      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Load places library for autocomplete (non-blocking)
      importLibrary("places")
        .then(() => {
          placesLoadedRef.current = true;
          try {
            sessionTokenRef.current = new (getPlacesNewApi()!).AutocompleteSessionToken();
          } catch {
            // New session tokens not available, legacy fallback will be used
          }
        })
        .catch(() => {
          // Places library not available, autocomplete disabled
        });
    });
  }, [activeModal, listing.latitude, listing.longitude]);

  const clearDirections = useCallback(() => {
    routePolylinesRef.current.forEach((p) => p.setMap(null));
    routePolylinesRef.current = [];
    routeMarkersRef.current.forEach((m) => { m.map = null; });
    routeMarkersRef.current = [];
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.map = mapInstanceRef.current;
    }
    if (transitLayerRef.current && mapInstanceRef.current) {
      transitLayerRef.current.setMap(mapInstanceRef.current);
    }
    setDirectionsResult(null);
    setAllRoutes([]);
    setSelectedRouteIndex(0);
    setDirectionsError("");
  }, []);

  const renderRouteOnMap = useCallback(
    (route: Route, mode: string) => {
      if (!mapInstanceRef.current) return;
      routePolylinesRef.current.forEach((p) => p.setMap(null));
      routePolylinesRef.current = [];
      routeMarkersRef.current.forEach((m) => { m.map = null; });
      routeMarkersRef.current = [];

      if (markerRef.current) markerRef.current.map = null;
      if (transitLayerRef.current) transitLayerRef.current.setMap(null);

      const bounds = new google.maps.LatLngBounds();
      const steps = route.legs?.[0]?.steps || [];

      if (mode === "TRANSIT" && steps.length > 0) {
        for (const step of steps) {
          if (!step.polyline?.encodedPolyline) continue;
          const path = decodePolyline(step.polyline.encodedPolyline);
          path.forEach((p) => bounds.extend(p));

          if (step.travelMode === "WALK") {
            const polyline = new google.maps.Polyline({
              path,
              strokeColor: "#9AA0A6",
              strokeOpacity: 0,
              strokeWeight: 4,
              icons: [
                {
                  icon: {
                    path: "M 0,-1 0,1",
                    strokeOpacity: 1,
                    strokeWeight: 4,
                    scale: 1.5,
                  },
                  offset: "0",
                  repeat: "12px",
                },
              ],
              map: mapInstanceRef.current,
            });
            routePolylinesRef.current.push(polyline);
          } else if (step.travelMode === "TRANSIT") {
            const color =
              step.transitDetails?.transitLine?.color || "#4285F4";
            const polyline = new google.maps.Polyline({
              path,
              strokeColor: color,
              strokeOpacity: 1,
              strokeWeight: 5,
              map: mapInstanceRef.current,
            });
            routePolylinesRef.current.push(polyline);
          }
        }
      } else if (route.polyline?.encodedPolyline) {
        const path = decodePolyline(route.polyline.encodedPolyline);
        path.forEach((p) => bounds.extend(p));
        const polyline = new google.maps.Polyline({
          path,
          strokeColor: "#4285F4",
          strokeOpacity: 0.8,
          strokeWeight: 5,
          map: mapInstanceRef.current,
        });
        routePolylinesRef.current.push(polyline);
      }

      const overallPath = route.polyline?.encodedPolyline
        ? decodePolyline(route.polyline.encodedPolyline)
        : [];
      if (overallPath.length > 0) {
        const { AdvancedMarkerElement } = google.maps.marker;
        const startLabel = document.createElement("div");
        startLabel.textContent = "A";
        startLabel.style.cssText = "background:#4285F4;color:#fff;font-weight:bold;font-size:12px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;";
        const endLabel = document.createElement("div");
        endLabel.textContent = "B";
        endLabel.style.cssText = "background:#EA4335;color:#fff;font-weight:bold;font-size:12px;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;";
        const startMarker = new AdvancedMarkerElement({
          position: overallPath[0],
          map: mapInstanceRef.current,
          content: startLabel,
        });
        const endMarker = new AdvancedMarkerElement({
          position: overallPath[overallPath.length - 1],
          map: mapInstanceRef.current,
          content: endLabel,
        });
        routeMarkersRef.current = [startMarker, endMarker];
        if (bounds.isEmpty()) {
          overallPath.forEach((p) => bounds.extend(p));
        }
      }

      if (!bounds.isEmpty()) {
        mapInstanceRef.current.fitBounds(bounds, 50);
      }
    },
    []
  );

  const selectRoute = useCallback(
    (index: number) => {
      if (index === selectedRouteIndex || !allRoutes[index]) return;
      setSelectedRouteIndex(index);
      const route = allRoutes[index];
      const durationSeconds = parseInt(
        route.duration?.replace("s", "") || "0"
      );
      const steps = route.legs?.[0]?.steps || [];
      setDirectionsResult({
        distance: formatDistance(route.distanceMeters),
        duration: formatDuration(durationSeconds),
        steps,
      });
      renderRouteOnMap(route, travelMode);
    },
    [selectedRouteIndex, allRoutes, travelMode, renderRouteOnMap]
  );

  const updateAutocompletePos = useCallback(() => {
    if (autocompleteContainerRef.current) {
      const rect = autocompleteContainerRef.current.getBoundingClientRect();
      setAutocompletePos({ top: rect.top, left: rect.left, width: rect.width });
    }
  }, []);

  const fetchSuggestions = useCallback(async (input: string) => {
    if (!input.trim() || !placesLoadedRef.current) {
      setSuggestions([]);
      return;
    }

    try {
      const placesApi = getPlacesNewApi();
      if (!placesApi) return;
      const { suggestions: results } =
        await placesApi.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ["us"],
          language: "en-US",
        });
      setSuggestions(
        results.map((s: PlacesSuggestionResult) => ({
          text: s.placePrediction?.text?.text || "",
          mainText: s.placePrediction?.mainText?.text || "",
          secondaryText: s.placePrediction?.secondaryText?.text || "",
        }))
      );
      updateAutocompletePos();
      setShowSuggestions(true);
    } catch (err) {
      console.error("Places autocomplete error:", err);
      setSuggestions([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setDirectionsInput(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!value.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
    },
    [fetchSuggestions]
  );

  const handleSuggestionSelect = useCallback((text: string) => {
    setDirectionsInput(text);
    setSuggestions([]);
    setShowSuggestions(false);
    try {
      sessionTokenRef.current = new (getPlacesNewApi()!).AutocompleteSessionToken();
    } catch {
      // ignore
    }
  }, []);

  const calculateDirections = useCallback(
    async (modeOverride?: string) => {
      if (!mapInstanceRef.current || !directionsInput.trim()) return;

      const mode = modeOverride ?? travelMode;

      setDirectionsLoading(true);
      setDirectionsError("");
      setDirectionsResult(null);
      setAllRoutes([]);
      setSelectedRouteIndex(0);
      clearDirections();

      const listingAddress = `${listing.address}, ${listing.city}, ${listing.state}`;
      const origin =
        directionType === "to" ? directionsInput.trim() : listingAddress;
      const destination =
        directionType === "to" ? listingAddress : directionsInput.trim();

      try {
        const response = await fetch("/api/directions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: { address: origin },
            destination: { address: destination },
            travelMode: mode,
            ...(mode === "DRIVE"
              ? { routingPreference: "TRAFFIC_AWARE" }
              : {}),
            ...(mode === "TRANSIT"
              ? { computeAlternativeRoutes: true }
              : {}),
          }),
        });

        const data = await response.json();

        if (!data.routes?.length) {
          setDirectionsError("Could not find directions for that address.");
          setDirectionsLoading(false);
          return;
        }

        const routes = data.routes;
        setAllRoutes(routes);

        const route = routes[0];
        const durationSeconds = parseInt(
          route.duration?.replace("s", "") || "0"
        );
        const steps = route.legs?.[0]?.steps || [];

        setDirectionsResult({
          distance: formatDistance(route.distanceMeters),
          duration: formatDuration(durationSeconds),
          steps,
        });

        renderRouteOnMap(route, mode);
      } catch {
        setDirectionsError("Could not find directions for that address.");
      }

      setDirectionsLoading(false);
    },
    [
      directionsInput,
      travelMode,
      directionType,
      listing.address,
      listing.city,
      listing.state,
      clearDirections,
      renderRouteOnMap,
    ]
  );

  const closeModal = useCallback(() => {
    setActiveModal(null);
    clearDirections();
    setDirectionsInput("");
    setSuggestions([]);
    setShowSuggestions(false);
  }, [clearDirections]);

  useEffect(() => {
    if (activeModal === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeModal, closeModal]);

  return (
    <div className="lg:col-span-2">
      {listing.status !== "ACTIVE" && (
        <div className="mb-4">
          <StatusBadge status={listing.status} size="md" />
        </div>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-3xl font-bold text-[var(--primary)]">
          {listing.title}
        </h1>
        <span className="text-sm text-gray-400">
          {listing.neighborhood}, {listing.borough}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-2xl font-bold text-[var(--primary)]">
          {formatPrice(listing.price, listing.type)}
        </p>
        {listing.type === "RENTAL" &&
          (() => {
            const effective = formatEffectiveRent(
              listing.price,
              listing.leaseDuration,
              listing.freeMonths
            );
            return effective ? (
              <span className="flex items-center gap-1.5 text-sm text-gray-400">
                Effective rent: {effective}
                <span className="group relative cursor-help">
                  <Info className="inline h-3.5 w-3.5" />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded bg-white px-3 py-1.5 text-sm text-black opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {listing.freeMonths} month
                    {listing.freeMonths !== 1 ? "s" : ""} free on{" "}
                    {listing.leaseDuration}-month lease
                  </span>
                </span>
              </span>
            ) : null;
          })()}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-300">
        <div className="flex flex-wrap items-center gap-3">
          <span>{formatBedrooms(listing.bedrooms)}</span>
          <span className="text-white/30">|</span>
          <span>{formatBathrooms(listing.bathrooms)}</span>
          {listing.sqft && (
            <>
              <span className="text-white/30">|</span>
              <span>{listing.sqft.toLocaleString()} sqft</span>
            </>
          )}
          {listing.noFee && (
            <>
              <span className="text-white/30">|</span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                No Fee
              </span>
            </>
          )}
          {listing.availableDate && (
            <>
              <span className="text-white/30">|</span>
              <span>
                {listing.availableDate <= new Date()
                  ? "Available Now"
                  : `Available ${format(listing.availableDate, "MMM d, yyyy")}`}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {listing.floorPlans.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveModal("floorplan")}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300 transition-colors hover:bg-white/20 hover:text-white cursor-pointer"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              Floor Plan
            </button>
          )}
          {listing.latitude != null && listing.longitude != null && (
            <button
              type="button"
              onClick={() => setActiveModal("map")}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300 transition-colors hover:bg-white/20 hover:text-white cursor-pointer"
            >
              <MapPin className="h-3.5 w-3.5" />
              Map
            </button>
          )}
          {buildingInfo && listing.latitude != null && listing.longitude != null && (
            <button
              type="button"
              onClick={() => setActiveModal("3d")}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300 transition-colors hover:bg-white/20 hover:text-white cursor-pointer"
            >
              <Box className="h-3.5 w-3.5" />
              3D View
            </button>
          )}
        </div>
      </div>

      <hr className="my-6 border-white/10" />

      <p className="whitespace-pre-line text-gray-300 leading-relaxed">
        {listing.description}
      </p>

      {(listing.estimatedUtilities || listing.petPolicy || listing.parking) && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Details</h2>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            {listing.estimatedUtilities && (
              <div>
                <dt className="text-gray-500">Estimated Utilities</dt>
                <dd className="text-gray-300">{listing.estimatedUtilities}</dd>
              </div>
            )}
            {listing.petPolicy && (
              <div>
                <dt className="text-gray-500">Pet Policy</dt>
                <dd className="text-gray-300">
                  {listing.petPolicy === "NO_PETS"
                    ? "No Pets"
                    : listing.petPolicy === "CATS_ONLY"
                      ? "Cats Only"
                      : listing.petPolicy === "DOGS_ONLY"
                        ? "Dogs Only"
                        : listing.petPolicy === "CATS_AND_DOGS"
                          ? "Cats & Dogs Allowed"
                          : listing.petPolicy}
                  {listing.petPolicyDetails && (
                    <span className="ml-1 text-gray-500">
                      — {listing.petPolicyDetails}
                    </span>
                  )}
                </dd>
              </div>
            )}
            {listing.parking && (
              <div>
                <dt className="text-gray-500">Parking</dt>
                <dd className="text-gray-300">{listing.parking}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {listing.amenities.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Amenities</h2>
          <div className="space-y-4">
            {groupAmenitiesByCategory(listing.amenities).map((group) => (
              <div key={group.category}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {group.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map(({ raw, label, icon: Icon }) => (
                    <span
                      key={raw}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-gray-300"
                    >
                      <Icon className="h-3.5 w-3.5 text-gray-400" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {buildingInfo &&
        (buildingInfo.yearBuilt ||
          buildingInfo.numFloors ||
          buildingInfo.totalUnits) && (
          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Building Details</h2>
            <div className="flex flex-wrap gap-6 text-gray-300">
              {buildingInfo.yearBuilt && (
                <span className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Built in {buildingInfo.yearBuilt}
                </span>
              )}
              {buildingInfo.numFloors && (
                <span className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {buildingInfo.numFloors} Floors
                </span>
              )}
              {buildingInfo.totalUnits && (
                <span className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  {buildingInfo.totalUnits} Units
                </span>
              )}
            </div>
          </div>
        )}

      {listing.sourceUrl && (
        <div className="mt-8">
          <a
            href={listing.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View Original Listing <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Unified Modal */}
      {activeModal !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-3 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="flex h-full w-full flex-col overflow-hidden rounded-xl bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with tabs and close */}
            <div className="relative flex h-12 shrink-0 items-center justify-center border-b border-white/10 px-12">
              <div className="flex gap-1">
                {listing.floorPlans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveModal("floorplan")}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
                      activeModal === "floorplan"
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    <Grid3X3 className="h-3.5 w-3.5" />
                    Floor Plan
                  </button>
                )}
                {listing.latitude != null && listing.longitude != null && (
                  <button
                    type="button"
                    onClick={() => setActiveModal("map")}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
                      activeModal === "map"
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Map
                  </button>
                )}
                {buildingInfo && listing.latitude != null && listing.longitude != null && (
                  <button
                    type="button"
                    onClick={() => setActiveModal("3d")}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm transition-colors ${
                      activeModal === "3d"
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    <Box className="h-3.5 w-3.5" />
                    3D View
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="absolute right-4 rounded-full bg-white/10 p-1.5 text-white transition-colors hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {/* Floor Plan */}
              {activeModal === "floorplan" && (
                <div className="h-full overflow-y-auto">
                  <div className="mx-auto max-w-3xl space-y-4 p-4">
                    {listing.floorPlans.map((fp) => (
                      <Image
                        key={fp.url}
                        src={fp.url}
                        alt={fp.alt ?? "Floor plan"}
                        width={800}
                        height={600}
                        className="w-full rounded-lg"
                        unoptimized
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Map */}
              {activeModal === "map" && (
                <div className="flex h-full flex-col">
                  <div
                    ref={mapRef}
                    className="flex-1 min-h-0"
                  />

                  {/* Directions panel */}
                  <div className="shrink-0 border-t border-white/10 p-4">
                    {/* Direction type toggle */}
                    <div className="flex gap-2 text-sm">
                      <button
                        type="button"
                        onClick={() => setDirectionType("to")}
                        className={`rounded px-3 py-1.5 transition-colors ${
                          directionType === "to"
                            ? "bg-white text-black"
                            : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        Directions to
                      </button>
                      <button
                        type="button"
                        onClick={() => setDirectionType("from")}
                        className={`rounded px-3 py-1.5 transition-colors ${
                          directionType === "from"
                            ? "bg-white text-black"
                            : "bg-white/10 text-white/60 hover:bg-white/20"
                        }`}
                      >
                        Directions from
                      </button>
                    </div>

                    {/* Address input with autocomplete */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        calculateDirections();
                        setShowSuggestions(false);
                      }}
                      className="relative mt-3 flex gap-2"
                    >
                      <div className="relative flex-1" ref={autocompleteContainerRef}>
                        <input
                          type="text"
                          value={directionsInput}
                          onChange={(e) => handleInputChange(e.target.value)}
                          onFocus={() => {
                            if (suggestions.length > 0) {
                              updateAutocompletePos();
                              setShowSuggestions(true);
                            }
                          }}
                          onBlur={() =>
                            setTimeout(() => setShowSuggestions(false), 200)
                          }
                          placeholder={
                            directionType === "to"
                              ? "Enter starting address..."
                              : "Enter destination address..."
                          }
                          className="w-full rounded bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 outline-none ring-1 ring-white/10 focus:ring-white/30"
                        />
                        {showSuggestions && suggestions.length > 0 && autocompletePos && (
                          <div
                            className="fixed z-[60] max-h-48 overflow-y-auto rounded bg-zinc-800 shadow-lg ring-1 ring-white/10"
                            style={{
                              bottom: `${window.innerHeight - autocompletePos.top + 4}px`,
                              left: `${autocompletePos.left}px`,
                              width: `${autocompletePos.width}px`,
                            }}
                          >
                            {suggestions.map((s, i) => (
                              <button
                                key={i}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSuggestionSelect(s.text)}
                                className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-white/10"
                              >
                                <span className="text-white">{s.mainText}</span>
                                {s.secondaryText && (
                                  <span className="ml-1.5 text-white/40">
                                    {s.secondaryText}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="submit"
                        disabled={directionsLoading || !directionsInput.trim()}
                        className="rounded bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-40"
                      >
                        {directionsLoading ? "..." : "Go"}
                      </button>
                    </form>

                    {/* Travel mode selector */}
                    <div className="mt-3 flex gap-1">
                      {(
                        [
                          { mode: "DRIVE", icon: Car, label: "Drive" },
                          { mode: "TRANSIT", icon: TrainFront, label: "Transit" },
                          { mode: "WALK", icon: Footprints, label: "Walk" },
                          { mode: "BICYCLE", icon: Bike, label: "Bike" },
                        ] as const
                      ).map(({ mode, icon: Icon, label }) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setTravelMode(mode);
                            if (
                              routePolylinesRef.current.length > 0 &&
                              directionsInput.trim()
                            ) {
                              calculateDirections(mode);
                            }
                          }}
                          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs transition-colors ${
                            travelMode === mode
                              ? "bg-white text-black"
                              : "bg-white/10 text-white/60 hover:bg-white/20"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Results */}
                    {directionsResult && (
                      <div className="mt-3">
                        {travelMode === "TRANSIT" && allRoutes.length > 1 ? (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {allRoutes.map((route, idx) => {
                              const dur = formatDuration(
                                parseInt(
                                  route.duration?.replace("s", "") || "0"
                                )
                              );
                              const steps = mergeTransitSteps(
                                route.legs?.[0]?.steps || []
                              );
                              const isSelected = idx === selectedRouteIndex;
                              return (
                                <div
                                  key={idx}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => selectRoute(idx)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") selectRoute(idx);
                                  }}
                                  className={`cursor-pointer rounded-lg p-2.5 transition-colors ${
                                    isSelected
                                      ? "bg-white/15 ring-1 ring-white/30"
                                      : "bg-white/5 hover:bg-white/10"
                                  }`}
                                >
                                  <span className="text-sm font-medium text-white">
                                    {dur}
                                  </span>
                                  {steps.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                      {steps.map(
                                        (step: RouteStep, i: number) => {
                                          const transit =
                                            step.transitDetails;
                                          const dur2 =
                                            step.localizedValues
                                              ?.staticDuration?.text;

                                          if (
                                            step.travelMode === "TRANSIT" &&
                                            transit
                                          ) {
                                            const shortName = (
                                              transit.transitLine
                                                ?.nameShort ||
                                              transit.transitLine?.name ||
                                              ""
                                            ).replace(/\s*Line$/i, "");
                                            const color =
                                              transit.transitLine?.color ||
                                              "#888";
                                            const textColor =
                                              transit.transitLine
                                                ?.textColor || "#fff";
                                            const stopCount =
                                              transit.stopCount || 0;
                                            return (
                                              <div
                                                key={i}
                                                className="flex items-center gap-1.5"
                                              >
                                                {i > 0 && (
                                                  <span className="text-xs text-white/30">
                                                    →
                                                  </span>
                                                )}
                                                <span
                                                  className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
                                                  style={{
                                                    backgroundColor: color,
                                                    color: textColor,
                                                  }}
                                                >
                                                  {shortName}
                                                </span>
                                                {stopCount > 0 && (
                                                  <span className="text-xs text-white/40">
                                                    {stopCount} stop
                                                    {stopCount !== 1
                                                      ? "s"
                                                      : ""}
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          }

                                          if (
                                            step.travelMode === "WALK" &&
                                            dur2
                                          ) {
                                            return (
                                              <div
                                                key={i}
                                                className="flex items-center gap-1"
                                              >
                                                {i > 0 && (
                                                  <span className="text-xs text-white/30">
                                                    →
                                                  </span>
                                                )}
                                                <Footprints className="h-3 w-3 text-white/40" />
                                                <span className="text-xs text-white/50">
                                                  {dur2}
                                                </span>
                                              </div>
                                            );
                                          }

                                          return null;
                                        }
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium text-white">
                                {directionsResult.distance}
                              </span>
                              <span className="text-white/60">
                                {directionsResult.duration}
                              </span>
                            </div>

                            {travelMode === "TRANSIT" &&
                              directionsResult.steps.length > 0 && (
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  {mergeTransitSteps(
                                    directionsResult.steps
                                  ).map(
                                    (step: RouteStep, i: number) => {
                                      const transit = step.transitDetails;
                                      const dur =
                                        step.localizedValues?.staticDuration
                                          ?.text;

                                      if (
                                        step.travelMode === "TRANSIT" &&
                                        transit
                                      ) {
                                        const shortName = (
                                          transit.transitLine?.nameShort ||
                                          transit.transitLine?.name ||
                                          ""
                                        ).replace(/\s*Line$/i, "");
                                        const color =
                                          transit.transitLine?.color ||
                                          "#888";
                                        const textColor =
                                          transit.transitLine?.textColor ||
                                          "#fff";
                                        const stopCount =
                                          transit.stopCount || 0;
                                        return (
                                          <div
                                            key={i}
                                            className="flex items-center gap-1.5"
                                          >
                                            {i > 0 && (
                                              <span className="text-xs text-white/30">
                                                →
                                              </span>
                                            )}
                                            <span
                                              className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none"
                                              style={{
                                                backgroundColor: color,
                                                color: textColor,
                                              }}
                                            >
                                              {shortName}
                                            </span>
                                            {stopCount > 0 && (
                                              <span className="text-xs text-white/40">
                                                {stopCount} stop
                                                {stopCount !== 1
                                                  ? "s"
                                                  : ""}
                                              </span>
                                            )}
                                          </div>
                                        );
                                      }

                                      if (
                                        step.travelMode === "WALK" &&
                                        dur
                                      ) {
                                        return (
                                          <div
                                            key={i}
                                            className="flex items-center gap-1"
                                          >
                                            {i > 0 && (
                                              <span className="text-xs text-white/30">
                                                →
                                              </span>
                                            )}
                                            <Footprints className="h-3 w-3 text-white/40" />
                                            <span className="text-xs text-white/50">
                                              {dur}
                                            </span>
                                          </div>
                                        );
                                      }

                                      return null;
                                    }
                                  )}
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}

                    {directionsError && (
                      <p className="mt-3 text-sm text-red-400">{directionsError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 3D View */}
              {activeModal === "3d" && listing.latitude != null && listing.longitude != null && (
                <div className="h-full">
                  <BuildingViewer
                    latitude={listing.latitude}
                    longitude={listing.longitude}
                    address={listing.address}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
