"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const DEFAULT_DATA = [
  { name: "Public safety", value: 32 },
  { name: "Transit & roads", value: 18 },
  { name: "Housing", value: 14 },
  { name: "Parks & rec", value: 9 },
  { name: "Education", value: 16 },
  { name: "Other", value: 11 },
];

const COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#a855f7", "#94a3b8"];

export function BudgetPieChart({
  data = DEFAULT_DATA,
  onSegmentClick,
}: {
  data?: { name: string; value: number }[];
  onSegmentClick?: (name: string) => void;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            onClick={(d) => onSegmentClick?.(String(d.name))}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
