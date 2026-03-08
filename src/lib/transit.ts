import { unstable_cache } from "next/cache";

// ── Types ────────────────────────────────────────────────────────────────────

export type TransitSystem =
  | "subway"
  | "metro-north"
  | "lirr"
  | "sir"
  | "path"
  | "amtrak"
  | "nj-transit";

export interface TransitStation {
  id: string;
  name: string;
  system: TransitSystem;
  routes: string[];
  lat: number;
  lng: number;
  entrances?: { lat: number; lng: number; type?: string }[];
}

export interface NearbyStation extends TransitStation {
  distanceMi: number;
  walkMinutes: number;
}

// ── Subway Line Colors (official MTA) ────────────────────────────────────────

export const SUBWAY_LINE_COLORS: Record<string, string> = {
  A: "#0039A6",
  C: "#0039A6",
  E: "#0039A6",
  "1": "#EE352E",
  "2": "#EE352E",
  "3": "#EE352E",
  "4": "#00933C",
  "5": "#00933C",
  "6": "#00933C",
  "7": "#B933AD",
  B: "#FF6319",
  D: "#FF6319",
  F: "#FF6319",
  M: "#FF6319",
  N: "#FCCC0A",
  Q: "#FCCC0A",
  R: "#FCCC0A",
  W: "#FCCC0A",
  G: "#6CBE45",
  J: "#996633",
  Z: "#996633",
  L: "#A7A9AC",
  S: "#808183",
  SIR: "#1D2EA4",
};

/** Lines that need dark text on their colored badge */
export const DARK_TEXT_LINES = new Set(["N", "Q", "R", "W"]);

export const SYSTEM_COLORS: Record<TransitSystem, string> = {
  subway: "#0039A6",
  sir: "#1D2EA4",
  "metro-north": "#006EC7",
  lirr: "#0F61A9",
  path: "#E66921",
  amtrak: "#004B87",
  "nj-transit": "#003DA5",
};

export const SYSTEM_LABELS: Record<TransitSystem, string> = {
  subway: "Subway",
  sir: "Staten Island Railway",
  "metro-north": "Metro-North",
  lirr: "LIRR",
  path: "PATH",
  amtrak: "Amtrak",
  "nj-transit": "NJ Transit",
};

// ── Hardcoded Commuter Rail Stations (NYC metro area only) ───────────────────

