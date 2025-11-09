import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function DelayStats({ data }) {
  // Group by mode and calculate average delay
  const modeDelays = data.reduce((acc, item) => {
    const mode = item.aiRecommendation?.mode || "Unknown";
    if (!acc[mode]) {
      acc[mode] = { mode, totalDelay: 0, count: 0 };
    }
    acc[mode].totalDelay += item.aiRecommendation?.delay || 0;
    acc[mode].count += 1;
    return acc;
  }, {});

  const chartData = Object.values(modeDelays).map((item) => ({
    mode: item.mode,
    avgDelay: Math.round((item.totalDelay / item.count) * 10) / 10,
    count: item.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mode" />
        <YAxis label={{ value: "Average Delay (days)", angle: -90, position: "insideLeft" }} />
        <Tooltip />
        <Legend />
        <Bar dataKey="avgDelay" fill="#3b82f6" name="Average Delay (days)" />
      </BarChart>
    </ResponsiveContainer>
  );
}


