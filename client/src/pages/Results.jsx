import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { motion } from "framer-motion";

export default function Results({ result, onReset }) {
  const navigate = useNavigate();
  
  if (!result) return null;

  const barData = result.per_mode_analysis.map(mode => ({
    mode: mode.mode,
    profit: Math.round(mode.pred_profit),
    delay: Math.round(mode.pred_delay * 10) / 10,
    co2: Math.round(mode.pred_co2),
    score: Math.round(mode.score * 100) / 100
  }));

  const pieData = [
    { name: "Profit", value: result.best_score },
    { name: "Delay Impact", value: 1 - result.best_score },
  ];

  const radarData = result.per_mode_analysis.map(mode => ({
    mode: mode.mode,
    profit: (mode.pred_profit / 100) * 100,
    speed: (1 / (mode.pred_delay + 0.1)) * 100,
    eco: (1 / (mode.pred_co2 / 1000)) * 100,
    score: mode.score * 100
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  const bestMode = result.per_mode_analysis.find(m => m.mode === result.best_mode_by_score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navbar */}
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate("/")}
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
            >
              Sim-to-Dec
            </button>
            <div className="flex gap-4">
              <button
                onClick={() => navigate("/inference")}
                className="text-gray-700 hover:text-blue-600 transition"
              >
                ← New Inference
              </button>
              <button
                onClick={() => navigate("/")}
                className="text-gray-700 hover:text-blue-600 transition"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-12 px-4">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Inference Results
          </h1>
          <p className="text-xl text-gray-600">AI-powered logistics optimization analysis</p>
        </motion.div>

        {/* Best Mode Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 mb-8 text-white shadow-2xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center md:text-left">
              <div className="text-sm opacity-90 mb-2">Recommended Mode</div>
              <div className="text-3xl font-bold">{result.best_mode_by_score}</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-sm opacity-90 mb-2">AI Policy Choice</div>
              <div className="text-3xl font-bold">{result.actor_policy_choice}</div>
            </div>
            <div className="text-center md:text-left">
              <div className="text-sm opacity-90 mb-2">Optimization Score</div>
              <div className="text-3xl font-bold">{Math.round(result.best_score * 100) / 100}</div>
            </div>
          </div>
        </motion.div>

        {/* Key Metrics */}
        {bestMode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
              <div className="text-sm text-gray-600 mb-2">Predicted Profit</div>
              <div className="text-3xl font-bold text-green-600">₹{Math.round(bestMode.pred_profit)}</div>
              <div className="text-xs text-gray-500 mt-1">±₹{Math.round(bestMode.std_profit)}</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
              <div className="text-sm text-gray-600 mb-2">Estimated Delay</div>
              <div className="text-3xl font-bold text-blue-600">{Math.round(bestMode.pred_delay * 10) / 10} days</div>
              <div className="text-xs text-gray-500 mt-1">±{Math.round(bestMode.std_delay * 10) / 10} days</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-red-500">
              <div className="text-sm text-gray-600 mb-2">CO₂ Emissions</div>
              <div className="text-3xl font-bold text-red-600">{Math.round(bestMode.pred_co2)} kg</div>
              <div className="text-xs text-gray-500 mt-1">±{Math.round(bestMode.std_co2)} kg</div>
            </div>
          </motion.div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Comparison Bar Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Mode Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
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

          {/* Score Comparison */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-6 shadow-lg"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Optimization Scores</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="mode" type="category" />
                <Tooltip />
                <Bar dataKey="score" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Detailed Analysis Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl p-6 shadow-lg mb-8"
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Detailed Mode Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Mode</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Profit (₹)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Delay (days)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">CO₂ (kg)</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                </tr>
              </thead>
              <tbody>
                {result.per_mode_analysis.map((mode, index) => (
                  <motion.tr
                    key={index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className={`border-b border-gray-100 hover:bg-blue-50 transition ${
                      mode.mode === result.best_mode_by_score ? 'bg-blue-50 font-semibold' : ''
                    }`}
                  >
                    <td className="py-4 px-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-sm ${
                        mode.mode === result.best_mode_by_score 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {mode.mode === result.best_mode_by_score && '✓ '}
                        {mode.mode}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-700">₹{Math.round(mode.pred_profit)}</td>
                    <td className="py-4 px-4 text-gray-700">{Math.round(mode.pred_delay * 10) / 10}</td>
                    <td className="py-4 px-4 text-gray-700">{Math.round(mode.pred_co2)}</td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-blue-600">
                        {Math.round(mode.score * 100) / 100}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Live Features */}
        {result.live_features && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 shadow-lg mb-8"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Live Data Used</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-600">Distance</div>
                <div className="text-2xl font-bold text-indigo-600">{Math.round(result.live_features.km)} km</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Weather Score</div>
                <div className="text-2xl font-bold text-indigo-600">{Math.round(result.live_features.ws * 100) / 100}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Fuel Index</div>
                <div className="text-2xl font-bold text-indigo-600">{Math.round(result.live_features.fi * 100) / 100}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Weight</div>
                <div className="text-2xl font-bold text-indigo-600">{Math.round(result.live_features.weight * 10) / 10} kg</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex gap-4 justify-center"
        >
          <button
            onClick={() => navigate("/inference")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            Run New Inference
          </button>
          <button
            onClick={() => navigate("/")}
            className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
          >
            Back to Home
          </button>
        </motion.div>
      </div>
    </div>
  );
}
