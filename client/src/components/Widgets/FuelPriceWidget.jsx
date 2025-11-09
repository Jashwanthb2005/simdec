import { useState, useEffect } from "react";

export default function FuelPriceWidget({ fuelIndex: propFuelIndex }) {
  const [fuelIndex, setFuelIndex] = useState(propFuelIndex || null);
  const [loading, setLoading] = useState(!propFuelIndex);
  const [change, setChange] = useState(0);

  const fetchFuelPrice = async () => {
    try {
      // Try to fetch from backend API first
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/fuel-price`);
        if (response.ok) {
          const data = await response.json();
          if (data.fuelIndex) {
            const previousIndex = fuelIndex || data.fuelIndex;
            setChange(((data.fuelIndex - previousIndex) / previousIndex) * 100);
            setFuelIndex(data.fuelIndex);
            setLoading(false);
            return;
          }
        }
      } catch (apiError) {
        console.warn("Backend fuel API not available, using mock data:", apiError);
      }
      
      // Fallback to mock data for demonstration
      const mockFuelIndex = 1.008 + (Math.random() - 0.5) * 0.1;
      const previousIndex = fuelIndex || mockFuelIndex;
      setChange(((mockFuelIndex - previousIndex) / previousIndex) * 100);
      setFuelIndex(mockFuelIndex);
      
      // Alert on significant surge (>10%)
      if (Math.abs(((mockFuelIndex - previousIndex) / previousIndex) * 100) > 10) {
        console.warn(`Fuel price surge detected: ${Math.round(((mockFuelIndex - previousIndex) / previousIndex) * 100)}%`);
      }
    } catch (error) {
      console.error("Error fetching fuel price:", error);
      // Fallback to default
      setFuelIndex(1.0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // If fuel index is provided as prop, use it
    if (propFuelIndex !== undefined && propFuelIndex !== null) {
      setFuelIndex(propFuelIndex);
      setLoading(false);
      return;
    }
    
    // Otherwise, fetch from API
    fetchFuelPrice();
    // Refresh every hour
    const interval = setInterval(fetchFuelPrice, 3600000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propFuelIndex]);

  if (loading && fuelIndex === null && propFuelIndex === undefined) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-md">
        <div className="text-sm text-gray-600">Loading fuel prices...</div>
      </div>
    );
  }

  // Use prop value, state value, or fallback to 1.0
  const displayIndex = fuelIndex !== null ? fuelIndex : (propFuelIndex !== undefined ? propFuelIndex : 1.0);
  const changePercentage = Math.round(change * 10) / 10;
  const isSurge = changePercentage > 10;
  const isDrop = changePercentage < -10;

  return (
    <div className={`bg-gradient-to-br rounded-lg p-4 shadow-md border ${
      isSurge
        ? "from-red-50 to-orange-50 border-red-200"
        : isDrop
        ? "from-green-50 to-emerald-50 border-green-200"
        : "from-gray-50 to-slate-50 border-gray-200"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-700">⛽ Fuel Index</h3>
        {changePercentage !== 0 && (
          <span className={`text-sm font-bold ${
            isSurge
              ? "text-red-600"
              : isDrop
              ? "text-green-600"
              : "text-gray-600"
          }`}>
            {changePercentage > 0 ? "+" : ""}{changePercentage}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {displayIndex.toFixed(3)}
      </div>
      <div className="text-xs text-gray-600">
        {isSurge && "⚠️ Surge detected - Consider alternative routes"}
        {isDrop && "✅ Price drop - Good time to ship"}
        {!isSurge && !isDrop && "Normal price range"}
      </div>
      {isSurge && (
        <div className="mt-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
          High fuel prices may affect shipping costs
        </div>
      )}
    </div>
  );
}
