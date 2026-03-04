import {
  DoorOpen,
  Video,
  ConciergeBell,
  ArrowUpDown,
  Wrench,
  Package,
  Bike,
  Sun,
  TreePine,
  BoxSelect,
  Flower2,
  Dumbbell,
  PersonStanding,
  Waves,
  Thermometer,
  Sparkles,
  WashingMachine,
  Building2,
  MapPin,
  Archive,
  Warehouse,
  Car,
  ParkingCircle,
  UserCheck,
  Flame,
  Droplets,
  Zap,
  Tv,
  Wifi,
  Utensils,
  Snowflake,
  Fan,
  Shrub,
  ArrowUpFromLine,
  SquareStack,
  FlameKindling,
  Fence,
  Trees,
  Sofa,
  Refrigerator,
  Diamond,
  Shield,
  KeyRound,
  Eye,
  ShieldCheck,
  Accessibility,
  Cat,
  Dog,
  PawPrint,
  Ban,
  Tag,
  type LucideIcon,
} from "lucide-react";

export interface AmenityDefinition {
  key: string;
  label: string;
  icon: LucideIcon;
}

export interface AmenityCategory {
  name: string;
  amenities: AmenityDefinition[];
}

export const AMENITY_CATALOG: AmenityCategory[] = [
  {
    name: "Building Features",
    amenities: [
      { key: "doorman", label: "Doorman", icon: DoorOpen },
      { key: "virtual-doorman", label: "Virtual Doorman", icon: Video },
      { key: "concierge", label: "Concierge", icon: ConciergeBell },
      { key: "elevator", label: "Elevator", icon: ArrowUpDown },
      { key: "live-in-super", label: "Live-in Super", icon: Wrench },
      { key: "package-room", label: "Package Room", icon: Package },
      { key: "bike-room", label: "Bike Room", icon: Bike },
      { key: "roof-deck", label: "Roof Deck", icon: Sun },
      { key: "common-outdoor-space", label: "Common Outdoor Space", icon: TreePine },
      { key: "courtyard", label: "Courtyard", icon: BoxSelect },
      { key: "garden", label: "Garden", icon: Flower2 },
    ],
  },
  {
    name: "Fitness & Wellness",
    amenities: [
      { key: "gym", label: "Gym/Fitness Center", icon: Dumbbell },
      { key: "yoga-room", label: "Yoga Room", icon: PersonStanding },
      { key: "swimming-pool", label: "Swimming Pool", icon: Waves },
      { key: "sauna", label: "Sauna", icon: Thermometer },
      { key: "spa", label: "Spa", icon: Sparkles },
    ],
  },
  {
    name: "Laundry",
    amenities: [
      { key: "in-unit-washer-dryer", label: "In-Unit Washer/Dryer", icon: WashingMachine },
      { key: "laundry-in-building", label: "Laundry in Building", icon: Building2 },
      { key: "laundry-nearby", label: "Laundry Nearby", icon: MapPin },
    ],
  },
  {
    name: "Storage",
    amenities: [
      { key: "storage-unit", label: "Storage Unit", icon: Archive },
      { key: "basement-storage", label: "Basement Storage", icon: Warehouse },
      { key: "bike-storage", label: "Bike Storage", icon: Bike },
    ],
  },
  {
    name: "Parking",
    amenities: [
      { key: "garage-parking", label: "Garage Parking", icon: Car },
      { key: "street-parking", label: "Street Parking", icon: ParkingCircle },
      { key: "valet-parking", label: "Valet Parking", icon: UserCheck },
    ],
  },
  {
    name: "Utilities Included",
    amenities: [
      { key: "heat-included", label: "Heat Included", icon: Flame },
      { key: "hot-water-included", label: "Hot Water Included", icon: Droplets },
      { key: "electric-included", label: "Electric Included", icon: Zap },
      { key: "cable-included", label: "Cable Included", icon: Tv },
      { key: "internet-included", label: "Internet Included", icon: Wifi },
    ],
  },
  {
    name: "Unit Features",
    amenities: [
      { key: "dishwasher", label: "Dishwasher", icon: Utensils },
      { key: "central-ac", label: "Central A/C", icon: Snowflake },
      { key: "window-ac", label: "Window A/C", icon: Fan },
      { key: "hardwood-floors", label: "Hardwood Floors", icon: Shrub },
      { key: "high-ceilings", label: "High Ceilings", icon: ArrowUpFromLine },
      { key: "exposed-brick", label: "Exposed Brick", icon: SquareStack },
      { key: "fireplace", label: "Fireplace", icon: FlameKindling },
      { key: "balcony-terrace", label: "Balcony/Terrace", icon: Fence },
      { key: "private-outdoor-space", label: "Private Outdoor Space", icon: Trees },
      { key: "furnished", label: "Furnished", icon: Sofa },
      { key: "stainless-steel-appliances", label: "Stainless Steel Appliances", icon: Refrigerator },
      { key: "granite-countertops", label: "Granite Countertops", icon: Diamond },
    ],
  },
  {
    name: "Security",
    amenities: [
      { key: "video-intercom", label: "Video Intercom", icon: Shield },
      { key: "key-fob-entry", label: "Key Fob Entry", icon: KeyRound },
      { key: "security-cameras", label: "Security Cameras", icon: Eye },
      { key: "24-hour-security", label: "24-Hour Security", icon: ShieldCheck },
    ],
  },
  {
    name: "Accessibility",
    amenities: [
      { key: "wheelchair-accessible", label: "Wheelchair Accessible", icon: Accessibility },
    ],
  },
  {
    name: "Pet Policy",
    amenities: [
      { key: "cats-and-dogs", label: "Cats and Dogs", icon: PawPrint },
      { key: "cats-only", label: "Cats Only", icon: Cat },
      { key: "dogs-only", label: "Dogs Only", icon: Dog },
      { key: "no-pets", label: "No Pets", icon: Ban },
    ],
  },
];

