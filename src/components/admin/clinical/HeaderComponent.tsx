"use client"

import React from "react";
import { Target } from "lucide-react";
import { DatosPaciente } from "@/lib/clinical/types";

interface Props {
  paciente: DatosPaciente;
  setPaciente: React.Dispatch<React.SetStateAction<DatosPaciente>>;
  modoEdicion: boolean;
  edadCalculada: number;
  isSCA: boolean;
  setIsSCA: React.Dispatch<React.SetStateAction<boolean>>;
  isDM2: boolean;
  setIsDM2: React.Dispatch<React.SetStateAction<boolean>>;
  isPluripatologico: boolean;
  setIsPluripatologico: React.Dispatch<React.SetStateAction<boolean>>;
  isPocaExpectativa: boolean;
  setIsPocaExpectativa: React.Dispatch<React.SetStateAction<boolean>>;
}

const HeaderComponent: React.FC<Props> = ({
  paciente,
  setPaciente,
  modoEdicion,
  edadCalculada,
  isSCA,
  setIsSCA,
  isDM2,
  setIsDM2,
  isPluripatologico,
  setIsPluripatologico,
  isPocaExpectativa,
  setIsPocaExpectativa,
}) => {
  return (
    <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white p-8 md:p-10 font-sans flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
      <div className="flex items-center gap-6">
        <div className="w-14 h-14 rounded-full border border-blue-400/30 flex items-center justify-center bg-blue-500/10 shrink-0">
          <Target className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex flex-col">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200 mb-1">
            CAIMED · MEDICINA CARDIOPREVENTIVA
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            REPORTE CARDIOPREVENTIVA CAIMED
          </h1>
        </div>
      </div>

      <div className="flex flex-col items-start md:items-end text-left md:text-right w-full md:w-auto">
        {modoEdicion ? (
          <div className="flex flex-col gap-2 mb-2 w-full max-w-xs">
            <input 
              type="text" 
              value={paciente.nombre} 
              onChange={e => setPaciente({...paciente, nombre: e.target.value})} 
              className="text-xl font-bold text-slate-800 px-2 py-1 rounded w-full" 
              placeholder="Nombre"
            />
            <div className="flex gap-2">
              <input 
                type="text" 
                value={paciente.documento} 
                onChange={e => setPaciente({...paciente, documento: e.target.value})} 
                className="text-sm font-medium text-slate-800 px-2 py-1 rounded w-1/2" 
                placeholder="Documento"
              />
              <input 
                type="text" 
                value={paciente.fechaNacimiento} 
                onChange={e => setPaciente({...paciente, fechaNacimiento: e.target.value})} 
                className="text-sm font-medium text-slate-800 px-2 py-1 rounded w-1/2" 
                placeholder="DD/MM/YYYY"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <label className="flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded cursor-pointer">
                <input type="checkbox" checked={isSCA} onChange={e => setIsSCA(e.target.checked)} /> SCA
              </label>
              <label className="flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded cursor-pointer">
                <input type="checkbox" checked={isDM2} onChange={e => setIsDM2(e.target.checked)} /> DM2
              </label>
              <label className="flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded cursor-pointer">
                <input type="checkbox" checked={isPluripatologico} onChange={e => setIsPluripatologico(e.target.checked)} /> Pluripatológico
              </label>
              <label className="flex items-center gap-1 text-xs bg-slate-800 px-2 py-1 rounded cursor-pointer">
                <input type="checkbox" checked={isPocaExpectativa} onChange={e => setIsPocaExpectativa(e.target.checked)} /> Poca Expectativa
              </label>
            </div>
          </div>
        ) : (
          <>
            <p className="text-2xl font-black text-white tracking-tight mb-1">
              {paciente.nombre}
            </p>
            <p className="text-sm font-medium text-slate-300 mb-1">
              Doc: {paciente.documento} · {edadCalculada} años
            </p>
            <p className="text-sm font-medium text-slate-300 mb-3">
              {paciente.fechaReporte}
            </p>
          </>
        )}
        
        {!modoEdicion && (isSCA || isDM2 || isPluripatologico || isPocaExpectativa) && (
          <div className="flex flex-wrap gap-2 justify-end">
            {isSCA && (
              <span className="text-[10px] font-bold px-3 py-1 rounded-md bg-red-900/80 border border-red-700 text-red-100 uppercase tracking-widest">
                SCA
              </span>
            )}
            {isDM2 && (
              <span className="text-[10px] font-bold px-3 py-1 rounded-md bg-orange-900/80 border border-orange-700 text-orange-100 uppercase tracking-widest">
                DM2
              </span>
            )}
            {isPluripatologico && (
              <span className="text-[10px] font-bold px-3 py-1 rounded-md bg-purple-900/80 border border-purple-700 text-purple-100 uppercase tracking-widest">
                Pluripatológico
              </span>
            )}
            {isPocaExpectativa && (
              <span className="text-[10px] font-bold px-3 py-1 rounded-md bg-slate-700/80 border border-slate-500 text-slate-100 uppercase tracking-widest">
                Poca Expectativa
              </span>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderComponent;
