"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts"
import type { MonthlyTrend } from "@/lib/clinical/dashboard-aggregations"

export default function TrendChart({ trend }: { trend: MonthlyTrend }) {
  const data = trend.points.map((p) => ({
    month: p.monthLabel,
    value: p.value,
  }))

  return (
    <div className="bg-white rounded-xl border border-tertiary/15 p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-neutral mb-3">{trend.title}</h4>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 11 }} stroke="#64748b" width={40} />
            <Tooltip
              formatter={(value) => {
                if (value === null || value === undefined) return ["—", trend.yLabel]
                const n = typeof value === "number" ? value : Number(value)
                return [Number.isFinite(n) ? n.toFixed(1) : "—", trend.yLabel]
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
