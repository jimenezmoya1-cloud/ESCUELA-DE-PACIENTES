"use client"

import React from 'react';
import { DatosPaciente } from '@/lib/clinical/types';

interface Props {
    paciente: DatosPaciente;
}

const HeaderSimple: React.FC<Props> = ({ paciente }) => (
    <div className="bg-slate-900 text-white p-6 md:p-8 border-b-4 border-blue-600 font-sans">
        <div className="flex justify-between items-center">
            <div className="flex flex-col">
                <h2 className="text-3xl font-black tracking-tighter text-blue-400">CAIMED</h2>
                <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-slate-500 -mt-1">Medicina Preventiva</p>
            </div>
            <div className="text-right">
                 <p className="font-black text-xl text-white tracking-tight">{paciente.nombre}</p>
                 <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Resumen de Evaluación</p>
            </div>
        </div>
    </div>
);

export default HeaderSimple;