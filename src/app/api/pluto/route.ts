import { NextResponse } from "next/server";

const PLUTO_API = "https://data.cityofnewyork.us/resource/64uk-42ks.json";

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

function normalizePlutoAddress(address: string): string {
  const upper = address.trim().toUpperCase();
  return upper.replace(SUFFIX_PATTERN, (_, abbr: string) => {
    return ` ${SUFFIX_MAP[abbr] ?? abbr}`;
  });
}

function parseNumField(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }

  const token = process.env.PLUTO_APP_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const normalized = normalizePlutoAddress(address);
  if (!normalized) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const url = new URL(PLUTO_API);
  url.searchParams.set(
    "$where",
    `upper(address)='${normalized.replace(/'/g, "''")}'`
  );
  url.searchParams.set("$limit", "1");
  url.searchParams.set("$select", "numfloors,bldgfront,bldgdepth");

  const res = await fetch(url.toString(), {
    headers: { "X-App-Token": token },
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "PLUTO query failed" }, { status: 502 });
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const row = data[0];
  return NextResponse.json({
    numFloors: parseNumField(row.numfloors),
    buildingFront: parseNumField(row.bldgfront),
    buildingDepth: parseNumField(row.bldgdepth),
  });
}
