export interface PlutoResult {
  yearBuilt: number | null;
  numFloors: number | null;
  totalUnits: number | null;
  borough: string | null;
}

const BOROUGH_MAP: Record<string, string> = {
  MN: "Manhattan",
  BK: "Brooklyn",
  BX: "Bronx",
  QN: "Queens",
  SI: "Staten Island",
};

const PLUTO_API =
  "https://data.cityofnewyork.us/resource/64uk-42ks.json";

/** PLUTO uses full street suffix names. Expand abbreviations to match. */
const SUFFIX_MAP: Record<string, string> = {
  AVE: "AVENUE",
  ST: "STREET",
  BLVD: "BOULEVARD",
  DR: "DRIVE",
  RD: "ROAD",
  PL: "PLACE",
  LN: "LANE",
  CT: "COURT",
  TER: "TERRACE",
  CIR: "CIRCLE",
  PKWY: "PARKWAY",
};

const SUFFIX_PATTERN = new RegExp(
  `\\s+(${Object.keys(SUFFIX_MAP).join("|")})\\s*$`
);

function parseIntField(value: unknown): number | null {
  if (value == null) return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Normalize address to match PLUTO's format (full suffix names, uppercase).
 * "1440 Amsterdam Ave" → "1440 AMSTERDAM AVENUE"
 */
function normalizePlutoAddress(address: string): string {
  const upper = address.trim().toUpperCase();
  return upper.replace(SUFFIX_PATTERN, (_, abbr: string) => {
    return ` ${SUFFIX_MAP[abbr] ?? abbr}`;
  });
}

export async function lookupPluto(
  address: string
): Promise<PlutoResult | null> {
  const token = process.env.PLUTO_APP_TOKEN;
  if (!token) return null;

  try {
    const normalized = normalizePlutoAddress(address);
    if (!normalized) return null;

    const url = new URL(PLUTO_API);
    url.searchParams.set(
      "$where",
      `upper(address)='${normalized.replace(/'/g, "''")}'`
    );
    url.searchParams.set("$limit", "1");
    url.searchParams.set(
      "$select",
      "yearbuilt,numfloors,unitstotal,unitsres,borough"
    );

    const res = await fetch(url.toString(), {
      headers: { "X-App-Token": token },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const row = data[0];

    return {
      yearBuilt: parseIntField(row.yearbuilt),
      numFloors: parseIntField(row.numfloors),
      totalUnits:
        parseIntField(row.unitstotal) ?? parseIntField(row.unitsres),
      borough: BOROUGH_MAP[row.borough as string] ?? null,
    };
  } catch {
    return null;
  }
}
