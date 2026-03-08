"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import {
  TrainFront,
  Bus,
  ShoppingCart,
  UtensilsCrossed,
  Wine,
  Trees,
  GraduationCap,
  Heart,
  ShoppingBag,
  CircleParking,
  Dumbbell,
  Pill,
  Landmark,
  Star,
  MapPin,
  Loader2,
} from "lucide-react";
import type {
  NearbyStation,
  TransitSystem,
  NearbyBusStop,
} from "@/lib/transit";
import {
  SUBWAY_LINE_COLORS,
  DARK_TEXT_LINES,
  SYSTEM_COLORS,
  SYSTEM_LABELS,
} from "@/lib/transit";
import {
  PLACE_CATEGORIES,
  PLACE_CATEGORY_KEYS,
  type PlaceCategory,
  type NearbyPlace,
} from "@/lib/places";
import {
  getApproximateLocation,
  APPROXIMATE_CIRCLE_RADIUS_METERS,
} from "@/lib/location-privacy";

// ── System display order ─────────────────────────────────────────────────────

const SYSTEM_ORDER: TransitSystem[] = [
  "subway",
  "sir",
  "path",
  "metro-north",
  "lirr",
  "amtrak",
  "nj-transit",
];

// Brighter label colors for dark backgrounds
const SYSTEM_LABEL_COLORS: Record<TransitSystem, string> = {
  subway: "#4d9fff",
  sir: "#6b7fff",
  "metro-north": "#4da6ff",
  lirr: "#4d9fff",
  path: "#ff9a5c",
  amtrak: "#4da6ff",
  "nj-transit": "#6b8fff",
};

// ── Category icon mapping ────────────────────────────────────────────────────

type ActiveCategory = "transit" | "bus" | PlaceCategory;

