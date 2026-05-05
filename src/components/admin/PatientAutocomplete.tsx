"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

export interface PatientLite {
  id: string
  name: string
  email: string
}

export default function PatientAutocomplete({
  value,
  onChange,
}: {
  value: PatientLite | null
  onChange: (patient: PatientLite | null) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<PatientLite[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "patient")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)
      setResults((data ?? []) as PatientLite[])
    }, 250)
  }, [query, supabase])

  if (value) {
    return (
      <div className="rounded-lg border border-tertiary/20 px-3 py-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-neutral">{value.name}</div>
          <div className="text-xs text-tertiary">{value.email}</div>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setQuery("")
          }}
          className="text-xs text-tertiary hover:text-neutral"
        >
          Cambiar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar paciente por nombre o correo..."
        className="block w-full rounded-lg border border-tertiary/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-tertiary/20 bg-white shadow-lg">
          {results.map((p) => (
            <li
              key={p.id}
              onClick={() => {
                onChange(p)
                setQuery("")
                setOpen(false)
              }}
              className="cursor-pointer px-3 py-2 hover:bg-background"
            >
              <div className="text-sm font-medium text-neutral">{p.name}</div>
              <div className="text-xs text-tertiary">{p.email}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
