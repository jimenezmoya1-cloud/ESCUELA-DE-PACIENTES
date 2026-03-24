"use client"

import { useState, useTransition } from "react"

export default function UserAccessToggle({
  userId,
  initialActive,
  patientName,
}: {
  userId: string
  initialActive: boolean
  patientName: string
}) {
  const [isActive, setIsActive] = useState(initialActive)
  const [isPending, startTransition] = useTransition()

  async function toggle() {
    const newValue = !isActive
    setIsActive(newValue) // optimistic

    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/toggle-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, isActive: newValue }),
        })
        if (!res.ok) {
          setIsActive(!newValue) // revert on error
        }
      } catch {
        setIsActive(!newValue) // revert on error
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={isPending}
        title={isActive ? `Suspender acceso de ${patientName}` : `Restaurar acceso de ${patientName}`}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-60 ${
          isActive ? "bg-secondary" : "bg-tertiary/30"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            isActive ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className={`text-xs font-medium ${isActive ? "text-success" : "text-tertiary"}`}>
        {isActive ? "Activo" : "Suspendido"}
      </span>
    </div>
  )
}
