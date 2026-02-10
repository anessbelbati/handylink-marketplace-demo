"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import { cn } from "@/lib/cn";

// Fix default marker icons in bundlers.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
});

type LatLng = { lat: number; lng: number };

function MapAutoCenter({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (!value) return;
    map.setView([value.lat, value.lng] as any, Math.max(map.getZoom(), 12), {
      animate: true,
    });
  }, [map, value?.lat, value?.lng, value]);
  return null;
}

function ClickToSet({ onPick }: { onPick: (value: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({
  value,
  onChange,
  height = 260,
  className,
  fallbackCenter,
  zoom = 11,
}: {
  value: LatLng | null;
  onChange: (value: LatLng) => void;
  height?: number;
  className?: string;
  fallbackCenter?: LatLng;
  zoom?: number;
}) {
  const center = useMemo(() => {
    if (value) return value;
    return fallbackCenter ?? { lat: 37.7749, lng: -122.4194 };
  }, [fallbackCenter, value]);

  return (
    <div
      className={cn("overflow-hidden rounded-3xl border bg-white/60 shadow-soft", className)}
      style={{ height }}
    >
      <MapContainer
        center={[center.lat, center.lng] as any}
        zoom={zoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ClickToSet onPick={onChange} />
        <MapAutoCenter value={value} />

        {value ? (
          <Marker
            position={[value.lat, value.lng] as any}
            draggable
            eventHandlers={{
              dragend: (e: any) => {
                const ll = e.target.getLatLng();
                onChange({ lat: ll.lat, lng: ll.lng });
              },
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

