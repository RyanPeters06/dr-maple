import { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useLoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { searchNearbyClinics, type ClinicResult } from '../services/maps';
import { WaitTimeBadge } from './WaitTimeBadge';
import { DEFAULT_LOCATION } from '../constants';

const LIBRARIES: ('places')[] = ['places'];

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f0f1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d1117' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

export const ClinicMap = () => {
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [clinics, setClinics] = useState<ClinicResult[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<ClinicResult | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  // Get user geolocation
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false); // Fall back to Toronto
      }
    );
  }, []);

  // Search clinics once map is loaded and location is known
  useEffect(() => {
    if (!isLoaded || isLocating) return;
    searchNearbyClinics(userLocation, (results) => {
      setClinics(results);
    });
  }, [isLoaded, isLocating, userLocation]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
  }, []);

  const handleClinicClick = (clinic: ClinicResult) => {
    setSelectedClinic(clinic);
    mapInstance?.panTo({ lat: clinic.lat, lng: clinic.lng });
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 p-8 text-center">
        <div>
          <p className="text-2xl mb-2">🗺️</p>
          <p className="font-medium">Maps failed to load</p>
          <p className="text-sm text-gray-600 mt-1">Check your Google Maps API key in .env.local</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Map header */}
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <h2 className="font-bold text-white">Nearby Clinics & ERs</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {isLocating ? 'Locating you...' : `${clinics.length} locations found near you`}
        </p>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-0">
        <GoogleMap
          zoom={13}
          center={userLocation}
          mapContainerStyle={{ width: '100%', height: '100%' }}
          options={{ styles: MAP_STYLES, disableDefaultUI: false, zoomControl: true }}
          onLoad={onMapLoad}
        >
          {/* User location marker */}
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 10,
              fillColor: '#14b8a6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2,
            }}
            title="Your location"
          />

          {/* Clinic markers */}
          {clinics.map((clinic) => (
            <Marker
              key={clinic.id}
              position={{ lat: clinic.lat, lng: clinic.lng }}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="14" fill="${clinic.type === 'hospital' ? '#ef4444' : '#0d9488'}" stroke="white" stroke-width="2"/>
                    <text x="16" y="21" text-anchor="middle" font-size="14" fill="white">${clinic.type === 'hospital' ? '🏥' : '+'}</text>
                  </svg>`
                )}`,
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16),
              }}
              onClick={() => setSelectedClinic(clinic)}
            />
          ))}

          {/* Info window */}
          {selectedClinic && (
            <InfoWindow
              position={{ lat: selectedClinic.lat, lng: selectedClinic.lng }}
              onCloseClick={() => setSelectedClinic(null)}
            >
              <div className="p-2 min-w-[200px]">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{selectedClinic.type === 'hospital' ? '🏥' : '🏥'}</span>
                  <div>
                    <h3 className="font-bold text-sm text-gray-900">{selectedClinic.name}</h3>
                    <p className="text-xs text-gray-500">{selectedClinic.address}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${selectedClinic.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {selectedClinic.isOpen ? 'Open Now' : 'Closed'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">
                    ⏱ {selectedClinic.waitTime}
                  </span>
                  {selectedClinic.rating && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      ⭐ {selectedClinic.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>

      {/* Clinic list */}
      <div className="h-52 overflow-y-auto bg-gray-900 border-t border-gray-800 flex-shrink-0">
        {clinics.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-600 text-sm">
              {isLocating ? 'Finding nearby clinics...' : 'No clinics found nearby'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {clinics.map((clinic) => (
              <button
                key={clinic.id}
                onClick={() => handleClinicClick(clinic)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-800/60 transition-colors flex items-center justify-between gap-3 ${
                  selectedClinic?.id === clinic.id ? 'bg-gray-800' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg flex-shrink-0">
                    {clinic.type === 'hospital' ? '🏥' : '🏥'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-white truncate">{clinic.name}</p>
                    <p className="text-xs text-gray-500 truncate">{clinic.address}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <WaitTimeBadge waitTime={clinic.waitTime} isOpen={clinic.isOpen} size="sm" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
