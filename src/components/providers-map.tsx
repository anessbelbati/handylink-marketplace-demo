"use client";

import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";

import "leaflet/dist/leaflet.css";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// Fix default marker icons in bundlers.
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconRetinaUrl.src,
  iconUrl: iconUrl.src,
  shadowUrl: shadowUrl.src,
});

export default function ProvidersMap({
  providers,
  categoryNameBySlug,
  viewerLocation,
}: {
  providers: Array<{ user: any; profile: any }>;
  categoryNameBySlug: Record<string, string>;
  viewerLocation?: { lat: number; lng: number } | null;
}) {
  const fallbackCenter = viewerLocation
    ? [viewerLocation.lat, viewerLocation.lng]
    : providers.length > 0
      ? [providers[0].profile.lat, providers[0].profile.lng]
      : [37.7749, -122.4194];

  return (
    <div className="glass overflow-hidden rounded-3xl shadow-soft">
      <div className="h-[520px] w-full">
        <MapContainer
          center={fallbackCenter as any}
          zoom={viewerLocation ? 11 : 10}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {viewerLocation ? (
            <Marker position={[viewerLocation.lat, viewerLocation.lng] as any}>
              <Popup>
                <div className="text-sm font-medium">You are here</div>
              </Popup>
            </Marker>
          ) : null}

          {providers.map((p) => (
            <Marker
              key={p.user._id}
              position={[p.profile.lat, p.profile.lng] as any}
            >
              <Popup>
                <div className="space-y-2">
                  <div className="text-sm font-semibold">{p.user.fullName}</div>
                  <div className="flex flex-wrap gap-1">
                    {(p.profile.categories ?? []).slice(0, 3).map((slug: string) => (
                      <Badge key={slug} variant="brand">
                        {categoryNameBySlug[slug] ?? slug}
                      </Badge>
                    ))}
                  </div>
                  <Link
                    href={`/providers/${p.user._id}`}
                    className={cn(
                      "inline-flex items-center text-sm font-medium text-brand-700 hover:underline",
                    )}
                  >
                    View profile
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
