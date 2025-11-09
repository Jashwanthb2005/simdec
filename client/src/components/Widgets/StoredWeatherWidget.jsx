// Widget to display stored weather data (from shipment creation time)
// This avoids live API calls and rate limiting issues

import { motion } from "framer-motion";

export default function StoredWeatherWidget({ 
  weather, 
  city, 
  fetchedAt 
}) {
  if (!weather) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md">
        <p className="text-gray-500 text-sm">Weather data not available</p>
      </div>
    );
  }

  // Map weather code to description and icon
  const getWeatherInfo = (code) => {
    // WMO Weather interpretation codes (WW)
    // Simplified mapping for common codes
    if (code === 0) return { icon: "☀️", desc: "Clear sky" };
    if (code <= 3) return { icon: "🌤️", desc: "Partly cloudy" };
    if (code <= 48) return { icon: "☁️", desc: "Cloudy" };
    if (code <= 67) return { icon: "🌧️", desc: "Rain" };
    if (code <= 77) return { icon: "❄️", desc: "Snow" };
    if (code <= 82) return { icon: "🌧️", desc: "Rain showers" };
    if (code <= 86) return { icon: "❄️", desc: "Snow showers" };
    if (code <= 99) return { icon: "⛈️", desc: "Thunderstorm" };
    return { icon: "🌫️", desc: "Unknown" };
  };

  const weatherInfo = getWeatherInfo(weather.weatherCode);
  const temp = weather.temperature || 0;
  const humidity = weather.humidity || 0;
  const windspeed = weather.windspeed || 0;

  // Format fetched date
  const fetchedDate = fetchedAt ? new Date(fetchedAt) : null;
  const dateStr = fetchedDate 
    ? fetchedDate.toLocaleDateString() + " " + fetchedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : "At shipment creation";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 shadow-md border border-blue-100"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{city}</h3>
          <p className="text-xs text-gray-500 mt-1">Weather at shipment creation</p>
        </div>
        <div className="text-3xl">{weatherInfo.icon}</div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Temperature</span>
          <span className="font-bold text-lg text-gray-900">{temp.toFixed(1)}°C</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Condition</span>
          <span className="text-sm font-medium text-gray-700">{weatherInfo.desc}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Humidity</span>
          <span className="text-sm font-medium text-gray-700">{humidity.toFixed(0)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Wind Speed</span>
          <span className="text-sm font-medium text-gray-700">{windspeed.toFixed(1)} km/h</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-blue-200">
        <p className="text-xs text-gray-500">Fetched: {dateStr}</p>
      </div>
    </motion.div>
  );
}

