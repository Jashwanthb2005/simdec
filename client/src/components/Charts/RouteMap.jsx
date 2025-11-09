import React, { useMemo, useState, useEffect, useCallback } from "react";
import Map, { Marker, Source, Layer } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const defaultCenter = {
  latitude: 20.5937,
  longitude: 78.9629, // India center
};

export default function RouteMap({ origin, destination, orderCity, orderCountry, customerCity, customerCountry, originCoords, destCoords }) {
  const [coords, setCoords] = useState({ origin: originCoords, dest: destCoords });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(null);

  const mapboxApiKey = import.meta.env.VITE_MAPBOX_API_KEY;

  // Free geocoding service (Nominatim - OpenStreetMap) - fallback when Mapbox is not available
  const geocodeWithNominatim = useCallback(async (address) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Logistics-Platform/1.0' // Required by Nominatim
          }
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (err) {
      console.error("Nominatim geocoding error:", err);
    }
    return null;
  }, []);

  // Mapbox geocoding (requires API key)
  const geocodeWithMapbox = useCallback(async (address) => {
    if (!mapboxApiKey) return null;
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${mapboxApiKey}&limit=1`
      );
      const data = await response.json();
      if (data && data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
    } catch (err) {
      console.error("Mapbox geocoding error:", err);
    }
    return null;
  }, [mapboxApiKey]);

  // Fetch route from Mapbox Directions API
  const fetchRoute = useCallback(async (originCoord, destCoord) => {
    if (!mapboxApiKey || !originCoord || !destCoord) return null;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoord.lng},${originCoord.lat};${destCoord.lng},${destCoord.lat}?geometries=geojson&access_token=${mapboxApiKey}`
      );
      const data = await response.json();
      if (data && data.routes && data.routes.length > 0) {
        // Return as GeoJSON Feature for react-map-gl
        return {
          type: 'Feature',
          properties: {},
          geometry: data.routes[0].geometry
        };
      }
    } catch (err) {
      console.error("Mapbox directions error:", err);
    }
    return null;
  }, [mapboxApiKey]);

  // Geocode addresses if coordinates are not provided
  useEffect(() => {
    const fetchCoords = async () => {
      setLoading(true);
      setError(null);
      
      // If coordinates are already provided, use them
      if (originCoords && destCoords && originCoords.lat && destCoords.lat) {
        setCoords({ origin: originCoords, dest: destCoords });
      setLoading(false);
        
        // Fetch route if Mapbox API key is available
        if (mapboxApiKey) {
          const routeGeometry = await fetchRoute(originCoords, destCoords);
          setRoute(routeGeometry);
        }
      return;
    }
    
      // Build addresses
      const originAddress = orderCity && orderCountry 
        ? `${orderCity}, ${orderCountry}` 
        : origin || "Mumbai, India";
      const destAddress = customerCity && customerCountry
        ? `${customerCity}, ${customerCountry}`
        : destination || "Delhi, India";

      try {
        let originCoord = null;
        let destCoord = null;

        // Try Mapbox geocoding first (if API key is available)
        if (mapboxApiKey) {
          try {
            [originCoord, destCoord] = await Promise.all([
              geocodeWithMapbox(originAddress),
              geocodeWithMapbox(destAddress),
            ]);
          } catch (mapboxError) {
            console.warn("Mapbox geocoding failed, trying Nominatim:", mapboxError);
          }
        }

        // Fallback to Nominatim (free, no API key required)
        if (!originCoord || !destCoord) {
          console.log("Using Nominatim for geocoding:", originAddress, destAddress);
          [originCoord, destCoord] = await Promise.all([
            geocodeWithNominatim(originAddress),
            geocodeWithNominatim(destAddress),
          ]);
        }

        if (originCoord && destCoord) {
          setCoords({ origin: originCoord, dest: destCoord });
          
          // Fetch route if Mapbox API key is available
          if (mapboxApiKey) {
            const routeGeometry = await fetchRoute(originCoord, destCoord);
            setRoute(routeGeometry);
          }
        } else {
          setError("Could not geocode addresses. Using default coordinates.");
          // Use default coordinates (Mumbai to Delhi)
          const defaultOrigin = { lat: 19.0760, lng: 72.8777 };
          const defaultDest = { lat: 28.6139, lng: 77.2090 };
          setCoords({ origin: defaultOrigin, dest: defaultDest });
        }
      } catch (err) {
        console.error("Error fetching coordinates:", err);
        setError("Error geocoding addresses. Using default coordinates.");
        const defaultOrigin = { lat: 19.0760, lng: 72.8777 };
        const defaultDest = { lat: 28.6139, lng: 77.2090 };
        setCoords({ origin: defaultOrigin, dest: defaultDest });
      }
      setLoading(false);
  };

    fetchCoords();
  }, [originCoords, destCoords, orderCity, orderCountry, customerCity, customerCountry, origin, destination, mapboxApiKey, geocodeWithMapbox, geocodeWithNominatim, fetchRoute]);

  const mapCenter = useMemo(() => {
    if (coords.origin && coords.dest) {
      return {
        latitude: (coords.origin.lat + coords.dest.lat) / 2,
        longitude: (coords.origin.lng + coords.dest.lng) / 2,
      };
    }
    return defaultCenter;
  }, [coords]);

  // Calculate distance (Haversine formula)
  const calculateDistance = useCallback((coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Route layer style for Mapbox
  const routeLayer = {
    id: 'route',
    type: 'line',
    layout: {
      'line-join': 'round',
      'line-cap': 'round'
    },
    paint: {
      'line-color': '#3b82f6',
      'line-width': 4,
      'line-opacity': 0.75
    }
  };

  // If no API key, show placeholder with route info
  if (!mapboxApiKey) {
    const distance = coords.origin && coords.dest 
      ? Math.round(calculateDistance(coords.origin, coords.dest))
      : null;

    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600 mb-2 text-lg">🗺️ Route Visualization</p>
        <p className="text-sm text-gray-500 mb-4">
          Route: <strong className="text-gray-900">{origin || `${orderCity}, ${orderCountry}`}</strong> → <strong className="text-gray-900">{destination || `${customerCity}, ${customerCountry}`}</strong>
        </p>
        
        {coords.origin && coords.dest && (
          <div className="mt-4 p-4 bg-white rounded border text-left space-y-2">
            <p className="text-xs text-gray-600">
              <strong>Origin Coordinates:</strong> {coords.origin.lat.toFixed(4)}, {coords.origin.lng.toFixed(4)}
            </p>
            <p className="text-xs text-gray-600">
              <strong>Destination Coordinates:</strong> {coords.dest.lat.toFixed(4)}, {coords.dest.lng.toFixed(4)}
            </p>
            {distance && (
              <p className="text-xs text-gray-600 mt-2">
                <strong>Distance:</strong> ~{distance} km (estimated)
              </p>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 rounded border border-yellow-200">
          <p className="text-xs text-yellow-800 mb-2 font-semibold">Map visualization requires Mapbox API key:</p>
          <p className="text-xs text-yellow-700">
            Add <code className="bg-yellow-100 px-2 py-1 rounded font-mono">VITE_MAPBOX_API_KEY=your-key</code> to <code className="bg-yellow-100 px-2 py-1 rounded font-mono">client/.env</code>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            💡 Without API key, coordinates are geocoded using free OpenStreetMap service.
          </p>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-xs text-yellow-800">{error}</p>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  // Render Mapbox map
  return (
    <div className="relative w-full" style={{ height: '400px' }}>
      {error && (
        <div className="absolute top-2 left-2 z-10 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 max-w-md">
          {error}
        </div>
      )}
      <Map
        mapboxAccessToken={mapboxApiKey}
        initialViewState={{
          ...mapCenter,
          zoom: coords.origin && coords.dest ? 6 : 4,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        {/* Route line */}
        {route && (
          <Source id="route" type="geojson" data={route}>
            <Layer {...routeLayer} />
          </Source>
        )}
        
        {/* Origin marker */}
        {coords.origin && (
          <Marker
            longitude={coords.origin.lng}
            latitude={coords.origin.lat}
            anchor="bottom"
          >
            <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg">
              O
            </div>
          </Marker>
        )}
        
        {/* Destination marker */}
        {coords.dest && (
          <Marker
            longitude={coords.dest.lng}
            latitude={coords.dest.lat}
            anchor="bottom"
          >
            <div className="bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg">
              D
            </div>
          </Marker>
        )}
      </Map>
      {!route && coords.origin && coords.dest && (
        <div className="absolute bottom-2 left-2 z-10 p-2 bg-white bg-opacity-90 rounded text-xs text-gray-600">
          Route visualization available with Mapbox API key. Showing markers only.
        </div>
      )}
    </div>
  );
}
