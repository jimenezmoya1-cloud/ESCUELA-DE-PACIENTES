'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ComponentChartProps {
  componentes: { nombre: string; puntaje: number }[]
}

const displayLabels: Record<string, string> = {
  Peso: 'Peso (IMC)',
  Nicotina: 'Tabaquismo',
  'Desconoce condición': 'Conocimiento de tu salud',
}

function getBarColor(score: number): string {
  if (score >= 80) return '#22C55E'
  if (score > 50) return '#EAB308'
  return '#EF4444'
}

function getDisplayLabel(nombre: string): string {
  return displayLabels[nombre] ?? nombre
}

export default function ComponentChart({ componentes }: ComponentChartProps) {
  const sorted = [...componentes]
    .map((c) => ({
      name: getDisplayLabel(c.nombre),
      puntaje: c.puntaje,
    }))
    .sort((a, b) => a.puntaje - b.puntaje)

  const chartHeight = Math.max(sorted.length * 50, 200)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-[#212B52]">
        Detalle por componente
      </h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 20, bottom: 0, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={160}
            tick={{ fontSize: 12, fill: '#212B52' }}
          />
          <Bar dataKey="puntaje" radius={[0, 4, 4, 0]} barSize={24}>
            {sorted.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.puntaje)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