const COMMUTER_STATIONS: TransitStation[] = [
  // PATH (13 stations)
  {
    id: "path-wtc",
    name: "World Trade Center",
    system: "path",
    routes: ["Newark–WTC", "Hoboken–WTC"],
    lat: 40.7115,
    lng: -74.0104,
  },
  {
    id: "path-exchange",
    name: "Exchange Place",
    system: "path",
    routes: ["Newark–WTC", "Hoboken–33rd St"],
    lat: 40.7163,
    lng: -74.0327,
  },
  {
    id: "path-grove",
    name: "Grove Street",
    system: "path",
    routes: ["Newark–WTC", "Journal Square–33rd St"],
    lat: 40.7195,
    lng: -74.0431,
  },
  {
    id: "path-jsq",
    name: "Journal Square",
    system: "path",
    routes: ["Newark–WTC", "Journal Square–33rd St"],
    lat: 40.7333,
    lng: -74.0634,
  },
  {
    id: "path-harrison",
    name: "Harrison",
    system: "path",
    routes: ["Newark–WTC"],
    lat: 40.7392,
    lng: -74.156,
  },
  {
    id: "path-newark",
    name: "Newark",
    system: "path",
    routes: ["Newark–WTC"],
    lat: 40.7345,
    lng: -74.1644,
  },
  {
    id: "path-hoboken",
    name: "Hoboken",
    system: "path",
    routes: ["Hoboken–WTC", "Hoboken–33rd St"],
    lat: 40.7355,
    lng: -74.0296,
  },
  {
    id: "path-christopher",
    name: "Christopher Street",
    system: "path",
    routes: ["Hoboken–33rd St"],
    lat: 40.7327,
    lng: -74.007,
  },
  {
    id: "path-9th",
    name: "9th Street",
    system: "path",
    routes: ["Hoboken–33rd St"],
    lat: 40.7342,
    lng: -73.999,
  },
  {
    id: "path-14th",
    name: "14th Street",
    system: "path",
    routes: ["Hoboken–33rd St"],
    lat: 40.7374,
    lng: -73.9967,
  },
  {
    id: "path-23rd",
    name: "23rd Street",
    system: "path",
    routes: ["Hoboken–33rd St"],
    lat: 40.7429,
    lng: -73.9929,
  },
  {
    id: "path-33rd",
    name: "33rd Street",
    system: "path",
    routes: ["Hoboken–33rd St", "Journal Square–33rd St"],
    lat: 40.7489,
    lng: -73.9882,
  },
  {
    id: "path-newport",
    name: "Newport",
    system: "path",
    routes: ["Hoboken–33rd St", "Journal Square–33rd St"],
    lat: 40.7269,
    lng: -74.0341,
  },

  // Metro-North (NYC-area stations — Manhattan, Bronx, lower Westchester)
  {
    id: "mn-gct",
    name: "Grand Central Terminal",
    system: "metro-north",
    routes: ["Hudson", "Harlem", "New Haven"],
    lat: 40.7527,
    lng: -73.9772,
  },
  {
    id: "mn-harlem125",
    name: "Harlem–125th Street",
    system: "metro-north",
    routes: ["Hudson", "Harlem", "New Haven"],
    lat: 40.8053,
    lng: -73.939,
  },
  {
    id: "mn-yankees",
    name: "Yankees–E 153rd St",
    system: "metro-north",
    routes: ["Hudson"],
    lat: 40.8238,
    lng: -73.928,
  },
  {
    id: "mn-morris-heights",
    name: "Morris Heights",
    system: "metro-north",
    routes: ["Hudson"],
    lat: 40.8527,
    lng: -73.9218,
  },
  {
    id: "mn-univ-heights",
    name: "University Heights",
    system: "metro-north",
    routes: ["Hudson"],
    lat: 40.8617,
    lng: -73.9133,
  },
  {
    id: "mn-marble-hill",
    name: "Marble Hill",
    system: "metro-north",
    routes: ["Hudson"],
    lat: 40.8744,
    lng: -73.9109,
  },
  {
    id: "mn-spuyten",
    name: "Spuyten Duyvil",
    system: "metro-north",
    routes: ["Hudson"],
    lat: 40.8783,
    lng: -73.9218,
  },
  {
    id: "mn-riverdale",
    name: "Riverdale",
    system: "metro-north",
    routes: ["Hudson"],
    lat: 40.9039,
    lng: -73.9138,
  },
  {
    id: "mn-ludlow",
    name: "Ludlow",
    system: "metro-north",
    routes: ["Hudson"],
    lat: 40.9085,
    lng: -73.9105,
  },
  {
    id: "mn-yonkers",
    name: "Yonkers",
    system: "metro-north",
    routes: ["Hudson"],
    lat: 40.9324,
    lng: -73.899,
  },
  {
    id: "mn-melrose",
    name: "Melrose",
    system: "metro-north",
    routes: ["Harlem"],
    lat: 40.8255,
    lng: -73.9152,
  },
  {
    id: "mn-tremont",
    name: "Tremont",
    system: "metro-north",
    routes: ["Harlem"],
    lat: 40.8493,
    lng: -73.9056,
  },
  {
    id: "mn-fordham",
    name: "Fordham",
    system: "metro-north",
    routes: ["Harlem"],
    lat: 40.8613,
    lng: -73.8902,
  },
  {
    id: "mn-botanical-garden",
    name: "Botanical Garden",
    system: "metro-north",
    routes: ["Harlem"],
    lat: 40.8674,
    lng: -73.8813,
  },
  {
    id: "mn-williams-bridge",
    name: "Williams Bridge",
    system: "metro-north",
    routes: ["Harlem"],
    lat: 40.8783,
    lng: -73.8711,
  },
  {
    id: "mn-woodlawn",
    name: "Woodlawn",
    system: "metro-north",
    routes: ["Harlem"],
    lat: 40.8951,
    lng: -73.8674,
  },
  {
    id: "mn-wakefield",
    name: "Wakefield",
    system: "metro-north",
    routes: ["Harlem"],
    lat: 40.9039,
    lng: -73.8558,
  },
  {
    id: "mn-mt-vernon-west",
    name: "Mount Vernon West",
    system: "metro-north",
    routes: ["Harlem"],
    lat: 40.913,
    lng: -73.8382,
  },
  {
    id: "mn-co-op-city",
    name: "Co-Op City",
    system: "metro-north",
    routes: ["New Haven"],
    lat: 40.8749,
    lng: -73.8273,
  },
  {
    id: "mn-westchester-sq",
    name: "Westchester Square",
    system: "metro-north",
    routes: ["New Haven"],
    lat: 40.8418,
    lng: -73.838,
  },
  {
    id: "mn-hunts-point",
    name: "Hunts Point",
    system: "metro-north",
    routes: ["New Haven"],
    lat: 40.8204,
    lng: -73.8899,
  },

  // LIRR (NYC-area stations — Penn Station, Jamaica, Atlantic Terminal, and nearby)
  {
    id: "lirr-penn",
    name: "Penn Station",
    system: "lirr",
    routes: ["All Branches"],
    lat: 40.7506,
    lng: -73.9935,
  },
  {
    id: "lirr-atlantic",
    name: "Atlantic Terminal",
    system: "lirr",
    routes: ["All Branches"],
    lat: 40.6842,
    lng: -73.9775,
  },
  {
    id: "lirr-jamaica",
    name: "Jamaica",
    system: "lirr",
    routes: ["All Branches"],
    lat: 40.7002,
    lng: -73.8081,
  },
  {
    id: "lirr-woodside",
    name: "Woodside",
    system: "lirr",
    routes: ["Port Washington", "Main Line"],
    lat: 40.7454,
    lng: -73.9029,
  },
  {
    id: "lirr-forest-hills",
    name: "Forest Hills",
    system: "lirr",
    routes: ["Main Line"],
    lat: 40.7185,
    lng: -73.844,
  },
  {
    id: "lirr-kew-gardens",
    name: "Kew Gardens",
    system: "lirr",
    routes: ["Main Line"],
    lat: 40.7097,
    lng: -73.8303,
  },
  {
    id: "lirr-flushing-main",
    name: "Flushing–Main Street",
    system: "lirr",
    routes: ["Port Washington"],
    lat: 40.761,
    lng: -73.83,
  },
  {
    id: "lirr-murray-hill",
    name: "Murray Hill",
    system: "lirr",
    routes: ["Port Washington"],
    lat: 40.7627,
    lng: -73.8082,
  },
  {
    id: "lirr-broadway",
    name: "Broadway",
    system: "lirr",
    routes: ["Port Washington"],
    lat: 40.761,
    lng: -73.7587,
  },
  {
    id: "lirr-bayside",
    name: "Bayside",
    system: "lirr",
    routes: ["Port Washington"],
    lat: 40.7637,
    lng: -73.7705,
  },
  {
    id: "lirr-little-neck",
    name: "Little Neck",
    system: "lirr",
    routes: ["Port Washington"],
    lat: 40.7633,
    lng: -73.7323,
  },
  {
    id: "lirr-mineola",
    name: "Mineola",
    system: "lirr",
    routes: ["Oyster Bay", "Main Line"],
    lat: 40.7418,
    lng: -73.6395,
  },
  {
    id: "lirr-east-ny",
    name: "East New York",
    system: "lirr",
    routes: ["Atlantic Branch"],
    lat: 40.6594,
    lng: -73.8732,
  },
  {
    id: "lirr-nostrand",
    name: "Nostrand Avenue",
    system: "lirr",
    routes: ["Atlantic Branch"],
    lat: 40.6698,
    lng: -73.9502,
  },
  {
    id: "lirr-hunterspoint",
    name: "Hunterspoint Avenue",
    system: "lirr",
    routes: ["Main Line"],
    lat: 40.7423,
    lng: -73.9486,
  },
  {
    id: "lirr-long-island-city",
    name: "Long Island City",
    system: "lirr",
    routes: ["Main Line"],
    lat: 40.742,
    lng: -73.9585,
  },

  // Amtrak (NYC stations only)
  {
    id: "amtrak-penn",
    name: "Penn Station",
    system: "amtrak",
    routes: ["Acela", "Northeast Regional", "Empire Service"],
    lat: 40.7506,
    lng: -73.9935,
  },
  {
    id: "amtrak-moynihan",
    name: "Moynihan Train Hall",
    system: "amtrak",
    routes: ["Acela", "Northeast Regional"],
    lat: 40.7505,
    lng: -73.9974,
  },

  // NJ Transit (NYC-area stations — Penn Station + Hoboken Terminal)
  {
    id: "njt-penn",
    name: "Penn Station",
    system: "nj-transit",
    routes: ["Northeast Corridor", "North Jersey Coast", "Midtown Direct"],
    lat: 40.7506,
    lng: -73.9935,
  },
  {
    id: "njt-hoboken",
    name: "Hoboken Terminal",
    system: "nj-transit",
    routes: ["Main/Bergen", "Pascack Valley", "Port Jervis"],
    lat: 40.7353,
    lng: -74.0298,
  },
  {
    id: "njt-secaucus",
    name: "Secaucus Junction",
    system: "nj-transit",
    routes: ["Most Lines"],
    lat: 40.7612,
    lng: -74.0755,
  },
];

