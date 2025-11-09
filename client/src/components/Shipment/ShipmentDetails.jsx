import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { shipmentAPI } from "../../api/backendAPI";
import { useAuth } from "../../context/AuthContext";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import ShipmentSimulator from "./ShipmentSimulator";
import RouteMap from "../Charts/RouteMap";
import GlobeRouteMap from "../Charts/GlobeRouteMap";
import LiveWeatherWidget from "../Widgets/LiveWeatherWidget";
import StoredWeatherWidget from "../Widgets/StoredWeatherWidget";
import WeatherDashboard3D from "../Widgets/WeatherDashboard3D";
import FuelPriceWidget from "../Widgets/FuelPriceWidget";

export default function ShipmentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shipment, setShipment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ text: "", rating: 5 });
  const [submitting, setSubmitting] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideMode, setOverrideMode] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  useEffect(() => {
    loadShipment();
  }, [id]);

  const loadShipment = async () => {
    try {
      const response = await shipmentAPI.getById(id);
      setShipment(response.data.shipment);
    } catch (error) {
      console.error("Error loading shipment:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await shipmentAPI.approve(id);
      loadShipment();
      alert("Shipment approved successfully!");
    } catch (error) {
      console.error("Error approving shipment:", error);
      alert("Failed to approve shipment");
    }
  };

  const handleApproveWithOverride = async () => {
    if (!overrideMode) {
      alert("Please select a shipping mode");
      return;
    }
    
    try {
      await shipmentAPI.approve(id, { overrideMode, overrideReason });
      setShowOverrideModal(false);
      setOverrideMode("");
      setOverrideReason("");
      loadShipment();
      alert("Shipment approved with override!");
    } catch (error) {
      console.error("Error approving with override:", error);
      alert("Failed to approve shipment");
    }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await shipmentAPI.addFeedback(id, feedback);
      setFeedback({ text: "", rating: 5 });
      loadShipment();
      alert("Feedback submitted successfully!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!shipment) {
    return <div className="text-center py-12">Shipment not found</div>;
  }

  const chartData = shipment.aiRecommendation?.allModes?.map((mode) => ({
    mode: mode.mode,
    profit: Math.round(mode.pred_profit),
    delay: Math.round(mode.pred_delay * 10) / 10,
    co2: Math.round(mode.pred_co2),
    score: Math.round(mode.score * 100) / 100,
  })) || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <button
            onClick={() => navigate("/shipments")}
            className="text-gray-600 hover:text-gray-900 mb-2"
          >
            ← Back to Shipments
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Shipment Details</h1>
        </div>
        {(user?.role === "manager" || user?.role === "admin") && shipment.status === "pending" && (
          <div className="flex gap-3">
            <button
              onClick={handleApprove}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
            >
              ✓ Approve AI Recommendation
            </button>
            <button
              onClick={() => setShowOverrideModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg"
            >
              🔄 Override AI Recommendation
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Information</h3>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-gray-600">Origin:</span>
              <p className="font-medium">{shipment.origin}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Destination:</span>
              <p className="font-medium">{shipment.destination}</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Distance:</span>
              <p className="font-medium">{Math.round(shipment.distance || 0)} km</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Sales:</span>
              <p className="font-medium">₹{shipment.sales}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 shadow-lg text-white"
        >
          <h3 className="text-lg font-semibold mb-4">AI Recommendation</h3>
          <div className="space-y-2">
            <div>
              <span className="text-blue-200">Best Mode:</span>
              <p className="text-2xl font-bold">{shipment.aiRecommendation?.mode || "N/A"}</p>
            </div>
            <div>
              <span className="text-blue-200">Score:</span>
              <p className="text-xl font-semibold">
                {Math.round((shipment.aiRecommendation?.score || 0) * 100) / 100}
              </p>
            </div>
            <div>
              <span className="text-blue-200">Policy Choice:</span>
              <p className="font-medium">{shipment.aiRecommendation?.actorPolicyChoice || "N/A"}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 shadow-lg"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Predictions</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-600">Profit:</span>
              <p className="text-xl font-bold text-green-600">
                ₹{Math.round(shipment.aiRecommendation?.profit || 0)}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Delay:</span>
              <p className="text-xl font-bold text-blue-600">
                {Math.round((shipment.aiRecommendation?.delay || 0) * 10) / 10} days
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-600">CO₂:</span>
              <p className="text-xl font-bold text-red-600">
                {Math.round(shipment.aiRecommendation?.co2 || 0)} kg
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Weather Data - Use stored weather data from shipment creation */}
      {shipment.weatherData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🌤️ Weather at Shipment Creation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Origin Weather */}
            {shipment.weatherData.origin && (
              <StoredWeatherWidget
                weather={shipment.weatherData.origin}
                city={`${shipment.order_city || shipment.origin?.split(',')[0]?.trim() || "Origin"}, ${shipment.order_country || ""}`}
                fetchedAt={shipment.weatherData.fetchedAt}
              />
            )}
            
            {/* Destination Weather */}
            {shipment.weatherData.destination && (
              <StoredWeatherWidget
                weather={shipment.weatherData.destination}
                city={`${shipment.customer_city || shipment.destination?.split(',')[0]?.trim() || "Destination"}, ${shipment.customer_country || ""}`}
                fetchedAt={shipment.weatherData.fetchedAt}
              />
            )}
          </div>
          
          {/* Show note if weather data is missing */}
          {(!shipment.weatherData.origin || !shipment.weatherData.destination) && (
            <p className="text-sm text-gray-500 mt-2">
              {!shipment.weatherData.origin && !shipment.weatherData.destination 
                ? "Weather data was not available at shipment creation time."
                : "Partial weather data available (one city may be missing)."}
            </p>
          )}
        </motion.div>
      )}

      {/* Fallback: Show live weather if stored data is not available */}
      {!shipment.weatherData && shipment.order_city && shipment.customer_city && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <p className="text-sm text-gray-500 mb-4">
            ⚠️ Weather data was not stored at shipment creation. Showing live weather (may be rate limited).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LiveWeatherWidget
              city={
                shipment.order_city 
                  ? `${shipment.order_city}${shipment.order_country ? `, ${shipment.order_country}` : ''}`
                  : (shipment.origin ? shipment.origin.split(',')[0].trim() : null)
              }
              lat={shipment.latitude || shipment.originCoords?.lat}
              lon={shipment.longitude || shipment.originCoords?.lng}
            />
            <LiveWeatherWidget
              city={
                shipment.customer_city 
                  ? `${shipment.customer_city}${shipment.customer_country ? `, ${shipment.customer_country}` : ''}`
                  : (shipment.destination ? shipment.destination.split(',')[0].trim() : null)
              }
              lat={shipment.destCoords?.lat}
              lon={shipment.destCoords?.lng}
            />
          </div>
        </motion.div>
      )}

      {/* Fuel Price Widget */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <FuelPriceWidget 
          fuelIndex={shipment.fuelIndex || shipment.aiRecommendation?.liveFeatures?.fi} 
        />
      </div>

      {/* Route Map - 3D Globe Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gray-900 rounded-xl p-6 shadow-lg mb-8"
      >
        <h3 className="text-lg font-semibold text-white mb-4">🌍 Global Route Visualization</h3>
        <GlobeRouteMap
          origin={shipment.origin}
          destination={shipment.destination}
          orderCity={shipment.order_city}
          orderCountry={shipment.order_country}
          customerCity={shipment.customer_city}
          customerCountry={shipment.customer_country}
          originCoords={shipment.originCoords}
          destCoords={shipment.destCoords}
        />
      </motion.div>
      
      {/* Alternative: 2D Map View (commented out, uncomment if needed) */}
      {/* <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl p-6 shadow-lg mb-8"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">2D Map View</h3>
        <RouteMap
          origin={shipment.origin}
          destination={shipment.destination}
          orderCity={shipment.order_city}
          orderCountry={shipment.order_country}
          customerCity={shipment.customer_city}
          customerCountry={shipment.customer_country}
          originCoords={shipment.originCoords}
          destCoords={shipment.destCoords}
        />
      </motion.div> */}

      {chartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-lg mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Mode Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis dataKey="mode" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="profit" fill="#10b981" name="Profit (₹)" />
              <Bar dataKey="delay" fill="#3b82f6" name="Delay (days)" />
              <Bar dataKey="co2" fill="#ef4444" name="CO₂ (kg)" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* What-If Simulator */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8"
      >
        <ShipmentSimulator
          initialData={{
            order_city: shipment.order_city,
            order_country: shipment.order_country,
            customer_city: shipment.customer_city,
            customer_country: shipment.customer_country,
            sales_per_customer: shipment.sales,
          }}
        />
      </motion.div>

      <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Feedback</h3>
        <form onSubmit={handleFeedback} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <select
              value={feedback.rating}
              onChange={(e) => setFeedback({ ...feedback, rating: +e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value={5}>5 - Excellent</option>
              <option value={4}>4 - Good</option>
              <option value={3}>3 - Average</option>
              <option value={2}>2 - Poor</option>
              <option value={1}>1 - Very Poor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
            <textarea
              value={feedback.text}
              onChange={(e) => setFeedback({ ...feedback, text: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows="3"
              placeholder="Was the AI recommendation accurate?"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </form>
      </div>

      {/* Override Modal for Manager */}
      {showOverrideModal && user?.role === "manager" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Override AI Recommendation</h3>
            <p className="text-gray-600 mb-6">
              Current AI Recommendation: <strong>{shipment.aiRecommendation?.mode}</strong>
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Shipping Mode
                </label>
                <select
                  value={overrideMode}
                  onChange={(e) => setOverrideMode(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition outline-none"
                >
                  <option value="">Select a mode...</option>
                  {shipment.aiRecommendation?.allModes?.map((mode) => (
                    <option key={mode.mode} value={mode.mode}>
                      {mode.mode} - Profit: ₹{Math.round(mode.pred_profit)} | CO₂: {Math.round(mode.pred_co2)}kg
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Override
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition outline-none"
                  rows="3"
                  placeholder="Explain why you're overriding the AI recommendation..."
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleApproveWithOverride}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                  Approve with Override
                </button>
                <button
                  onClick={() => {
                    setShowOverrideModal(false);
                    setOverrideMode("");
                    setOverrideReason("");
                  }}
                  className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

