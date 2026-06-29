import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function OccupancyChart({
  data,
}: {
  data: { time_sec: number; occupancy: number }[];
}) {
  if (data.length < 2) return null;
  const maxTime = data[data.length - 1]?.time_sec ?? 0;

  const formatTick = (v: number) => {
    if (maxTime < 60) {
      return `${Math.round(v)}s`;
    }
    const m = Math.floor(v / 60);
    const s = Math.round(v % 60);
    if (maxTime < 600) {
      return s === 0 ? `${m}m` : `${m}m ${s}s`;
    }
    return `${m}m`;
  };

  // Generate exactly 5 evenly spaced unique integer ticks to prevent duplicates
  const ticks: number[] = [];
  const step = maxTime / 4;
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(i * step);
    if (!ticks.includes(val)) {
      ticks.push(val);
    }
  }

  return (
    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
      <p className="mb-4 text-xs font-semibold text-[#5A7A9A]">
        Occupancy Timeline
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E3048" />
          <XAxis
            type="number"
            dataKey="time_sec"
            domain={[0, maxTime]}
            ticks={ticks}
            tickFormatter={formatTick}
            tick={{ fill: '#5A7A9A', fontSize: 10 }}
            axisLine={{ stroke: '#1E3048' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#5A7A9A', fontSize: 10 }}
            axisLine={{ stroke: '#1E3048' }}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: '#0D1628',
              border: '1px solid #1E3048',
              borderRadius: 8,
              fontSize: 11,
              color: '#E8EDF5',
            }}
            labelFormatter={(v) => `${v}s`}
          />
          <Line
            type="monotone"
            dataKey="occupancy"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#60A5FA' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
