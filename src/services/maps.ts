export type ClinicType = 'hospital' | 'clinic' | 'specialized';

export interface ClinicResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  isOpen?: boolean;
  type: ClinicType;
  waitTime: string;
  /** Approximate wait in minutes for sorting (e.g. 15 for "10–20 min", 90 for "1–2 hrs") */
  waitMinutesEst?: number;
  phone?: string;
  website?: string;
  mapsUrl: string;
}

const HOSPITAL_WAIT_RANGES = [
  '1–2 hrs', '2–3 hrs', '3–5 hrs', '4–6 hrs', '1.5–2.5 hrs',
];
const CLINIC_WAIT_RANGES = [
  '10–20 min', '20–35 min', '30–45 min', '45–60 min', '15–25 min',
];

const randomFrom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

/** Parse wait time string to approximate minutes for sorting */
function waitToMinutes(s: string): number {
  const hr = s.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+)\s*hr/i) || s.match(/(\d+(?:\.\d+)?)\s*hr/i);
  if (hr) {
    const a = parseFloat(hr[1]);
    const b = hr[2] ? parseFloat(hr[2]) : a;
    return Math.round((a + b) / 2 * 60);
  }
  const min = s.match(/(\d+)\s*[-–]\s*(\d+)\s*min/i) || s.match(/(\d+)\s*min/i);
  if (min) {
    const a = parseInt(min[1], 10);
    const b = min[2] ? parseInt(min[2], 10) : a;
    return Math.round((a + b) / 2);
  }
  return 999;
}

export const searchNearbyClinics = (
  location: { lat: number; lng: number },
  onResult: (clinics: ClinicResult[]) => void,
  onWebsiteFound?: (placeId: string, website: string) => void
): void => {
  const service = new google.maps.places.PlacesService(document.createElement('div'));

  const searches: Array<{ type: google.maps.places.PlaceType; clinicType: ClinicType }> = [
    { type: 'hospital' as google.maps.places.PlaceType, clinicType: 'hospital' },
    { type: 'doctor' as google.maps.places.PlaceType, clinicType: 'clinic' },
    { type: 'physiotherapist' as google.maps.places.PlaceType, clinicType: 'specialized' },
  ];

  const SPECIALIZED_WAIT_RANGES = [
    '15–30 min', '30–45 min', '1–2 weeks', '2–3 weeks', 'Same day',
  ];

  const results: ClinicResult[] = [];
  let completed = 0;

  searches.forEach(({ type, clinicType }) => {
    service.nearbySearch(
      {
        location: new google.maps.LatLng(location.lat, location.lng),
        radius: 8000,
        type,
      },
      (places, status) => {
        completed++;
        if (status === google.maps.places.PlacesServiceStatus.OK && places) {
          const mapped = places.slice(0, 8).map((p): ClinicResult => {
            const placeId = p.place_id ?? `${Date.now()}-${Math.random()}`;
            return {
              id: placeId,
              name: p.name ?? 'Unknown',
              address: p.vicinity ?? '',
              lat: p.geometry?.location?.lat() ?? location.lat,
              lng: p.geometry?.location?.lng() ?? location.lng,
              rating: p.rating,
              isOpen: p.opening_hours?.isOpen(),
              type: clinicType,
              waitTime:
                clinicType === 'hospital'
                  ? randomFrom(HOSPITAL_WAIT_RANGES)
                  : clinicType === 'specialized'
                  ? randomFrom(SPECIALIZED_WAIT_RANGES)
                  : randomFrom(CLINIC_WAIT_RANGES),
              waitMinutesEst: 0, // set below
              mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
            };
          });
          mapped.forEach(m => {
            (m as ClinicResult).waitMinutesEst = waitToMinutes(m.waitTime);
          });
          results.push(...mapped);
        }

        if (completed === searches.length) {
          results.sort((a, b) => {
            if (a.isOpen && !b.isOpen) return -1;
            if (!a.isOpen && b.isOpen) return 1;
            return 0;
          });
          onResult(results);

          // Fetch websites in the background after clinics are displayed
          if (onWebsiteFound) {
            results.forEach(clinic => {
              service.getDetails(
                { placeId: clinic.id, fields: ['website'] },
                (place, detailStatus) => {
                  if (
                    detailStatus === google.maps.places.PlacesServiceStatus.OK &&
                    place?.website
                  ) {
                    onWebsiteFound(clinic.id, place.website);
                  }
                }
              );
            });
          }
        }
      }
    );
  });
};
