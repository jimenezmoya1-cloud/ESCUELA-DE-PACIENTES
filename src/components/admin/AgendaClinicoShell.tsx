"use client"

import { useState } from "react"
import type { AppointmentWithJoin } from "@/lib/scheduling/admin"
import AgendaMetrics from "./AgendaMetrics"
import AgendaWeekView from "./AgendaWeekView"
import AgendaMonthView from "./AgendaMonthView"
import AgendaListView from "./AgendaListView"
import CitaDrawerClinico from "./CitaDrawerClinico"

type Mode = "week" | "month" | "list"

interface Props {
  appointments: AppointmentWithJoin[]
  teamsUrl: string
}

export default function AgendaClinicoShell({ appointments, teamsUrl }: Props) {
  const [mode, setMode] = useState<Mode>("week")
  const [selected, setSelected] = useState<AppointmentWithJoin | null>(null)

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold text-neutral mb-1">Mi agenda</h1>
        <p className="text-sm text-tertiary">Citas asignadas a ti.</p>
      </header>

      <AgendaMetrics appointments={appointments} teamsUrl={teamsUrl} />

      <div className="flex gap-1 rounded-lg border border-tertiary/20 p-1 w-fit">
        {(["week", "month", "list"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-1 text-xs font-medium rounded ${mode === m ? "bg-primary text-white" : "text-tertiary hover:bg-background"}`}
          >
            {m === "week" ? "Semana" : m === "month" ? "Mes" : "Lista"}
          </button>
        ))}
      </div>

      {mode === "week" && <AgendaWeekView appointments={appointments} onSelect={setSelected} />}
      {mode === "month" && <AgendaMonthView appointments={appointments} onSelect={setSelected} />}
      {mode === "list" && <AgendaListView appointments={appointments} onSelect={setSelected} />}

      <CitaDrawerClinico
        appointment={selected}
        teamsUrl={teamsUrl}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
