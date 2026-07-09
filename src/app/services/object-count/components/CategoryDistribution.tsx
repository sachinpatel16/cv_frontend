'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ClassBreakdownItem {
  name: string;
  count: number;
}

interface CategoryDistributionProps {
  classBreakdownData: ClassBreakdownItem[];
  totalObjectsCount: number;
}

export default function CategoryDistribution({
  classBreakdownData,
  totalObjectsCount,
}: CategoryDistributionProps) {
  return (
    <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-md">
      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
          Category Distribution
        </h3>
        <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
          Comparison of unique track counts detected per class category.
        </p>
      </div>

      {classBreakdownData.length > 0 ? (
        <div className="space-y-4">
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={classBreakdownData}
                layout="vertical"
                margin={{
                  top: 0,
                  right: 10,
                  left: 35,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1E3048"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#5A7A9A"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#5A7A9A"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0D1628',
                    border: '1px solid #1E3048',
                    borderRadius: 6,
                    color: '#E8EDF5',
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#1565C0"
                  radius={[0, 3, 3, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Progress bar visual backup */}
          <div className="space-y-2 border-t border-[#1E3048]/60 pt-2">
            {classBreakdownData.slice(0, 3).map((item) => {
              const total = totalObjectsCount || 1;
              const percent = Math.round((item.count / total) * 100);
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="font-medium text-[#E8EDF5] capitalize">
                    {item.name}
                  </span>
                  <div className="mx-3 flex flex-1 items-center gap-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0A0F1E]">
                      <div
                        className="h-full bg-[#1565C0]"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-bold text-[#5A7A9A]">{item.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center text-xs text-[#5A7A9A]">
          No classification data logged.
        </div>
      )}
    </div>
  );
}
