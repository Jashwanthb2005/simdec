import { useState } from "react";
import { inferenceAPI } from "../../api/backendAPI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { motion } from "framer-motion";

export default function ShipmentSimulator({ initialData }) {
  const [formData, setFormData] = useState({
    order_city: initialData?.order_city || "",
    order_country: initialData?.order_country || "India",
    customer_city: initialData?.customer_city || "",
    customer_country: initialData?.customer_country || "India",
    sales_per_customer: initialData?.sales_per_customer || 500,
  });

  const [simulationParams, setSimulationParams] = useState({
    fuelAdjustment: 0, // -50% to +50%
    weatherAdjustment: 0, // -50% to +50%
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState([]);

  const runSimulation = async () => {
    if (!formData.order_city || !formData.customer_city) {
      alert("Please fill in origin and destination cities");
      return;
    }

    setLoading(true);
    try {
      // For simulation, we adjust the features before sending to AI
      // In a real implementation, you'd pass these adjustments to the model
      const response = await inferenceAPI.predict({
        ...formData,
        order_country: formData.order_country || "India",
        customer_country: formData.customer_country || "India",
        fuel_adjustment: simulationParams.fuelAdjustment,
        weather_adjustment: simulationParams.weatherAdjustment,
      });

      const scenarioResult = {
        ...response.data,
        params: { ...simulationParams },
        timestamp: new Date(),
      };

      setResults(scenarioResult);
      setScenarios([...scenarios, scenarioResult]);
    } catch (error) {
      console.error("Simulation error:", error);
      alert("Simulation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const clearScenarios = () => {
    setScenarios([]);
    setResults(null);
  };

  const compareScenarios = () => {
    if (scenarios.length < 2) {
      alert("Please run at least 2 scenarios to compare");
      return;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🔮 What-If Scenario Simulator</h3>
        <p className="text-gray-600 mb-6">
          Adjust fuel prices and weather conditions to see how they affect AI recommendations.
        </p>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Origin City
            </label>
            <input
              type="text"
              value={formData.order_city}
              onChange={(e) => setFormData({ ...formData, order_city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Mumbai"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination City
            </label>
            <input
              type="text"
              value={formData.customer_city}
              onChange={(e) => setFormData({ ...formData, customer_city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Delhi"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuel Price Adjustment: {simulationParams.fuelAdjustment}%
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={simulationParams.fuelAdjustment}
              onChange={(e) =>
                setSimulationParams({
                  ...simulationParams,
                  fuelAdjustment: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weather Adjustment: {simulationParams.weatherAdjustment}%
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              value={simulationParams.weatherAdjustment}
              onChange={(e) =>
                setSimulationParams({
                  ...simulationParams,
                  weatherAdjustment: parseInt(e.target.value),
                })
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>-50%</span>
              <span>0%</span>
              <span>+50%</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={runSimulation}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Simulation"}
          </button>
          {scenarios.length > 0 && (
            <>
              <button
                onClick={compareScenarios}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold"
              >
                Compare Scenarios
              </button>
              <button
                onClick={clearScenarios}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4">Simulation Results</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Recommended Mode</div>
              <div className="text-2xl font-bold text-blue-600">
                {results.best_mode_by_score || "N/A"}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Confidence Score</div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((results.best_score || 0) * 100) / 100}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Scenario Parameters</div>
              <div className="text-sm font-semibold text-purple-600">
                Fuel: {simulationParams.fuelAdjustment}% | Weather: {simulationParams.weatherAdjustment}%
              </div>
            </div>
          </div>

          {results.per_mode_analysis && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Mode Comparison</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={results.per_mode_analysis}>
                  <XAxis dataKey="mode" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pred_profit" fill="#10b981" name="Profit (₹)" />
                  <Bar dataKey="pred_co2" fill="#ef4444" name="CO₂ (kg)" />
                  <Bar dataKey="pred_delay" fill="#3b82f6" name="Delay (days)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}

      {scenarios.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-xl font-bold text-gray-900 mb-4">Scenario Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Scenario</th>
                  <th className="px-4 py-2 text-left">Fuel Adj.</th>
                  <th className="px-4 py-2 text-left">Weather Adj.</th>
                  <th className="px-4 py-2 text-left">Best Mode</th>
                  <th className="px-4 py-2 text-left">Score</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-4 py-2">#{idx + 1}</td>
                    <td className="px-4 py-2">{scenario.params.fuelAdjustment}%</td>
                    <td className="px-4 py-2">{scenario.params.weatherAdjustment}%</td>
                    <td className="px-4 py-2 font-semibold">
                      {scenario.best_mode_by_score}
                    </td>
                    <td className="px-4 py-2">
                      {Math.round((scenario.best_score || 0) * 100) / 100}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}


