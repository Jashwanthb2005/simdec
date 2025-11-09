import { useState, useEffect } from "react";

export default function LiveWeatherWidget({ city, lat, lon }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWeatherData = async () => {
      setLoading(true);
      setError(null);
      
      let latitude = lat;
      let longitude = lon;
      
      // If coordinates are not provided, try to geocode the city name
      if ((!latitude || latitude === 0) && (!longitude || longitude === 0)) {
        if (city) {
          try {
            const coords = await geocodeCity(city);
            if (coords) {
              latitude = coords.lat;
              longitude = coords.lon;
            } else {
              // Use default coordinates (India center) if geocoding fails
              latitude = 20.5937;
              longitude = 78.9629;
            }
          } catch (err) {
            console.error("Geocoding error:", err);
            // Use default coordinates
            latitude = 20.5937;
            longitude = 78.9629;
          }
        } else {
          // No city or coordinates, use default
          latitude = 20.5937;
          longitude = 78.9629;
        }
      }
      
      if (latitude && longitude) {
        await fetchWeather(latitude, longitude);
      } else {
        setError("Unable to determine location");
        setLoading(false);
      }
    };

    fetchWeatherData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchWeatherData, 300000);
    return () => clearInterval(interval);
  }, [lat, lon, city]);

  const geocodeCity = async (cityName) => {
    try {
      // Use Nominatim (OpenStreetMap) for free geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`,
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
          lon: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    return null;
  };

  const fetchWeather = async (latitude, longitude) => {
    try {
      // Using Open-Meteo API (free, no key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,windspeed_10m&timezone=auto`
      );
      const data = await response.json();
      if (data && data.current) {
        setWeather(data.current);
        setError(null);
      } else {
        setError("Invalid weather data received");
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
      setError("Failed to fetch weather data");
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (code) => {
    // Weather code mapping (WMO codes)
    if (code === 0) return "☀️"; // Clear
    if (code <= 3) return "🌤️"; // Partly cloudy
    if (code <= 49) return "🌫️"; // Fog
    if (code <= 59) return "🌦️"; // Drizzle
    if (code <= 69) return "🌧️"; // Rain
    if (code <= 79) return "🌨️"; // Snow
    if (code <= 84) return "🌨️"; // Snow showers
    if (code <= 86) return "🌨️"; // Snow showers
    return "⛈️"; // Thunderstorm
  };

  const getWeatherScore = (code) => {
    // Higher score = better weather for shipping
    if (code === 0) return 1.0; // Clear
    if (code <= 3) return 0.9; // Partly cloudy
    if (code <= 49) return 0.7; // Fog
    if (code <= 59) return 0.6; // Drizzle
    if (code <= 69) return 0.4; // Rain
    if (code <= 79) return 0.3; // Snow
    return 0.2; // Severe weather
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md">
        <div className="text-sm text-gray-600">Loading weather...</div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md border border-red-200">
        <div className="text-sm text-red-600">
          {error || "Unable to load weather data"}
        </div>
        {city && (
          <div className="text-xs text-gray-500 mt-1">
            Location: {city}
          </div>
        )}
      </div>
    );
  }

  const weatherScore = getWeatherScore(weather.weather_code);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 shadow-md border border-blue-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">🌤️ Weather</h3>
        <span className="text-2xl">{getWeatherIcon(weather.weather_code)}</span>
      </div>
      <div className="text-lg font-bold text-gray-900">
        {weather.temperature_2m}°C
      </div>
      {weather.windspeed_10m && (
        <div className="text-xs text-gray-600 mt-1">
          Wind: {weather.windspeed_10m} km/h
        </div>
      )}
      <div className="text-xs text-gray-600 mt-1">
        {city || "Location"}
      </div>
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Shipping Score</span>
          <span className="font-semibold">
            {Math.round(weatherScore * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              weatherScore > 0.7
                ? "bg-green-500"
                : weatherScore > 0.4
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
            style={{ width: `${weatherScore * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