// ── Distance Helpers ─────────────────────────────────────────────────────────

const EARTH_RADIUS_MI = 3958.8;

function haversineDistanceMi(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(a));
}

function estimateWalkMinutes(distanceMi: number): number {
  return Math.round(distanceMi * 20); // ~3 mph walking speed
}

// ── Socrata API (Subway + SIR) ───────────────────────────────────────────────

interface SocrataStation {
  complex_id: string;
  stop_name: string;
  daytime_routes: string;
  structure_type: string;
  latitude: string;
  longitude: string;
}

interface SocrataEntrance {
  complex_id: string;
  stop_name: string;
  daytime_routes: string;
  entrance_type: string;
  entrance_latitude: string;
  entrance_longitude: string;
  entrance_georeference?: { type: string; coordinates: [number, number] };
}

/** Convert a radius in meters to an approximate lat/lng bounding box */
function boundingBox(lat: number, lng: number, radiusMeters: number) {
  const dLat = radiusMeters / 111_320;
  const dLng = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLng: lng - dLng,
    maxLng: lng + dLng,
  };
}

async function fetchSubwayStations(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<TransitStation[]> {
  const bb = boundingBox(lat, lng, radiusMeters);

  // Stations dataset has plain latitude/longitude columns (no geo column)
  const stationsWhere = `latitude between '${bb.minLat}' and '${bb.maxLat}' AND longitude between '${bb.minLng}' and '${bb.maxLng}'`;
  const stationsUrl = `https://data.ny.gov/resource/5f5g-n3cz.json?$where=${encodeURIComponent(stationsWhere)}&$limit=200`;

  // Entrances dataset has entrance_georeference geo column
  const entrancesUrl = `https://data.ny.gov/resource/i9wp-a4ja.json?$where=${encodeURIComponent(`within_circle(entrance_georeference,${lat},${lng},${radiusMeters})`)}&$limit=500`;

  let stationsRes: Response;
  let entrancesRes: Response;
  try {
    [stationsRes, entrancesRes] = await Promise.all([
      fetch(stationsUrl, { next: { revalidate: 86400 } }),
      fetch(entrancesUrl, { next: { revalidate: 86400 } }),
    ]);
  } catch (err) {
    console.error("[transit] Socrata fetch failed:", err);
    return [];
  }

  if (!stationsRes.ok || !entrancesRes.ok) {
    console.error(
      `[transit] Socrata API error: stations=${stationsRes.status} entrances=${entrancesRes.status}`
    );
    return [];
  }

  const stations: SocrataStation[] = await stationsRes.json();
  const entrances: SocrataEntrance[] = await entrancesRes.json();

  // Group entrances by complex_id for accurate matching
  const entrancesByComplex = new Map<
    string,
    { lat: number; lng: number; type?: string }[]
  >();
  for (const e of entrances) {
    const eLat = parseFloat(e.entrance_latitude);
    const eLng = parseFloat(e.entrance_longitude);
    if (isNaN(eLat) || isNaN(eLng)) continue;
    const key = e.complex_id;
    if (!entrancesByComplex.has(key)) entrancesByComplex.set(key, []);
    entrancesByComplex.get(key)!.push({
      lat: eLat,
      lng: eLng,
      type: e.entrance_type,
    });
  }

  return stations
    .filter((s) => s.latitude && s.longitude)
    .map((s) => {
      const routes = s.daytime_routes
        ? s.daytime_routes.split(/\s+/).filter(Boolean)
        : [];
      const isSIR =
        s.structure_type === "Staten Island Railway" ||
        routes.some((r) => r === "SIR");
      return {
        id: `subway-${s.complex_id}`,
        name: s.stop_name,
        system: (isSIR ? "sir" : "subway") as TransitSystem,
        routes,
        lat: parseFloat(s.latitude),
        lng: parseFloat(s.longitude),
        entrances: entrancesByComplex.get(s.complex_id),
      };
    });
}

// ── Bus Types ─────────────────────────────────────────────────────────────

export interface BusRoute {
  name: string;
  color: string;
}

export interface NearbyBusStop {
  id: string;
  name: string;
  routes: BusRoute[];
  lat: number;
  lng: number;
  distanceMi: number;
  walkMinutes: number;
}

// ── Socrata API (MTA Bus Stops) ───────────────────────────────────────────

interface SocrataBusStop {
  stop_name: string;
  route_short_name: string;
  route_color?: string;
  latitude: string;
  longitude: string;
  georeference?: { type: string; coordinates: [number, number] };
}

async function fetchNearbyBusStops(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<NearbyBusStop[]> {
  const radiusMeters = radiusMi * 1609.344;

  const where = `within_circle(georeference,${lat},${lng},${radiusMeters})`;
  const url = `https://data.ny.gov/resource/ai5j-txmn.json?$where=${encodeURIComponent(where)}&$limit=500`;

  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 86400 } });
  } catch (err) {
    console.error("[bus] Socrata fetch failed:", err);
    return [];
  }

  if (!res.ok) {
    console.error(`[bus] Socrata API error: ${res.status}`);
    return [];
  }

  const rows: SocrataBusStop[] = await res.json();

  // Group by rounded lat/lng (5 decimals) to deduplicate stops
  const stopMap = new Map<
    string,
    { name: string; lat: number; lng: number; routes: Map<string, string> }
  >();

  for (const row of rows) {
    const rLat = parseFloat(row.latitude);
    const rLng = parseFloat(row.longitude);
    if (isNaN(rLat) || isNaN(rLng)) continue;

    const key = `${rLat.toFixed(5)},${rLng.toFixed(5)}`;
    if (!stopMap.has(key)) {
      stopMap.set(key, {
        name: row.stop_name,
        lat: rLat,
        lng: rLng,
        routes: new Map(),
      });
    }
    const stop = stopMap.get(key)!;
    if (row.route_short_name && !stop.routes.has(row.route_short_name)) {
      stop.routes.set(
        row.route_short_name,
        row.route_color ? `#${row.route_color}` : "#1976D2"
      );
    }
  }

  const stops: NearbyBusStop[] = [];
  let idx = 0;
  for (const [, stop] of stopMap) {
    const dist = haversineDistanceMi(lat, lng, stop.lat, stop.lng);
    const routes: BusRoute[] = [];
    for (const [name, color] of stop.routes) {
      routes.push({ name, color });
    }
    stops.push({
      id: `bus-${idx++}`,
      name: stop.name,
      routes,
      lat: stop.lat,
      lng: stop.lng,
      distanceMi: Math.round(dist * 100) / 100,
      walkMinutes: estimateWalkMinutes(dist),
    });
  }

  stops.sort((a, b) => a.distanceMi - b.distanceMi);

  // Keep only the closest stop for each bus route
  const seenRoutes = new Set<string>();
  const deduplicated: NearbyBusStop[] = [];
  for (const stop of stops) {
    const hasNewRoute = stop.routes.some((r) => !seenRoutes.has(r.name));
    if (hasNewRoute) {
      for (const r of stop.routes) {
        seenRoutes.add(r.name);
      }
      deduplicated.push(stop);
    }
  }

  return deduplicated;
}