const CATEGORY_ICONS: Record<ActiveCategory, typeof TrainFront> = {
  transit: TrainFront,
  bus: Bus,
  groceries: ShoppingCart,
  restaurants: UtensilsCrossed,
  nightlife: Wine,
  parks: Trees,
  schools: GraduationCap,
  healthcare: Heart,
  shopping: ShoppingBag,
  parking: CircleParking,
  gyms: Dumbbell,
  pharmacies: Pill,
  attractions: Landmark,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexLuminance(hex: string): number {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function createDot(
  color: string,
  size: number,
  border: number
): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `width:${size}px;height:${size}px;background:${color};border:${border}px solid rgba(255,255,255,0.85);border-radius:50%;transition:transform 0.15s,box-shadow 0.15s;`;
  return el;
}

function placePhotoUrl(photoRef: string): string {
  return `https://places.googleapis.com/v1/${photoRef}/media?maxWidthPx=400&maxHeightPx=200&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
}

function buildInfoWindowContent(place: NearbyPlace): string {
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(place.id)}`;
  const photo = place.photoRef
    ? `<img src="${esc(placePhotoUrl(place.photoRef))}" style="width:100%;height:130px;object-fit:cover;display:block;" alt="" />`
    : "";
  const rating =
    place.rating != null
      ? `<div style="display:flex;align-items:center;gap:4px;margin-top:4px;font-size:12px;color:#555;">
        <span style="color:#facc15;">&#9733;</span> ${place.rating.toFixed(1)}${place.userRatingCount != null ? ` <span style="color:#999;">(${place.userRatingCount.toLocaleString()})</span>` : ""}
      </div>`
      : "";
  const dist =
    place.distanceMi < 0.1
      ? `${Math.round(place.distanceMi * 5280)} ft`
      : `${place.distanceMi.toFixed(1)} mi`;
  return `<a href="${esc(mapsUrl)}" target="_blank" rel="noopener noreferrer" style="display:block;min-width:200px;max-width:280px;font-family:system-ui,-apple-system,sans-serif;overflow:hidden;text-decoration:none;color:inherit;cursor:pointer;">
    ${photo}
    <div style="padding:8px 10px 10px;">
      <div style="font-weight:600;font-size:13px;color:#111;">${esc(place.name)}</div>
      ${rating}
      ${place.address ? `<div style="font-size:11px;color:#666;margin-top:3px;">${esc(place.address)}</div>` : ""}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:3px;">
        <span style="font-size:11px;color:#888;">${dist} &middot; ${place.walkMinutes} min walk</span>
        <span style="font-size:11px;color:#1a73e8;">View on Maps &rarr;</span>
      </div>
    </div>
  </a>`;
}

// ── Component ────────────────────────────────────────────────────────────────

interface NearbyTransitProps {
  stations: NearbyStation[];
  listingLat: number;
  listingLng: number;
  listingId: string;
}

export function NearbyTransit({
  stations,
  listingLat,
  listingLng,
  listingId,
}: NearbyTransitProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [highlightedStation, setHighlightedStation] = useState<string | null>(
    null
  );
  const [highlightedPlace, setHighlightedPlace] = useState<string | null>(null);
  const [highlightedBus, setHighlightedBus] = useState<string | null>(null);

  // Category state
  const [activeCategory, setActiveCategory] =
    useState<ActiveCategory>("transit");
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const placesCacheRef = useRef<Map<PlaceCategory, NearbyPlace[]>>(new Map());

  // Bus state
  const [busStops, setBusStops] = useState<NearbyBusStop[]>([]);
  const [busLoading, setBusLoading] = useState(false);
  const [busError, setBusError] = useState<string | null>(null);
  const busCacheRef = useRef<NearbyBusStop[] | null>(null);

  // Map layer/marker refs
  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);
  const stationMarkersRef = useRef<
    Map<
      string,
      {
        dots: HTMLDivElement[];
        markers: google.maps.marker.AdvancedMarkerElement[];
      }
    >
  >(new Map());
  const placeMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>(
    []
  );
  const busMarkersRef = useRef<
    Map<
      string,
      { dot: HTMLDivElement; marker: google.maps.marker.AdvancedMarkerElement }
    >
  >(new Map());
  const advancedMarkerClassRef = useRef<
    typeof google.maps.marker.AdvancedMarkerElement | null
  >(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const iwCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iwActiveDotRef = useRef<HTMLDivElement | null>(null);

  // Lazy-load map when section scrolls into view
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const initMap = useCallback(async () => {
    if (mapRef.current || !mapContainerRef.current) return;

    setOptions({
      key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      v: "weekly",
    });

    await importLibrary("maps");
    const { AdvancedMarkerElement } = (await importLibrary(
      "marker"
    )) as typeof google.maps.marker;
    advancedMarkerClassRef.current = AdvancedMarkerElement;

    const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

    const approxLocation = getApproximateLocation(
      listingLat,
      listingLng,
      listingId
    );

    const map = new google.maps.Map(mapContainerRef.current!, {
      center: approxLocation,
      zoom: 1,
      ...(mapId ? { mapId } : {}),
      colorScheme: google.maps.ColorScheme.DARK,
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: "cooperative",
    });
    mapRef.current = map;

    // Transit layer overlay
    const transitLayer = new google.maps.TransitLayer();
    transitLayer.setMap(map);
    transitLayerRef.current = transitLayer;

    // Reusable InfoWindow for place marker hovers
    const iw = new google.maps.InfoWindow({ disableAutoPan: true });
    infoWindowRef.current = iw;

    // Keep InfoWindow open when hovering over the popup bubble
    iw.addListener("domready", () => {
      const container = document.querySelector(
        ".gm-style-iw-a"
      ) as HTMLElement | null;
      if (container && !container.dataset.hoverBound) {
        container.dataset.hoverBound = "1";
        container.addEventListener("mouseenter", () => {
          if (iwCloseTimerRef.current) {
            clearTimeout(iwCloseTimerRef.current);
            iwCloseTimerRef.current = null;
          }
        });
        container.addEventListener("mouseleave", () => {
          iwCloseTimerRef.current = setTimeout(() => {
            iw.close();
            const dot = iwActiveDotRef.current;
            if (dot) {
              dot.style.transform = "scale(1)";
              dot.style.boxShadow = "none";
              dot.style.zIndex = "0";
              iwActiveDotRef.current = null;
            }
          }, 250);
        });
      }
    });

    // Clean up dot highlight when user clicks the X button
    iw.addListener("closeclick", () => {
      const dot = iwActiveDotRef.current;
      if (dot) {
        dot.style.transform = "scale(1)";
        dot.style.boxShadow = "none";
        dot.style.zIndex = "0";
        iwActiveDotRef.current = null;
      }
    });

    // Approximate-area circle instead of exact listing pin
    new google.maps.Circle({
      map,
      center: approxLocation,
      radius: APPROXIMATE_CIRCLE_RADIUS_METERS,
      fillColor: "#3b82f6",
      fillOpacity: 0.15,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.5,
      strokeWeight: 2,
    });

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(approxLocation);

    // Station entrance markers — small colored dots by system
    const markerMap = new Map<
      string,
      {
        dots: HTMLDivElement[];
        markers: google.maps.marker.AdvancedMarkerElement[];
      }
    >();

    for (const station of stations) {
      const color = SYSTEM_COLORS[station.system];
      const entrancePoints = station.entrances?.length
        ? station.entrances
        : [{ lat: station.lat, lng: station.lng }];
      const dots: HTMLDivElement[] = [];
      const markers: google.maps.marker.AdvancedMarkerElement[] = [];

      bounds.extend({ lat: station.lat, lng: station.lng });

      for (const entrance of entrancePoints) {
        const dot = createDot(color, 10, 1.5);
        dot.title = `${station.name} — ${station.routes.join(", ")}`;

        const marker = new AdvancedMarkerElement({
          map,
          position: { lat: entrance.lat, lng: entrance.lng },
          content: dot,
          title: station.name,
        });
        dots.push(dot);
        markers.push(marker);
      }
      markerMap.set(station.id, { dots, markers });
    }

    if (stations.length > 0) {
      map.fitBounds(bounds, 30);
    }

    stationMarkersRef.current = markerMap;
    setMapLoaded(true);
  }, [listingLat, listingLng, listingId, stations]);

  useEffect(() => {
    if (mapVisible) initMap();
  }, [mapVisible, initMap]);

  // Highlight / unhighlight entrance markers when hoveredStation changes
  useEffect(() => {
    const markerMap = stationMarkersRef.current;
    for (const [stationId, { dots }] of markerMap) {
      const active = stationId === highlightedStation;
      for (const dot of dots) {
        dot.style.transform = active ? "scale(2.2)" : "scale(1)";
        dot.style.boxShadow = active ? "0 0 8px rgba(255,255,255,0.7)" : "none";
        dot.style.zIndex = active ? "10" : "0";
      }
    }
  }, [highlightedStation]);

  // Highlight place markers
  useEffect(() => {
    for (const marker of placeMarkersRef.current) {
      const el = marker.content as HTMLDivElement | null;
      if (!el) continue;
      const active = el.dataset.placeId === highlightedPlace;
      el.style.transform = active ? "scale(2.2)" : "scale(1)";
      el.style.boxShadow = active ? "0 0 8px rgba(255,255,255,0.7)" : "none";
      el.style.zIndex = active ? "10" : "0";
    }
  }, [highlightedPlace]);

  // Highlight bus markers
  useEffect(() => {
    for (const [stopId, { dot }] of busMarkersRef.current) {
      const active = stopId === highlightedBus;
      dot.style.transform = active ? "scale(2.2)" : "scale(1)";
      dot.style.boxShadow = active ? "0 0 8px rgba(255,255,255,0.7)" : "none";
      dot.style.zIndex = active ? "10" : "0";
    }
  }, [highlightedBus]);

  // ── Category switching ───────────────────────────────────────────────────

  const clearPlaceMarkers = useCallback(() => {
    if (iwCloseTimerRef.current) {
      clearTimeout(iwCloseTimerRef.current);
      iwCloseTimerRef.current = null;
    }
    iwActiveDotRef.current = null;
    infoWindowRef.current?.close();
    for (const marker of placeMarkersRef.current) {
      marker.map = null;
    }
    placeMarkersRef.current = [];
  }, []);

  const clearBusMarkers = useCallback(() => {
    for (const [, { marker }] of busMarkersRef.current) {
      marker.map = null;
    }
    busMarkersRef.current = new Map();
  }, []);

  const showBusMarkers = useCallback(
    (stopsData: NearbyBusStop[]) => {
      const map = mapRef.current;
      const AME = advancedMarkerClassRef.current;
      if (!map || !AME) return;

      clearBusMarkers();

      const approxLocation = getApproximateLocation(
        listingLat,
        listingLng,
        listingId
      );
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(approxLocation);

      const newMarkers = new Map<
        string,
        {
          dot: HTMLDivElement;
          marker: google.maps.marker.AdvancedMarkerElement;
        }
      >();
      for (const stop of stopsData) {
        const dot = createDot("#1976D2", 10, 1.5);
        dot.title = `${stop.name} — ${stop.routes.map((r) => r.name).join(", ")}`;

        const marker = new AME({
          map,
          position: { lat: stop.lat, lng: stop.lng },
          content: dot,
          title: stop.name,
        });
        newMarkers.set(stop.id, { dot, marker });
        bounds.extend({ lat: stop.lat, lng: stop.lng });
      }

      busMarkersRef.current = newMarkers;
      if (stopsData.length > 0) {
        map.fitBounds(bounds, 30);
      }
    },
    [clearBusMarkers, listingLat, listingLng, listingId]
  );

  const showStationMarkers = useCallback((visible: boolean) => {
    const map = visible ? mapRef.current : null;
    for (const [, { markers }] of stationMarkersRef.current) {
      for (const marker of markers) {
        marker.map = map;
      }
    }
  }, []);

  const showPlaceMarkers = useCallback(
    (placesData: NearbyPlace[], color: string) => {
      const map = mapRef.current;
      const AME = advancedMarkerClassRef.current;
      const iw = infoWindowRef.current;
      if (!map || !AME) return;

      clearPlaceMarkers();

      const approxLocation = getApproximateLocation(
        listingLat,
        listingLng,
        listingId
      );
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(approxLocation);

      const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
      for (const place of placesData) {
        const dot = createDot(color, 10, 1.5);
        dot.title = place.name;
        dot.dataset.placeId = place.id;

        const marker = new AME({
          map,
          position: { lat: place.lat, lng: place.lng },
          content: dot,
          title: place.name,
        });

        // Show InfoWindow card on marker hover — delayed close so user can interact with popup
        if (iw) {
          marker.element.addEventListener("mouseenter", () => {
            // Cancel any pending close
            if (iwCloseTimerRef.current) {
              clearTimeout(iwCloseTimerRef.current);
              iwCloseTimerRef.current = null;
            }
            // Unhighlight previous dot
            const prev = iwActiveDotRef.current;
            if (prev && prev !== dot) {
              prev.style.transform = "scale(1)";
              prev.style.boxShadow = "none";
              prev.style.zIndex = "0";
            }
            iwActiveDotRef.current = dot;
            iw.setContent(buildInfoWindowContent(place));
            iw.open({ map, anchor: marker });
            dot.style.transform = "scale(2.2)";
            dot.style.boxShadow = "0 0 8px rgba(255,255,255,0.7)";
            dot.style.zIndex = "10";
          });
          marker.element.addEventListener("mouseleave", () => {
            iwCloseTimerRef.current = setTimeout(() => {
              iw.close();
              dot.style.transform = "scale(1)";
              dot.style.boxShadow = "none";
              dot.style.zIndex = "0";
              iwActiveDotRef.current = null;
            }, 300);
          });
        }

        newMarkers.push(marker);
        bounds.extend({ lat: place.lat, lng: place.lng });
      }

      placeMarkersRef.current = newMarkers;
      if (placesData.length > 0) {
        map.fitBounds(bounds, 30);
      }
    },
    [clearPlaceMarkers, listingLat, listingLng, listingId]
  );

  const fitBoundsToStations = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const approxLocation = getApproximateLocation(
      listingLat,
      listingLng,
      listingId
    );
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(approxLocation);
    for (const station of stations) {
      bounds.extend({ lat: station.lat, lng: station.lng });
    }
    if (stations.length > 0) {
      map.fitBounds(bounds, 30);
    }
  }, [listingLat, listingLng, listingId, stations]);

  const handleCategoryChange = useCallback(
    async (category: ActiveCategory) => {
      if (category === activeCategory) return;
      setActiveCategory(category);
      setHighlightedStation(null);
      setHighlightedPlace(null);
      setHighlightedBus(null);

      if (category === "transit") {
        // Show transit layer + station markers, hide place/bus markers
        transitLayerRef.current?.setMap(mapRef.current);
        showStationMarkers(true);
        clearPlaceMarkers();
        clearBusMarkers();
        fitBoundsToStations();
        setPlaces([]);
        setPlacesError(null);
        setBusStops([]);
        setBusError(null);
        return;
      }

      // Hide transit layer + station markers for all non-transit categories
      transitLayerRef.current?.setMap(null);
      showStationMarkers(false);

      if (category === "bus") {
        // Hide place markers
        clearPlaceMarkers();
        setPlaces([]);
        setPlacesError(null);

        // Check client cache
        if (busCacheRef.current) {
          setBusStops(busCacheRef.current);
          setBusError(null);
          showBusMarkers(busCacheRef.current);
          return;
        }

        // Fetch from API
        setBusLoading(true);
        setBusError(null);
        setBusStops([]);
        clearBusMarkers();

        try {
          const res = await fetch(
            `/api/nearby-buses?lat=${listingLat}&lng=${listingLng}`
          );
          if (!res.ok) throw new Error("Failed to fetch bus stops");
          const data = await res.json();
          const fetched: NearbyBusStop[] = data.stops ?? [];
          busCacheRef.current = fetched;
          setBusStops(fetched);
          showBusMarkers(fetched);
        } catch {
          setBusError("Could not load bus stops. Please try again.");
        } finally {
          setBusLoading(false);
        }
        return;
      }

      // Place categories — hide bus markers
      clearBusMarkers();
      setBusStops([]);
      setBusError(null);

      // Check client cache
      const cached = placesCacheRef.current.get(category as PlaceCategory);
      if (cached) {
        setPlaces(cached);
        setPlacesError(null);
        showPlaceMarkers(
          cached,
          PLACE_CATEGORIES[category as PlaceCategory].color
        );
        return;
      }

      // Fetch from API
      setPlacesLoading(true);
      setPlacesError(null);
      setPlaces([]);
      clearPlaceMarkers();

      try {
        const res = await fetch(
          `/api/nearby-places?lat=${listingLat}&lng=${listingLng}&category=${category}`
        );
        if (!res.ok) throw new Error("Failed to fetch places");
        const data = await res.json();
        const fetched: NearbyPlace[] = data.places ?? [];
        placesCacheRef.current.set(category as PlaceCategory, fetched);
        setPlaces(fetched);
        showPlaceMarkers(
          fetched,
          PLACE_CATEGORIES[category as PlaceCategory].color
        );
      } catch {
        setPlacesError("Could not load places. Please try again.");
      } finally {
        setPlacesLoading(false);
      }
    },
    [
      activeCategory,
      clearPlaceMarkers,
      clearBusMarkers,
      showStationMarkers,
      showPlaceMarkers,
      showBusMarkers,
      fitBoundsToStations,
      listingLat,
      listingLng,
    ]
  );

  // Group stations by system
  const grouped = new Map<TransitSystem, NearbyStation[]>();
  for (const s of stations) {
    if (!grouped.has(s.system)) grouped.set(s.system, []);
    grouped.get(s.system)!.push(s);
  }

  const sectionTitle =
    activeCategory === "transit"
      ? "Nearby Transit"
      : activeCategory === "bus"
        ? "Nearby Buses"
        : `Nearby ${PLACE_CATEGORIES[activeCategory as PlaceCategory].label}`;

  const SectionIcon = CATEGORY_ICONS[activeCategory];

  return (
    <div ref={sectionRef} className="mt-8">
      <h2 className="mb-4 text-lg font-semibold flex items-center gap-2">
        <SectionIcon className="h-5 w-5" />
        {sectionTitle}
      </h2>

      {/* Map + scrollable list — stacked on mobile, side-by-side on lg */}
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:h-[clamp(520px,55vh,700px)]">
        {/* Map with category overlay — spans 2 columns on lg */}
        <div
          className="relative h-[300px] lg:col-span-2 lg:h-auto min-w-0"
          style={{ overflow: "visible" }}
        >
          {/* Map container — overflow hidden only here so the map tiles are clipped but InfoWindow is not */}
          <div
            className="absolute inset-0 rounded-xl bg-white/5"
            style={{ overflow: "visible" }}
          >
            <div
              ref={mapContainerRef}
              className="absolute inset-0 rounded-xl"
              style={{ overflow: "hidden", clipPath: "inset(0 round 0.75rem)" }}
            />
            {!mapLoaded && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 pointer-events-none">
                Loading map…
              </div>
            )}
          </div>

          {/* Category selector — horizontal top on mobile, vertical right on lg */}
          {mapLoaded && (
            <div className="absolute left-0 right-0 top-3 z-10 flex flex-row gap-1.5 overflow-x-auto px-3 pointer-events-auto lg:left-auto lg:right-3 lg:top-1/2 lg:-translate-y-1/2 lg:flex-col lg:overflow-x-visible lg:px-0">
              <CategoryButton
                category="transit"
                active={activeCategory === "transit"}
                color="#3b82f6"
                label="Transit"
                Icon={TrainFront}
                onClick={() => handleCategoryChange("transit")}
              />
              <CategoryButton
                category="bus"
                active={activeCategory === "bus"}
                color="#1976D2"
                label="Buses"
                Icon={Bus}
                onClick={() => handleCategoryChange("bus")}
              />
              {PLACE_CATEGORY_KEYS.map((cat) => (
                <CategoryButton
                  key={cat}
                  category={cat}
                  active={activeCategory === cat}
                  color={PLACE_CATEGORIES[cat].color}
                  label={PLACE_CATEGORIES[cat].label}
                  Icon={CATEGORY_ICONS[cat]}
                  onClick={() => handleCategoryChange(cat)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Scrollable list — natural height on mobile, scrollable on lg */}
        <div className="rounded-xl bg-white/5 p-2 space-y-2 lg:overflow-y-auto">
          {activeCategory === "transit" ? (
            <div className="space-y-4">
              {SYSTEM_ORDER.filter((sys) => grouped.has(sys)).map((sys) => (
                <div key={sys}>
                  <h3
                    className="mb-2 px-1 text-sm font-semibold uppercase tracking-wider"
                    style={{ color: SYSTEM_LABEL_COLORS[sys] }}
                  >
                    {SYSTEM_LABELS[sys]}
                  </h3>
                  <div className="space-y-1.5">
                    {grouped.get(sys)!.map((station) => (
                      <StationRow
                        key={station.id}
                        station={station}
                        highlighted={highlightedStation === station.id}
                        onHover={setHighlightedStation}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : activeCategory === "bus" ? (
            <>
              {busLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading bus stops…
                </div>
              )}
              {busError && (
                <div className="py-8 text-center text-sm text-red-400">
                  {busError}
                </div>
              )}
              {!busLoading && !busError && busStops.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No bus stops found nearby.
                </div>
              )}
              {busStops.map((stop) => (
                <BusStopRow
                  key={stop.id}
                  stop={stop}
                  highlighted={highlightedBus === stop.id}
                  onHover={setHighlightedBus}
                />
              ))}
            </>
          ) : (
            <>
              {placesLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading{" "}
                  {PLACE_CATEGORIES[
                    activeCategory as PlaceCategory
                  ].label.toLowerCase()}
                  …
                </div>
              )}
              {placesError && (
                <div className="py-8 text-center text-sm text-red-400">
                  {placesError}
                </div>
              )}
              {!placesLoading && !placesError && places.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No{" "}
                  {PLACE_CATEGORIES[
                    activeCategory as PlaceCategory
                  ].label.toLowerCase()}{" "}
                  found nearby.
                </div>
              )}
              {places.map((place) => (
                <PlaceRow
                  key={place.id}
                  place={place}
                  highlighted={highlightedPlace === place.id}
                  onHover={setHighlightedPlace}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Category Button ──────────────────────────────────────────────────────────

function CategoryButton({
  active,
  color,
  label,
  Icon,
  onClick,
}: {
  category: ActiveCategory;
  active: boolean;
  color: string;
  label: string;
  Icon: typeof TrainFront;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
        active
          ? "ring-1 ring-white/30 shadow-lg"
          : "bg-black/60 text-white/60 hover:bg-black/80 hover:text-white/90"
      }`}
      style={active ? { backgroundColor: color, color: "#fff" } : undefined}
    >
      <Icon className="h-4 w-4" />
      {/* Instant tooltip — appears left of button on hover */}
      <span className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center whitespace-nowrap rounded-md bg-gray-900/95 px-2.5 py-1 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 lg:top-1/2 lg:mt-0 lg:left-auto lg:translate-x-0 lg:right-full lg:mr-2 lg:-translate-y-1/2">
        {label}
      </span>
    </button>
  );
}

// ── Place Row ────────────────────────────────────────────────────────────────

function PlaceRow({
  place,
  highlighted,
  onHover,
}: {
  place: NearbyPlace;
  highlighted: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
        highlighted
          ? "bg-white/15 ring-1 ring-white/20"
          : "bg-white/5 hover:bg-white/10"
      }`}
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onHover(highlighted ? null : place.id)}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-200 truncate">
          {place.name}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
          <span className="flex items-center gap-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {place.address}
          </span>
        </div>
        {place.rating != null && (
          <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span>{place.rating.toFixed(1)}</span>
            {place.userRatingCount != null && (
              <span className="text-gray-500">
                ({place.userRatingCount.toLocaleString()})
              </span>
            )}
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm text-gray-400">
          {place.distanceMi < 0.1
            ? `${Math.round(place.distanceMi * 5280)} ft`
            : `${place.distanceMi.toFixed(1)} mi`}
        </div>
        <div className="text-xs text-gray-500">
          {place.walkMinutes} min walk
        </div>
      </div>
    </div>
  );
}

// ── Bus Stop Row ─────────────────────────────────────────────────────────

function BusStopRow({
  stop,
  highlighted,
  onHover,
}: {
  stop: NearbyBusStop;
  highlighted: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
        highlighted
          ? "bg-white/15 ring-1 ring-white/20"
          : "bg-white/5 hover:bg-white/10"
      }`}
      onMouseEnter={() => onHover(stop.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onHover(highlighted ? null : stop.id)}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-200 truncate">
          {stop.name}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {stop.routes.map((route) => {
            const lum = hexLuminance(route.color);
            return (
              <span
                key={route.name}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none"
                style={{
                  backgroundColor: route.color,
                  color: lum > 0.4 ? "#000" : "#fff",
                }}
              >
                {route.name}
              </span>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm text-gray-400">
          {stop.distanceMi < 0.1
            ? `${Math.round(stop.distanceMi * 5280)} ft`
            : `${stop.distanceMi.toFixed(1)} mi`}
        </div>
        <div className="text-xs text-gray-500">{stop.walkMinutes} min walk</div>
      </div>
    </div>
  );
}

// ── Station Row ──────────────────────────────────────────────────────────────

function StationRow({
  station,
  highlighted,
  onHover,
}: {
  station: NearbyStation;
  highlighted: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
        highlighted
          ? "bg-white/15 ring-1 ring-white/20"
          : "bg-white/5 hover:bg-white/10"
      }`}
      onMouseEnter={() => onHover(station.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onHover(highlighted ? null : station.id)}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-200 truncate">
          {station.name}
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {station.routes.map((route) => (
            <RouteBadge key={route} route={route} system={station.system} />
          ))}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm text-gray-400">
          {station.distanceMi < 0.1
            ? `${Math.round(station.distanceMi * 5280)} ft`
            : `${station.distanceMi.toFixed(1)} mi`}
        </div>
        <div className="text-xs text-gray-500">
          {station.walkMinutes} min walk
        </div>
      </div>
    </div>
  );
}

// ── Route Badge ──────────────────────────────────────────────────────────────

function RouteBadge({
  route,
  system,
}: {
  route: string;
  system: TransitSystem;
}) {
  if (system === "subway" || system === "sir") {
    const bg = SUBWAY_LINE_COLORS[route] ?? "#808183";
    const isDark = DARK_TEXT_LINES.has(route);
    return (
      <span
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold leading-none"
        style={{
          backgroundColor: bg,
          color: isDark ? "#000" : "#fff",
        }}
      >
        {route}
      </span>
    );
  }

  const bg = SYSTEM_COLORS[system];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none text-white"
      style={{ backgroundColor: bg }}
    >
      {route}
    </span>
  );
}
