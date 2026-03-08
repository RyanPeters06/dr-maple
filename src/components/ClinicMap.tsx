import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { GoogleMap, useLoadScript, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { searchNearbyClinics, type ClinicResult, type ClinicType } from '../services/maps';
import { WaitTimeBadge } from './WaitTimeBadge';
import { DEFAULT_LOCATION } from '../constants';

const LIBRARIES: ('places')[] = ['places'];

const MAP_STYLES = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const TYPE_LABELS: Record<ClinicType, string> = {
  hospital: 'Emergency room',
  clinic: 'Walk-in clinic',
  specialized: 'Specialty care',
};

type SortOption = 'distance' | 'wait' | 'rating';

/** Haversine distance in km */
function distanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// CPSO — Ontario's official physician register (updated 2024)
const CPSO_REGISTER_URL = 'https://doctors.cpso.on.ca/';
const CPSO_FIND_DOCTOR_URL = 'https://www.cpso.on.ca/Public/Services/Physician-Register/Resources-for-Finding-a-New-Doctor';

export const ClinicMap = () => {
  const [userLocation, setUserLocation] = useState(DEFAULT_LOCATION);
  const [clinics, setClinics] = useState<ClinicResult[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<ClinicResult | null>(null);
  const [expandedClinicId, setExpandedClinicId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<ClinicType[]>(['hospital', 'clinic', 'specialized']);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('distance');
  const [isLocating, setIsLocating] = useState(true);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [fromLabel, setFromLabel] = useState('');
  const [fromLatLng, setFromLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [toLabel, setToLabel] = useState('');
  const [toLatLng, setToLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsError, setDirectionsError] = useState<string | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsLocating(false);
      },
      () => setIsLocating(false)
    );
  }, []);

  useEffect(() => {
    if (!isLoaded || isLocating) return;
    searchNearbyClinics(
      userLocation,
      (results) => setClinics(results),
      (placeId, website) => {
        setClinics(prev =>
          prev.map(c => c.id === placeId ? { ...c, website } : c)
        );
      }
    );
  }, [isLoaded, isLocating, userLocation]);

  // When no type filter selected, show all types (keeps map and list populated, avoids tiny map)
  const effectiveTypeFilter =
    typeFilter.length === 0 ? (['hospital', 'clinic', 'specialized'] as ClinicType[]) : typeFilter;

  const filteredAndSortedClinics = useMemo(() => {
    const filtered = clinics.filter(c => effectiveTypeFilter.includes(c.type));
    const withOpen = openNowOnly ? filtered.filter(c => c.isOpen === true) : filtered;
    const withDistance = withOpen.map(c => ({
      ...c,
      distanceKm: distanceKm(userLocation.lat, userLocation.lng, c.lat, c.lng),
    }));
    const sorted = [...withDistance].sort((a, b) => {
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
      if (sortBy === 'wait') return (a.waitMinutesEst ?? 999) - (b.waitMinutesEst ?? 999);
      if (sortBy === 'rating') {
        const ra = a.rating ?? 0;
        const rb = b.rating ?? 0;
        return rb - ra;
      }
      return 0;
    });
    return sorted;
  }, [clinics, effectiveTypeFilter, openNowOnly, sortBy, userLocation.lat, userLocation.lng]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapInstance(map);
  }, []);

  useEffect(() => {
    if (!isLoaded || !searchInputRef.current || typeof google === 'undefined') return;
    if (autocompleteRef.current) return;
    const bounds = new google.maps.LatLngBounds(
      new google.maps.LatLng(userLocation.lat - 0.1, userLocation.lng - 0.1),
      new google.maps.LatLng(userLocation.lat + 0.1, userLocation.lng + 0.1)
    );
    const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
      types: ['address', 'establishment'],
      fields: ['geometry', 'formatted_address', 'name'],
      bounds,
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const loc = place.geometry?.location;
      const map = mapRef.current;
      if (loc && map) {
        map.panTo({ lat: loc.lat(), lng: loc.lng() });
        map.setZoom(15);
      }
    });
    autocompleteRef.current = autocomplete;
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [isLoaded, userLocation.lat, userLocation.lng]);

  useEffect(() => {
    if (typeof google === 'undefined') return;
    const origin = fromLatLng
      ? `${fromLatLng.lat},${fromLatLng.lng}`
      : (fromLabel && fromLabel.trim()) || null;
    const dest = toLatLng ? `${toLatLng.lat},${toLatLng.lng}` : (toLabel && toLabel.trim()) || null;
    if (!origin || !dest || origin === dest) {
      setDirections(null);
      setDirectionsError(null);
      return;
    }
    const service = new google.maps.DirectionsService();
    service.route(
      { origin, destination: dest, travelMode: google.maps.TravelMode.DRIVING },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          setDirectionsError(null);
        } else {
          setDirections(null);
          setDirectionsError('Could not get directions.');
        }
      }
    );
  }, [fromLatLng, fromLabel, toLatLng, toLabel]);

  const toggleTypeFilter = (t: ClinicType) => {
    setTypeFilter(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  };

  const handleClinicClick = (clinic: ClinicResult) => {
    setSelectedClinic(clinic);
    setExpandedClinicId(prev => (prev === clinic.id ? null : clinic.id));
    setToLabel(clinic.name);
    setToLatLng({ lat: clinic.lat, lng: clinic.lng });
    if (mapInstance) {
      mapInstance.panTo({ lat: clinic.lat, lng: clinic.lng });
      mapInstance.setZoom(15);
    }
  };

  const showDoctorsSection = (clinic: ClinicResult) =>
    clinic.type === 'hospital';

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] text-gray-400 p-8 text-center">
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
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden">
      {/* Map — fills available height, not scrollable; min height so it stays large when list is empty */}
      <div className="flex-1 min-w-0 min-h-0 min-h-[60vh] overflow-hidden flex flex-col">
        {/* Search + From / To — compact single bar */}
        <div className="flex-shrink-0 px-3 py-2 bg-white border-b border-rose-100 flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-gray-500 mb-0.5">Search</label>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Address or place..."
              defaultValue=""
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm placeholder:text-gray-400 focus:ring-1 focus:ring-rose-300 focus:border-rose-300"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-0.5">From</label>
            <input
              type="text"
              placeholder="Start address"
              value={fromLabel}
              onChange={(e) => {
                setFromLabel(e.target.value);
                setFromLatLng(null);
              }}
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm placeholder:text-gray-400 focus:ring-1 focus:ring-rose-300 focus:border-rose-300"
            />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-0.5">To</label>
            <input
              type="text"
              placeholder="Destination"
              value={toLabel}
              onChange={(e) => {
                setToLabel(e.target.value);
                setToLatLng(null);
              }}
              className="w-full rounded border border-gray-200 px-2 py-1.5 text-sm placeholder:text-gray-400 focus:ring-1 focus:ring-rose-300 focus:border-rose-300"
            />
          </div>
          {directionsError && (
            <p className="text-xs text-red-500 w-full">{directionsError}</p>
          )}
        </div>
        <div className="flex-1 min-h-0 relative flex flex-col min-h-[50vh]">
        <GoogleMap
          zoom={13}
          center={userLocation}
          mapContainerStyle={{ width: '100%', height: '100%' }}
          options={{ styles: MAP_STYLES, disableDefaultUI: false, zoomControl: true }}
          onLoad={onMapLoad}
        >
          {directions && <DirectionsRenderer directions={directions} />}
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

          {filteredAndSortedClinics.map((clinic) => (
            <Marker
              key={clinic.id}
              position={{ lat: clinic.lat, lng: clinic.lng }}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="14" fill="${clinic.type === 'hospital' ? '#ef4444' : clinic.type === 'specialized' ? '#8b5cf6' : '#0d9488'}" stroke="white" stroke-width="2"/>
                    <text x="16" y="21" text-anchor="middle" font-size="14" fill="white">${clinic.type === 'hospital' ? '🏥' : clinic.type === 'specialized' ? '◆' : '+'}</text>
                  </svg>`
                )}`,
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16),
              }}
              onClick={() => handleClinicClick(clinic)}
              title=""
            />
          ))}
        </GoogleMap>
        </div>
      </div>

      {/* Right sidebar — scrollable list of nearby hospitals & clinics */}
      <aside className="w-[340px] flex-shrink-0 flex flex-col bg-white border-l border-rose-100 self-stretch overflow-hidden" style={{ maxHeight: '100%' }}>
        <div className="flex-shrink-0 p-3 border-b border-rose-100 space-y-2">
          <h2 className="font-bold text-gray-800 text-sm">Nearby hospitals & clinics</h2>
          <p className="text-xs text-gray-400">
            {isLocating ? 'Locating you...' : `${filteredAndSortedClinics.length} of ${clinics.length} locations`}
          </p>

          {/* Type filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {(['clinic', 'hospital', 'specialized'] as ClinicType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleTypeFilter(t)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  effectiveTypeFilter.includes(t)
                    ? t === 'hospital'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : t === 'specialized'
                      ? 'bg-violet-50 text-violet-700 border-violet-200'
                      : 'bg-teal-50 text-teal-700 border-teal-200'
                    : 'bg-gray-50 text-gray-400 border-gray-200'
                }`}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Open now + Sort — one line */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={openNowOnly}
                onChange={(e) => setOpenNowOnly(e.target.checked)}
                className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs text-gray-600">Open now</span>
            </label>
            <span className="text-gray-300">·</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="text-xs border border-rose-100 rounded px-2 py-1 bg-white text-gray-700"
            >
              <option value="distance">Distance</option>
              <option value="wait">Shortest wait</option>
              <option value="rating">Highest rated</option>
            </select>
          </div>
        </div>

        {selectedClinic && (
          <div className="flex-shrink-0 p-3 bg-rose-50 border-b border-rose-200">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{selectedClinic.name}</p>
                <p className="text-xs text-gray-500 truncate">{selectedClinic.address}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">{selectedClinic.waitTime}</span>
                  {selectedClinic.isOpen !== undefined && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${selectedClinic.isOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {selectedClinic.isOpen ? 'Open' : 'Closed'}
                    </span>
                  )}
                </div>
              </div>
              <a
                href={selectedClinic.website ?? selectedClinic.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 underline flex-shrink-0"
              >
                {selectedClinic.website ? 'Website' : 'Maps'}
              </a>
            </div>
          </div>
        )}

        {/* Scrollable list — fixed max height so it always scrolls when content overflows */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain" style={{ maxHeight: 'calc(100vh - 240px)' }}>
          {filteredAndSortedClinics.length === 0 ? (
            <div className="flex items-center justify-center p-8 text-center">
              <p className="text-gray-400 text-sm">
                {isLocating ? 'Finding nearby locations...' : 'No locations match your filters. Try changing type or turn off "Open now".'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-rose-50">
              {filteredAndSortedClinics.map((clinic) => (
                <div
                  key={clinic.id}
                  className={`${selectedClinic?.id === clinic.id ? 'bg-rose-50/80' : ''}`}
                >
                  <div
                    className={`px-4 py-3 flex items-center justify-between gap-3 hover:bg-rose-50/50 transition-colors cursor-pointer`}
                  >
                    <button
                      onClick={() => handleClinicClick(clinic)}
                      className="flex items-center gap-3 min-w-0 text-left flex-1"
                    >
                      <span className="text-lg flex-shrink-0">
                        {clinic.type === 'hospital' ? '🏥' : clinic.type === 'specialized' ? '◆' : '🏥'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-800 truncate">{clinic.name}</p>
                        <p className="text-xs text-gray-500 truncate">{clinic.address}</p>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          {TYPE_LABELS[clinic.type]}
                        </span>
                      </div>
                      {showDoctorsSection(clinic) && (
                        <span className="text-gray-400 text-xs flex-shrink-0" title="Click for doctor links">
                          {expandedClinicId === clinic.id ? '▼' : '▶'}
                        </span>
                      )}
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <WaitTimeBadge waitTime={clinic.waitTime} isOpen={clinic.isOpen} size="sm" />
                      <a
                        href={clinic.website ?? clinic.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs font-medium text-rose-600 hover:text-rose-800 border border-rose-200 hover:border-rose-400 bg-white hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                      >
                        {clinic.website ? 'Book' : 'Maps'}
                      </a>
                    </div>
                  </div>

                  {/* Find doctors — only for hospitals; links open in new tab */}
                  {expandedClinicId === clinic.id && showDoctorsSection(clinic) && (
                    <div className="px-4 pb-4 pt-2 bg-rose-50/70 border-t border-rose-200">
                      <h4 className="text-sm font-bold text-gray-800 mb-2">
                        Find a doctor at this hospital
                      </h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Official registers to find verified, licensed physicians.
                      </p>
                      <ul className="space-y-3">
                        <li>
                          <a
                            href={CPSO_REGISTER_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-rose-900 bg-white border-2 border-rose-200 hover:border-rose-400 rounded-lg px-3 py-2 w-full text-left transition-colors"
                          >
                            Search CPSO Physician Register →
                          </a>
                          <p className="text-xs text-gray-500 mt-1 ml-0">
                            Search by location and specialty (doctors.cpso.on.ca)
                          </p>
                        </li>
                        <li>
                          <a
                            href={CPSO_FIND_DOCTOR_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-rose-900 bg-white border-2 border-rose-200 hover:border-rose-400 rounded-lg px-3 py-2 w-full text-left transition-colors"
                          >
                            Finding a doctor (Health811, Health Care Connect) →
                          </a>
                          <p className="text-xs text-gray-500 mt-1 ml-0">
                            Programs that help you find a doctor accepting patients
                          </p>
                        </li>
                        {clinic.website && (
                          <li>
                            <a
                              href={clinic.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-rose-900 bg-white border-2 border-rose-200 hover:border-rose-400 rounded-lg px-3 py-2 w-full text-left transition-colors"
                            >
                              Hospital website →
                            </a>
                            <p className="text-xs text-gray-500 mt-1 ml-0">
                              Staff directories and contacts
                            </p>
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