// ── Main Export ───────────────────────────────────────────────────────────────

async function _getNearbyStations(
  lat: number,
  lng: number,
  radiusMi: number
): Promise<NearbyStation[]> {
  const radiusMeters = radiusMi * 1609.344;

  // Fetch subway/SIR from Socrata, filter commuter rail by distance
  const [subwayStations] = await Promise.all([
    fetchSubwayStations(lat, lng, radiusMeters),
  ]);

  const commuterNearby = COMMUTER_STATIONS.filter(
    (s) => haversineDistanceMi(lat, lng, s.lat, s.lng) <= radiusMi
  );

  const allStations = [...subwayStations, ...commuterNearby];

  const nearby: NearbyStation[] = allStations.map((s) => {
    const dist = haversineDistanceMi(lat, lng, s.lat, s.lng);
    return {
      ...s,
      distanceMi: Math.round(dist * 100) / 100,
      walkMinutes: estimateWalkMinutes(dist),
    };
  });

  nearby.sort((a, b) => a.distanceMi - b.distanceMi);

  // Keep only the closest station for each route/line
  const seenRoutes = new Set<string>();
  const deduplicated: NearbyStation[] = [];
  for (const station of nearby) {
    const hasNewRoute = station.routes.some(
      (r) => !seenRoutes.has(`${station.system}:${r}`)
    );
    if (hasNewRoute) {
      for (const r of station.routes) {
        seenRoutes.add(`${station.system}:${r}`);
      }
      deduplicated.push(station);
    }
  }

  return deduplicated;
}

export const getNearbyStations = unstable_cache(
  _getNearbyStations,
  ["nearby-transit"],
  { revalidate: 86400 } // 24 hours
);

export const getNearbyBusStops = unstable_cache(
  fetchNearbyBusStops,
  ["nearby-bus-stops"],
  { revalidate: 86400 } // 24 hours
);
