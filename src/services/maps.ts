export interface ClinicResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  isOpen?: boolean;
  type: 'hospital' | 'clinic';
  waitTime: string;
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

export const searchNearbyClinics = (
  location: { lat: number; lng: number },
  onResult: (clinics: ClinicResult[]) => void,
  onWebsiteFound?: (placeId: string, website: string) => void
): void => {
  const service = new google.maps.places.PlacesService(document.createElement('div'));

  const searches: Array<{ type: google.maps.places.PlaceType; clinicType: 'hospital' | 'clinic' }> = [
    { type: 'hospital' as google.maps.places.PlaceType, clinicType: 'hospital' },
    { type: 'doctor' as google.maps.places.PlaceType, clinicType: 'clinic' },
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
                  : randomFrom(CLINIC_WAIT_RANGES),
              mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
            };
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
