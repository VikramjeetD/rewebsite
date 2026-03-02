"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Ion,
  Viewer as CesiumViewer,
  Cartesian3,
  Math as CesiumMath,
  Cesium3DTileset,
  VerticalOrigin,
  HorizontalOrigin,
  HeadingPitchRange,
} from "cesium";
import { RotateCw } from "lucide-react";

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
  const interactingRef = useRef(false);
  const autoRotateRef = useRef(true);
  const [autoRotate, setAutoRotate] = useState(true);
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

    // Initial view: orbit target at ground level
    const target = Cartesian3.fromDegrees(longitude, latitude, 0);
    viewer.camera.lookAt(
      target,
      new HeadingPitchRange(0, CesiumMath.toRadians(-35), 200)
    );

    const canvas = viewer.canvas;

    // Pause auto-orbit during pointer drag so the user has full control
    const onPointerDown = () => {
      interactingRef.current = true;
    };
    const onPointerUp = () => {
      if (!interactingRef.current) return;
      interactingRef.current = false;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    // Auto-orbit: rotateRight works within the lookAt constraint,
    // naturally preserving the user's zoom and tilt.
    const onTick = () => {
      if (viewer.isDestroyed()) return;
      if (!autoRotateRef.current || interactingRef.current) return;
      viewer.camera.rotateRight(CesiumMath.toRadians(0.1));
    };
    viewer.clock.onTick.addEventListener(onTick);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      viewer.clock.onTick.removeEventListener(onTick);
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
    };
  }, [latitude, longitude, address]);

  const toggleAutoRotate = useCallback(() => {
    setAutoRotate((prev) => {
      const next = !prev;
      autoRotateRef.current = next;
      return next;
    });
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-black/90 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
      <button
        type="button"
        onClick={toggleAutoRotate}
        className={`absolute bottom-4 right-4 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs backdrop-blur-sm transition-colors cursor-pointer ${
          autoRotate
            ? "bg-white/20 text-white hover:bg-white/30"
            : "bg-black/60 text-white/50 hover:bg-black/80 hover:text-white/80"
        }`}
        title={autoRotate ? "Stop auto-rotate" : "Start auto-rotate"}
      >
        <RotateCw className="h-3.5 w-3.5" />
        Auto-rotate
      </button>
    </div>
  );
}
