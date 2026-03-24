"use client"

export default function PointsDisplay({
  totalPoints,
  currentStreak,
  modulesCompleted,
  totalModules,
}: {
  totalPoints: number
  currentStreak: number
  modulesCompleted: number
  totalModules: number
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {/* Puntos totales */}
      <div className="rounded-2xl bg-gradient-to-br from-secondary to-blue-600 p-4 text-white shadow-lg shadow-secondary/20">
        <div className="mb-1 flex items-center gap-2">
          <svg className="h-5 w-5 opacity-80" viewBox="0 0 48 48" fill="none">
            <path d="M24 4l6 14h14l-11 9 4 15-13-9-13 9 4-15L4 18h14z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-medium opacity-80">Puntos</span>
        </div>
        <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
      </div>

      {/* Racha */}
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-4 text-white shadow-lg shadow-orange-200">
        <div className="mb-1 flex items-center gap-2">
          <svg className="h-5 w-5 opacity-80" viewBox="0 0 48 48" fill="none">
            <path d="M24 2c0 0-16 14-16 28a16 16 0 0032 0C40 16 24 2 24 2z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-xs font-medium opacity-80">Racha</span>
        </div>
        <p className="text-2xl font-bold">{currentStreak} <span className="text-sm font-normal opacity-80">días</span></p>
      </div>

      {/* Módulos */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 p-4 text-white shadow-lg shadow-emerald-200">
        <div className="mb-1 flex items-center gap-2">
          <svg className="h-5 w-5 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs font-medium opacity-80">Módulos</span>
        </div>
        <p className="text-2xl font-bold">{modulesCompleted}<span className="text-sm font-normal opacity-80">/{totalModules}</span></p>
      </div>

      {/* Nivel */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 text-white shadow-lg shadow-violet-200">
        <div className="mb-1 flex items-center gap-2">
          <svg className="h-5 w-5 opacity-80" viewBox="0 0 48 48" fill="none">
            <path d="M24 4L6 12v12c0 12 8 18 18 20 10-2 18-8 18-20V12L24 4z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2.5" />
          </svg>
          <span className="text-xs font-medium opacity-80">Nivel</span>
        </div>
        <p className="text-2xl font-bold">{getLevel(totalPoints)}</p>
      </div>
    </div>
  )
}

function getLevel(points: number): string {
  if (points >= 3000) return "Leyenda"
  if (points >= 2000) return "Experto"
  if (points >= 1500) return "Avanzado"
  if (points >= 1000) return "Intermedio"
  if (points >= 500) return "Aprendiz"
  if (points >= 100) return "Novato"
  return "Inicio"
}
