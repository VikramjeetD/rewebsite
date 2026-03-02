"use client";

import dynamic from "next/dynamic";

interface BuildingViewerProps {
  latitude: number;
  longitude: number;
  address: string;
}

function ViewerLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-black/90">
      <div className="text-center text-gray-400">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
        Loading 3D viewer...
      </div>
    </div>
  );
}

const CesiumViewerWrapper = dynamic(
  () => import("./cesium-viewer-wrapper"),
  { ssr: false, loading: () => <ViewerLoading /> }
);

export function BuildingViewer({ latitude, longitude, address }: BuildingViewerProps) {
  return (
    <CesiumViewerWrapper
      latitude={latitude}
      longitude={longitude}
      address={address}
    />
  );
}