// Flat map for O(1) lookups by key
export const AMENITY_MAP = new Map<string, AmenityDefinition>(
  AMENITY_CATALOG.flatMap((cat) => cat.amenities.map((a) => [a.key, a]))
);

// Build reverse lookup maps for label and slug matching
const labelMap = new Map<string, AmenityDefinition>();
const slugMap = new Map<string, AmenityDefinition>();

for (const [, def] of AMENITY_MAP) {
  labelMap.set(def.label.toLowerCase(), def);
  slugMap.set(def.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), def);
}

/**
 * Resolve a raw amenity string to a definition with icon.
 * Multi-pass: key → label → slug → fallback to Tag icon.
 */
export function resolveAmenity(raw: string): { label: string; icon: LucideIcon } {
  const trimmed = raw.trim();
  if (!trimmed) return { label: raw, icon: Tag };

  // 1. Exact key match
  const byKey = AMENITY_MAP.get(trimmed);
  if (byKey) return { label: byKey.label, icon: byKey.icon };

  // 2. Label match (case-insensitive)
  const byLabel = labelMap.get(trimmed.toLowerCase());
  if (byLabel) return { label: byLabel.label, icon: byLabel.icon };

  // 3. Slug match
  const asSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const bySlug = slugMap.get(asSlug);
  if (bySlug) return { label: bySlug.label, icon: bySlug.icon };

  // 4. Also try matching the raw string as a key directly in slug map
  const byRawSlug = AMENITY_MAP.get(asSlug);
  if (byRawSlug) return { label: byRawSlug.label, icon: byRawSlug.icon };

  // Fallback
  return { label: trimmed, icon: Tag };
}

/**
 * Normalize a raw amenity string to its catalog key, or return the original if not found.
 */
export function normalizeAmenityKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return raw;

  if (AMENITY_MAP.has(trimmed)) return trimmed;

  const byLabel = labelMap.get(trimmed.toLowerCase());
  if (byLabel) return byLabel.key;

  const asSlug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const bySlug = slugMap.get(asSlug);
  if (bySlug) return bySlug.key;

  const byRawSlug = AMENITY_MAP.get(asSlug);
  if (byRawSlug) return byRawSlug.key;

  return trimmed;
}

// Reverse map: key → category name
const keyCategoryMap = new Map<string, string>(
  AMENITY_CATALOG.flatMap((cat) =>
    cat.amenities.map((a) => [a.key, cat.name])
  )
);

export interface GroupedAmenity {
  category: string;
  items: { raw: string; label: string; icon: LucideIcon }[];
}

/**
 * Group raw amenity strings by their catalog category.
 * Maintains catalog category order; unrecognized amenities go into "Other".
 */
export function groupAmenitiesByCategory(raw: string[]): GroupedAmenity[] {
  const categoryOrder = AMENITY_CATALOG.map((c) => c.name);
  const groups = new Map<string, GroupedAmenity>();

  for (const item of raw) {
    const key = normalizeAmenityKey(item);
    const resolved = resolveAmenity(item);
    const category = keyCategoryMap.get(key) ?? "Other";

    let group = groups.get(category);
    if (!group) {
      group = { category, items: [] };
      groups.set(category, group);
    }
    group.items.push({ raw: item, label: resolved.label, icon: resolved.icon });
  }

  // Sort by catalog order, "Other" last
  return Array.from(groups.values()).sort((a, b) => {
    const ai = categoryOrder.indexOf(a.category);
    const bi = categoryOrder.indexOf(b.category);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}
