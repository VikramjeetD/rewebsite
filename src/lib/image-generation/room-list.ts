export interface RoomDescriptor {
  id: string;
  label: string;
  prompt: string;
}

export function getRoomList(
  bedrooms: number,
  bathrooms: number
): RoomDescriptor[] {
  const rooms: RoomDescriptor[] = [];

  // Living area
  if (bedrooms === 0) {
    rooms.push({
      id: "studio",
      label: "Studio",
      prompt:
        "the studio living and sleeping area from a different position",
    });
  } else {
    rooms.push({
      id: "living-room",
      label: "Living Room",
      prompt:
        "the living room from a different corner, showing the seating area and windows",
    });
  }

  // Kitchen
  rooms.push({
    id: "kitchen",
    label: "Kitchen",
    prompt:
      "the kitchen from the opposite end, showing countertops, cabinets, and appliances",
  });

  // Bedrooms
  for (let i = 1; i <= bedrooms; i++) {
    rooms.push({
      id: `bedroom-${i}`,
      label: bedrooms === 1 ? "Bedroom" : `Bedroom ${i}`,
      prompt: `bedroom ${i} from a different angle, showing the bed, closet area, and window`,
    });
  }

  // Bathrooms
  const bathroomCount = Math.ceil(bathrooms);
  const hasHalfBath = bathrooms % 1 !== 0;

  for (let i = 1; i <= bathroomCount; i++) {
    const isHalf = hasHalfBath && i === bathroomCount;
    if (isHalf) {
      rooms.push({
        id: `bathroom-${i}`,
        label: "Half Bath",
        prompt:
          "the half bathroom from the doorway, showing the sink and mirror",
      });
    } else {
      rooms.push({
        id: `bathroom-${i}`,
        label: bathroomCount === 1 ? "Bathroom" : `Bathroom ${i}`,
        prompt:
          "the bathroom from a different angle, showing the vanity, shower/tub, and mirror",
      });
    }
  }

  // Hallway for 2+ bedrooms
  if (bedrooms >= 2) {
    rooms.push({
      id: "hallway",
      label: "Entry/Hallway",
      prompt: "the apartment entryway and hallway looking inward",
    });
  }

  return rooms;
}
