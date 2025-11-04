import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { shipmentAPI } from "../../api/backendAPI";
import { motion } from "framer-motion";

export default function ShipmentForm() {
  const [formData, setFormData] = useState({
    order_city: "",
    order_country: "India",
    customer_city: "",
    customer_country: "India",
    sales_per_customer: 500,
    urgency: "normal",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewRecommendation, setPreviewRecommendation] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const navigate = useNavigate();

  const handlePreview = async () => {
    if (!formData.order_city || !formData.customer_city) {
      alert("Please fill in origin and destination cities");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      // Get AI preview
      const response = await fetch("http://localhost:5000/api/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          order_country: formData.order_country || "India",
          customer_country: formData.customer_country || "India",
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        const bestMode = data.per_mode_analysis?.find(
          (m) => m.mode === data.best_mode_by_score
        );
        
        setPreviewRecommendation({
          mode: data.best_mode_by_score,
          score: data.best_score,
          profit: bestMode?.pred_profit || 0,
          co2: bestMode?.pred_co2 || 0,
          delay: bestMode?.pred_delay || 0,
          allModes: data.per_mode_analysis,
        });
        setShowPreview(true);
      }
    } catch (err) {
      setError("Failed to get AI preview. You can still create the shipment.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await shipmentAPI.create(formData);
      navigate(`/shipments/${response.data.shipment._id}`);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create shipment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Shipment</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origin City
            </label>
            <input
              type="text"
              required
              value={formData.order_city}
              onChange={(e) => setFormData({ ...formData, order_city: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none"
              placeholder="Mumbai"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origin Country
            </label>
            <input
              type="text"
              required
              value={formData.order_country}
              onChange={(e) => setFormData({ ...formData, order_country: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none"
              placeholder="India"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination City
            </label>
            <input
              type="text"
              required
              value={formData.customer_city}
              onChange={(e) => setFormData({ ...formData, customer_city: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none"
              placeholder="Delhi"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination Country
            </label>
            <input
              type="text"
              required
              value={formData.customer_country}
              onChange={(e) => setFormData({ ...formData, customer_country: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none"
              placeholder="India"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sales per Customer (₹)
            </label>
            <input
              type="number"
              min="1"
              value={formData.sales_per_customer}
              onChange={(e) => setFormData({ ...formData, sales_per_customer: +e.target.value || 0 })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency
            </label>
            <select
              value={formData.urgency}
              onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition outline-none"
            rows="3"
            placeholder="Additional notes..."
          />
        </div>

        {/* AI Preview Section */}
        {showPreview && previewRecommendation && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Recommendation Preview</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600">Recommended Mode:</span>
                <p className="text-xl font-bold text-blue-600">{previewRecommendation.mode}</p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Confidence Score:</span>
                <p className="text-xl font-bold text-gray-900">
                  {Math.round(previewRecommendation.score * 100) / 100}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">Expected Profit:</span>
                <p className="text-lg font-semibold text-green-600">
                  ₹{Math.round(previewRecommendation.profit)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-600">CO₂ Emissions:</span>
                <p className="text-lg font-semibold text-red-600">
                  {Math.round(previewRecommendation.co2)} kg
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Hide Preview
            </button>
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loading || !formData.order_city || !formData.customer_city}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🤖 Preview AI Recommendation
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create Shipment"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}

