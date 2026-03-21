export const geocodeAddress = async (address: string): Promise<[number, number] | null> => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    const data = await response.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  return null;
};

export const getRoute = async (start: [number, number], end: [number, number]): Promise<[number, number][] | null> => {
  try {
    // OSRM expects coordinates in lon,lat format
    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`);
    const data = await response.json();
    
    if (data.routes && data.routes.length > 0) {
      // OSRM returns coordinates as [lon, lat], Leaflet wants [lat, lon]
      const coords = data.routes[0].geometry.coordinates;
      return coords.map((c: [number, number]) => [c[1], c[0]]);
    }
  } catch (error) {
    console.error('Routing error:', error);
  }
  return null;
};
