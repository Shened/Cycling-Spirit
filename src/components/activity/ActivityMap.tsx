"use client";
import { useEffect, useRef } from "react";
import polyline from "@mapbox/polyline";
import "leaflet/dist/leaflet.css";

interface Props {
    polyline: string;
}

export default function ActivityMap({ polyline: encodedPolyline }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<unknown>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        // Limpa instância anterior se existir
        if (mapInstanceRef.current) {
            (mapInstanceRef.current as { remove: () => void }).remove();
            mapInstanceRef.current = null;
        }

        // Limpa o container manualmente (fix StrictMode)
        const container = mapRef.current as HTMLDivElement & { _leaflet_id?: number };
        delete container._leaflet_id;

        let cancelled = false;

        const initMap = async () => {
            const L = (await import("leaflet")).default;

            if (cancelled) return;

            const coords = polyline.decode(encodedPolyline) as [number, number][];
            if (coords.length === 0) return;

            const map = L.map(mapRef.current!, {
                zoomControl: true,
                scrollWheelZoom: false,
            });
            mapInstanceRef.current = map;

            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                attribution: "© OpenStreetMap © CARTO",
                maxZoom: 19,
            }).addTo(map);

            const route = L.polyline(coords, {
                color: "#2B8FBF",
                weight: 3,
                opacity: 0.9,
            }).addTo(map);

            L.circleMarker(coords[0], {
                radius: 7,
                fillColor: "#1fb8a0",
                color: "#fff",
                weight: 2,
                fillOpacity: 1,
            }).addTo(map).bindTooltip("Início");

            L.circleMarker(coords[coords.length - 1], {
                radius: 7,
                fillColor: "#E8177A",
                color: "#fff",
                weight: 2,
                fillOpacity: 1,
            }).addTo(map).bindTooltip("Fim");

            map.fitBounds(route.getBounds(), { padding: [20, 20] });
        };

        initMap();

        return () => {
            cancelled = true;
            if (mapInstanceRef.current) {
                (mapInstanceRef.current as { remove: () => void }).remove();
                mapInstanceRef.current = null;
            }
        };
    }, [encodedPolyline]);

    return <div ref={mapRef} className="w-full h-full" />;
}