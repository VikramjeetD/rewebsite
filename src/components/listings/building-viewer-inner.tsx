"use client";

import { useEffect, useRef, useState } from "react";
import {
  Ion,
  Viewer as CesiumViewer,
  Cartesian3,
  Color,
  Math as CesiumMath,
  Cesium3DTileset,
  VerticalOrigin,
  HorizontalOrigin,
  HeadingPitchRange,
  Matrix4,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

// Set Ion token at module level
const ionToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;
if (ionToken) {
  Ion.defaultAccessToken = ionToken;
}

const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

interface Props {
  latitude: number;
  longitude: number;
  address: string;
}

/** Draw a minimal map pin on a canvas — white circle with dark border */
function createPinImage(): string {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Shadow
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // Teardrop / pin shape
  ctx.beginPath();
  ctx.moveTo(size / 2, size - 4);
  ctx.bezierCurveTo(size / 2 - 2, size * 0.6, 8, size * 0.38, 8, size * 0.28);
  ctx.arc(size / 2, size * 0.28, size / 2 - 8, Math.PI, 0, false);
  ctx.bezierCurveTo(size - 8, size * 0.38, size / 2 + 2, size * 0.6, size / 2, size - 4);
  ctx.closePath();

  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Inner dot
  ctx.beginPath();
  ctx.arc(size / 2, size * 0.28, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a1a";
  ctx.fill();

  return canvas.toDataURL();
}

export function BuildingViewerInner({ latitude, longitude, address }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<CesiumViewer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const viewer = new CesiumViewer(containerRef.current, {
      timeline: false,
      animation: false,
      homeButton: false,
      baseLayerPicker: false,
      navigationHelpButton: false,
      geocoder: false,
      sceneModePicker: false,
      fullscreenButton: false,
      selectionIndicator: false,
      infoBox: false,
      baseLayer: false,
    });
    viewerRef.current = viewer;

    // Load Google Photorealistic 3D Tiles
    const tilesetUrl = `https://tile.googleapis.com/v1/3dtiles/root.json?key=${googleKey}`;
    Cesium3DTileset.fromUrl(tilesetUrl)
      .then((tileset) => {
        if (!viewer.isDestroyed()) {
          viewer.scene.primitives.add(tileset);
        }
      })
      .catch((err) => {
        console.error("Failed to load Google 3D Tiles:", err);
        setError("Failed to load 3D tiles. Check that Map Tiles API is enabled.");
      });

    // Pin marker
    viewer.entities.add({
      position: Cartesian3.fromDegrees(longitude, latitude, 0),
      billboard: {
        image: createPinImage(),
        verticalOrigin: VerticalOrigin.BOTTOM,
        horizontalOrigin: HorizontalOrigin.CENTER,
        scale: 0.75,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    // Auto-orbit: camera orbits around the building location.
    // Use pitch and range to determine the lookAt target altitude
    // so the ground-level pin projects to the center of the viewport
    // regardless of screen size.
    const pitchRad = CesiumMath.toRadians(-35);
    const range = 200;
    // The camera sits at: targetAlt + range * sin(-pitch) above ground
    // and range * cos(-pitch) horizontally away.
    // For the ground point (alt=0) to appear at screen center,
    // the lookAt target should be at ground level (alt=0).
    const target = Cartesian3.fromDegrees(longitude, latitude, 0);
    let heading = 0;
    let orbitStopped = false;

    viewer.camera.lookAt(target, new HeadingPitchRange(heading, pitchRad, range));

    const canvas = viewer.canvas;

    const stopOrbit = () => {
      if (orbitStopped) return;
      orbitStopped = true;
      // Permanently unlock camera for free navigation
      viewer.camera.lookAtTransform(Matrix4.IDENTITY);
    };

    canvas.addEventListener("pointerdown", stopOrbit);
    canvas.addEventListener("wheel", stopOrbit);

    const onTick = () => {
      if (orbitStopped || viewer.isDestroyed()) return;
      heading += CesiumMath.toRadians(0.1);
      viewer.camera.lookAt(target, new HeadingPitchRange(heading, pitchRad, range));
    };
    viewer.clock.onTick.addEventListener(onTick);

    return () => {
      canvas.removeEventListener("pointerdown", stopOrbit);
      canvas.removeEventListener("wheel", stopOrbit);
      viewer.clock.onTick.removeEventListener(onTick);
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, [latitude, longitude, address]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-black/90 text-red-400">
        {error}
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
