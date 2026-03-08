"use client";

// CESIUM_BASE_URL must be set on window BEFORE cesium module evaluates
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).CESIUM_BASE_URL = "/cesium/";
}

import { BuildingViewerInner } from "./building-viewer-inner";

interface Props {
  latitude: number;
  longitude: number;
  address: string;
}

export default function CesiumViewerWrapper({
  latitude,
  longitude,
  address,
}: Props) {
  return (
    <BuildingViewerInner
      latitude={latitude}
      longitude={longitude}
      address={address}
    />
  );
}
