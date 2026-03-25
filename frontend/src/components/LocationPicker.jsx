import { useEffect, useRef } from 'react';

const DEFAULT_CENTER = { lat: -6.7924, lng: 39.2083 }; // Dar es Salaam

export default function LocationPicker({ latitude, longitude, onChange, height = 220 }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const L = window.L;
    if (!mapRef.current || !L) return;
    if (leafletMapRef.current) return;

    const initialLat = Number(latitude) || DEFAULT_CENTER.lat;
    const initialLng = Number(longitude) || DEFAULT_CENTER.lng;

    const map = L.map(mapRef.current).setView([initialLat, initialLng], Number(latitude) && Number(longitude) ? 15 : 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    markerRef.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

    const emit = (lat, lng) => {
      if (onChange) onChange({ lat, lng });
    };

    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      markerRef.current.setLatLng([lat, lng]);
      emit(lat, lng);
    });

    markerRef.current.on('dragend', () => {
      const p = markerRef.current.getLatLng();
      emit(p.lat, p.lng);
    });

    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const map = leafletMapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;

    if (latitude && longitude) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      marker.setLatLng([lat, lng]);
      map.setView([lat, lng], 15);
    }
  }, [latitude, longitude]);

  if (!window.L) {
    return (
      <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8, color: '#666' }}>
        Map library not loaded. Check internet/CDN availability.
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height, borderRadius: 8, border: '1px solid #ddd' }} />;
}
