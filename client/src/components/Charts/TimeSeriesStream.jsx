import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

export default function TimeSeriesStream({ data, metrics = ["co2", "profit", "delay"] }) {
  // Process data for time series stream graph (stacked area chart)
  // Group by time period and stack metrics
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group by date
    const groupedByDate = {};
    data.forEach((item) => {
      // Use ISO date string for consistent sorting
      const dateKey = item.createdAt 
        ? new Date(item.createdAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      
      const dateLabel = item.date || new Date(item.createdAt || Date.now()).toLocaleDateString();
      
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: dateLabel,
          dateKey: dateKey,
          co2: 0,
          profit: 0,
          delay: 0,
          shipments: 0,
        };
      }
      
      groupedByDate[dateKey].co2 += item.co2 || 0;
      groupedByDate[dateKey].profit += item.profit || 0;
      groupedByDate[dateKey].delay += (item.delay || 0);
      groupedByDate[dateKey].shipments += (item.shipments || 1);
    });

    // Convert to array and sort by date
    return Object.values(groupedByDate).sort((a, b) => {
      return new Date(a.dateKey) - new Date(b.dateKey);
    });
  }, [data]);

  const colors = {
    co2: { stroke: "#ef4444", fill: "#fecaca" },
    profit: { stroke: "#10b981", fill: "#a7f3d0" },
    delay: { stroke: "#3b82f6", fill: "#bfdbfe" },
    shipments: { stroke: "#8b5cf6", fill: "#ddd6fe" },
  };

  if (processedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No time series data available</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={processedData} margin={{ top: 10, right: 30, left: 0, bottom: 60 }}>
        <defs>
          {metrics.map((metric) => (
            <linearGradient key={metric} id={`gradient${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors[metric]?.stroke || "#8884d8"} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={colors[metric]?.stroke || "#8884d8"} stopOpacity={0.1}/>
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          style={{ fontSize: '11px' }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
          labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
        />
        {metrics.map((metric, index) => {
          const metricConfig = {
            co2: { name: "CO₂ Emissions (kg)", stackId: "stack1", unit: "kg" },
            profit: { name: "Profit (₹)", stackId: "stack1", unit: "₹" },
            delay: { name: "Delay (days)", stackId: "stack1", unit: "days" },
            shipments: { name: "Shipments", stackId: "stack1", unit: "" },
          };
          
          const config = metricConfig[metric] || { name: metric, stackId: "stack1", unit: "" };
          
          // Only show metrics that have data
          const hasData = processedData.some(d => d[metric] > 0);
          if (!hasData) return null;
          
          return (
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              stackId={config.stackId}
              stroke={colors[metric]?.stroke || "#8884d8"}
              fill={`url(#gradient${metric})`}
              name={config.name}
              strokeWidth={2}
              fillOpacity={0.7}
              isAnimationActive={true}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

