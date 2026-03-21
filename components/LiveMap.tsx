"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";

export type MemberLocation = {
  id: string;
  name: string;
  color: string;
  isTracking: boolean;
  lastSeen: string | null;
  locations: { lat: number; lng: number; accuracy?: number; speed?: number; createdAt: string }[];
};

type Props = {
  members: MemberLocation[];
  selectedId: string | null;
  historyPoints: { lat: number; lng: number }[];
};

export default function LiveMap({ members, selectedId, historyPoints }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const historyLineRef = useRef<Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Capture ref synchronously before the async import
    const container = containerRef.current;

    // Dynamically import Leaflet (client-side only)
    import("leaflet").then((L) => {
      // Guard: container may have unmounted during the async import
      if (!container || mapRef.current) return;

      // Fix default icon path issue with webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(container).setView([0, 0], 2);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers whenever members data changes
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      const map = mapRef.current!;

      members.forEach((member) => {
        const loc = member.locations[0];
        if (!loc) return;

        const existing = markersRef.current.get(member.id);

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            background:${member.color};
            width:36px;height:36px;border-radius:50%;
            border:3px solid white;
            display:flex;align-items:center;justify-content:center;
            font-size:12px;font-weight:700;color:white;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
            ${member.isTracking ? "animation:pulse 2s infinite;" : "opacity:0.6;"}
          ">${member.name.charAt(0).toUpperCase()}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const popupContent = `
          <div style="font-family:sans-serif;min-width:140px;">
            <strong style="color:${member.color}">${member.name}</strong>
            <br/><span style="font-size:11px;color:#666;">
              ${member.isTracking ? "🟢 Tracking" : "⚫ Offline"}
            </span>
            <br/><span style="font-size:11px;color:#666;">
              ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}
            </span>
            ${loc.speed != null ? `<br/><span style="font-size:11px;color:#666;">Speed: ${Math.round((loc.speed ?? 0) * 3.6)} km/h</span>` : ""}
          </div>`;

        if (existing) {
          existing.setLatLng([loc.lat, loc.lng]);
          existing.setIcon(icon);
          existing.setPopupContent(popupContent);
        } else {
          const marker = L.marker([loc.lat, loc.lng], { icon })
            .addTo(map)
            .bindPopup(popupContent);
          markersRef.current.set(member.id, marker);
        }
      });

      // Fit map to show all markers if we have any
      const activeMembers = members.filter((m) => m.locations[0]);
      if (activeMembers.length > 0 && !selectedId) {
        const bounds = L.latLngBounds(
          activeMembers.map((m) => [m.locations[0].lat, m.locations[0].lng] as [number, number])
        );
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
      }
    });
  }, [members, selectedId]);

  // Draw history trail for selected member
  useEffect(() => {
    if (!mapRef.current) return;

    import("leaflet").then((L) => {
      const map = mapRef.current!;

      if (historyLineRef.current) {
        historyLineRef.current.remove();
        historyLineRef.current = null;
      }

      if (historyPoints.length > 1) {
        const color = members.find((m) => m.id === selectedId)?.color ?? "#3B82F6";
        const line = L.polyline(
          historyPoints.map((p) => [p.lat, p.lng]),
          { color, weight: 3, opacity: 0.7, dashArray: "6 4" }
        ).addTo(map);
        historyLineRef.current = line;
        map.fitBounds(line.getBounds(), { padding: [60, 60] });
      }
    });
  }, [historyPoints, selectedId, members]);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(255,255,255,0.15); }
        }
      `}</style>
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
    </>
  );
}
