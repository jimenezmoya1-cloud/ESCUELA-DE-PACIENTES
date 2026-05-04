"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Search, Plus, X, Loader2 } from "lucide-react";
import {
  type Cie10Entry,
  type Cie10Selection,
  normalizeCie10,
} from "@/lib/clinical/data/cie10";

interface Props {
  diseases: string[];
  cie10: Cie10Selection[];
  onChange: (next: { diseases: string[]; cie10: Cie10Selection[] }) => void;
}

const QUICK_CHIPS: { id: string; icon: string; label?: string }[] = [
  { id: "Hipertensión", icon: "💊" },
  { id: "Dislipidemia", icon: "🫀" },
  { id: "Sobrepeso u obesidad", icon: "⚖️" },
  { id: "Tabaquismo activo", icon: "🚬" },
  { id: "Enfermedad del riñón", icon: "🩺", label: "Enfermedad renal crónica" },
  {
    id: "Apnea del sueño (ronquido con pausas al respirar)",
    icon: "😴",
    label: "Apnea del sueño",
  },
];

const NONE = "Ninguna";
const UNKNOWN = "No sé qué enfermedad tengo";
const DIABETES = "Diabetes";
const SCA = "Infarto cardiaco";

export default function AntecedentesStep({ diseases, cie10, onChange }: Props) {
  const [catalog, setCatalog] = useState<Cie10Entry[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/data/cie10.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Cie10Entry[]>;
      })
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((err) => {
        if (!cancelled)
          setCatalogError(
            "No se pudo cargar el catálogo CIE-10. Recarga la página para reintentar.",
          );
        console.error("CIE-10 fetch failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 150);
    return () => clearTimeout(t);
  }, [query]);

  const results = useMemo<Cie10Entry[]>(() => {
    if (!catalog || debounced.trim().length < 2) return [];
    const q = normalizeCie10(debounced.trim());
    const out: Cie10Entry[] = [];
    for (const e of catalog) {
      if (e.search.includes(q)) {
        out.push(e);
        if (out.length >= 30) break;
      }
    }
    return out;
  }, [catalog, debounced]);

  const isNone = diseases.includes(NONE);
  const isUnknown = diseases.includes(UNKNOWN);
  const exclusiveActive = isNone || isUnknown;
  const selectedCie10Codes = useMemo(
    () => new Set(cie10.map((c) => c.code)),
    [cie10],
  );

  const toggleDisease = (id: string) => {
    if (id === NONE || id === UNKNOWN) {
      const alreadyOn = diseases.includes(id);
      onChange({
        diseases: alreadyOn ? [] : [id],
        cie10: alreadyOn ? cie10 : [],
      });
      return;
    }
    const next = diseases.includes(id)
      ? diseases.filter((x) => x !== id)
      : [...diseases.filter((x) => x !== NONE && x !== UNKNOWN), id];
    onChange({ diseases: next, cie10 });
  };

  const addCie10 = (e: Cie10Entry) => {
    if (selectedCie10Codes.has(e.code)) return;
    onChange({ diseases, cie10: [...cie10, { code: e.code, name: e.name }] });
  };

  const removeCie10 = (code: string) => {
    onChange({ diseases, cie10: cie10.filter((c) => c.code !== code) });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
        <Activity className="w-6 h-6 text-blue-600" /> Antecedentes
      </h2>

      {/* Botones grandes DM y SCA */}
      <div>
        <p className="text-slate-600 font-medium mb-3">
          ¿Tiene alguna de estas dos condiciones?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            disabled={exclusiveActive}
            onClick={() => toggleDisease(DIABETES)}
            className={`p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
              diseases.includes(DIABETES)
                ? "border-blue-600 bg-blue-50 shadow-md"
                : "border-slate-200 bg-white hover:border-blue-300"
            } ${exclusiveActive ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span className="text-3xl">🩸</span>
            <span className="font-bold text-slate-700 text-lg">
              Diabetes mellitus
            </span>
          </button>
          <button
            type="button"
            disabled={exclusiveActive}
            onClick={() => toggleDisease(SCA)}
            className={`p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
              diseases.includes(SCA)
                ? "border-blue-600 bg-blue-50 shadow-md"
                : "border-slate-200 bg-white hover:border-blue-300"
            } ${exclusiveActive ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span className="text-3xl">⚡</span>
            <span className="font-bold text-slate-700 text-lg">
              Síndrome coronario agudo
            </span>
          </button>
        </div>
      </div>

      {/* Chips Set A */}
      {!exclusiveActive && (
        <div>
          <p className="text-slate-600 font-medium mb-3">
            Otras patologías frecuentes:
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_CHIPS.map((c) => {
              const on = diseases.includes(c.id);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleDisease(c.id)}
                  className={`px-3 py-2 rounded-xl border-2 text-sm font-bold transition-all flex items-center gap-2 ${
                    on
                      ? "border-blue-600 bg-blue-50 text-blue-800"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                  }`}
                >
                  <span>{c.icon}</span>
                  <span>{c.label || c.id}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Buscador CIE-10 */}
      {!exclusiveActive && (
        <div>
          <label className="block text-slate-600 font-medium mb-2">
            Buscar otro antecedente (CIE-10):
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!catalog}
              placeholder={
                catalog
                  ? "Código, nombre o descripción..."
                  : "Cargando catálogo CIE-10…"
              }
              className="w-full pl-9 pr-9 py-2 rounded-xl border-2 border-slate-200 focus:border-blue-400 outline-none disabled:bg-slate-50"
            />
            {!catalog && !catalogError && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>
          {catalogError && (
            <p className="text-sm text-red-600 mt-2">{catalogError}</p>
          )}

          {results.length > 0 && (
            <ul className="mt-3 max-h-72 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {results.map((e) => {
                const already = selectedCie10Codes.has(e.code);
                return (
                  <li
                    key={e.code}
                    className="flex items-start gap-3 p-3 hover:bg-slate-50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800">
                        {e.code} — {e.name}
                      </div>
                      {e.description && (
                        <div className="text-xs text-slate-500 truncate">
                          {e.description}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => addCie10(e)}
                      className={`shrink-0 p-2 rounded-lg ${
                        already
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                      aria-label={
                        already ? "Ya seleccionado" : `Agregar ${e.code}`
                      }
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {cie10.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-slate-600 font-medium mb-2">
                Antecedentes CIE-10 seleccionados:
              </p>
              <ul className="space-y-2">
                {cie10.map((c) => (
                  <li
                    key={c.code}
                    className="flex items-start gap-3 p-2 rounded-lg bg-blue-50 border border-blue-100"
                  >
                    <span className="text-sm font-bold text-blue-900 flex-1">
                      {c.code} — {c.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCie10(c.code)}
                      className="shrink-0 p-1 text-blue-700 hover:text-red-600"
                      aria-label={`Quitar ${c.code}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Excluyentes */}
      <div className="border-t border-slate-200 pt-4 space-y-2">
        <button
          type="button"
          onClick={() => toggleDisease(NONE)}
          className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
            isNone
              ? "border-blue-600 bg-blue-50"
              : "border-slate-200 bg-white hover:border-blue-300"
          }`}
        >
          <span className="text-xl">❌</span>
          <span className="font-bold text-slate-700">
            Ninguno de los anteriores
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleDisease(UNKNOWN)}
          className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all ${
            isUnknown
              ? "border-blue-600 bg-blue-50"
              : "border-slate-200 bg-white hover:border-blue-300"
          }`}
        >
          <span className="text-xl">❓</span>
          <span className="font-bold text-slate-700">
            No sé qué enfermedad tengo
          </span>
        </button>
      </div>
    </div>
  );
}
