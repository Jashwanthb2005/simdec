import { useState } from "react";
import LiveWeatherWidget from "./LiveWeatherWidget";
import WeatherDashboard3D from "./WeatherDashboard3D";

// Enhanced weather widget that can switch between simple widget and 3D dashboard
export default function EnhancedWeatherWidget({ city, lat, lon, mode = "dashboard", cities = [] }) {
  const [viewMode, setViewMode] = useState(mode); // "simple" or "dashboard"

  if (viewMode === "dashboard") {
    // Use 3D dashboard - if cities provided, use them; otherwise create from current location
    const dashboardCities = cities.length > 0 
      ? cities 
      : (city && lat && lon ? [{ name: city, lat, lon, country: "India" }] : []);

    return (
      <div className="relative">
        <WeatherDashboard3D cities={dashboardCities} />
        {/* Toggle button */}
        <button
          onClick={() => setViewMode("simple")}
          className="absolute top-4 right-4 z-30 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all"
        >
          Switch to Simple View
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <LiveWeatherWidget city={city} lat={lat} lon={lon} />
      {/* Toggle button */}
      <button
        onClick={() => setViewMode("dashboard")}
        className="absolute top-2 right-2 z-10 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-all shadow-lg"
      >
        3D Dashboard
      </button>
    </div>
  );
}

