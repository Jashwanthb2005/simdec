import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

export default function EnhancedLineChart({ 
  data, 
  lines = [], 
  title = "",
  height = 300,
  showGrid = true,
  showLegend = true,
  showAverageLine = false
}) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px] text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  // Calculate averages for reference lines
  const averages = lines.reduce((acc, line) => {
    const values = data.map(d => d[line.dataKey]).filter(v => v !== undefined && v !== null);
    if (values.length > 0) {
      acc[line.dataKey] = values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    return acc;
  }, {});

  const defaultColors = ["#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899"];

  // Check if we need dual Y-axes
  const hasDualAxis = lines.some(line => line.yAxisId === "right");
  
  return (
    <div className="w-full">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart 
          data={data} 
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            yAxisId="left"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{ value: lines.find(l => l.yAxisId === "left" || !l.yAxisId)?.name || "", angle: -90, position: "insideLeft" }}
          />
          {hasDualAxis && (
            <YAxis 
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              label={{ value: lines.find(l => l.yAxisId === "right")?.name || "", angle: 90, position: "insideRight" }}
            />
          )}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            labelStyle={{ fontWeight: 'bold', marginBottom: '8px' }}
            formatter={(value, name) => {
              const line = lines.find(l => l.name === name || l.dataKey === name);
              if (line?.unit) {
                return [`${value} ${line.unit}`, name];
              }
              return [value, name];
            }}
          />
          {showLegend && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
          
          {lines.map((line, index) => {
            // Only render if data exists
            const hasData = data.some(d => d[line.dataKey] !== undefined && d[line.dataKey] !== null);
            if (!hasData) return null;
            
            return (
              <Line
                key={line.dataKey}
                type={line.type || "monotone"}
                dataKey={line.dataKey}
                stroke={line.color || defaultColors[index % defaultColors.length]}
                strokeWidth={line.strokeWidth || 2}
                name={line.name || line.dataKey}
                dot={{ r: line.showDots !== false ? 4 : 0 }}
                activeDot={{ r: 6 }}
                yAxisId={line.yAxisId || "left"}
                isAnimationActive={true}
              />
            );
          })}
          
          {showAverageLine && lines.map((line, index) => {
            const avg = averages[line.dataKey];
            if (avg !== undefined && avg > 0) {
              return (
                <ReferenceLine
                  key={`avg-${line.dataKey}`}
                  y={avg}
                  yAxisId={line.yAxisId || "left"}
                  stroke={line.color || defaultColors[index % defaultColors.length]}
                  strokeDasharray="5 5"
                  strokeOpacity={0.6}
                  label={{ 
                    value: `Avg: ${Math.round(avg)}`, 
                    position: "right",
                    fill: line.color || defaultColors[index % defaultColors.length]
                  }}
                />
              );
            }
            return null;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

