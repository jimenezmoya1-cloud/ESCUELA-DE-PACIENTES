"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  HeartPulse, User, CreditCard, Calendar, Phone, Mail,
  Ruler, Scale, Activity, Pill, Package, Moon, Dumbbell,
  Check, ChevronRight, ChevronLeft, Loader2, Link as LinkIcon, CheckCircle2, X
} from 'lucide-react';
import TermsModal from './TermsModal';
import { colombia } from '@/lib/clinical/data/colombia';
import { countries } from '@/lib/clinical/data/countries';
import { REGIMEN_AFILIACION, EPS_LIST, PREPAGADAS_LIST, PLAN_COMPLEMENTARIO_LIST } from '@/lib/clinical/data/colombia-health';
import AntecedentesStep from './AntecedentesStep';
import type { Cie10Selection } from '@/lib/clinical/data/cie10';
import ScoreChip from './ScoreChip';
import { computeChipScore } from '@/lib/clinical/scoring';
import type { ContextoClinico } from '@/lib/clinical/types';
import { motion, useReducedMotion } from 'framer-motion';
import { useKeyboardSelection } from '@/hooks/useKeyboardSelection';

const getCaimedMessage = (step: number) => {
  switch(step) {
    case 1: return "Dile: 'Bienvenido a CAIMED Cardiopreventiva. Hoy comenzamos a ser tu copiloto en salud para cuidar tu corazón y tu vida.'";
    case 2: return "Explícale: 'Tus datos están seguros. En CAIMED valoramos tu privacidad tanto como tu salud cardiovascular.'";
    case 3: return "Coméntale: 'Conocer tus datos nos permite ofrecerte una medicina preventiva a tu medida, porque en CAIMED cada paciente es único.'";
    case 4: return "Dile: 'Tu entorno es clave. En CAIMED sabemos que el apoyo familiar fortalece tu salud del corazón.'";
    case 5: return "Recuérdale: 'Queremos que entiendas tu salud. En CAIMED te entregaremos reportes claros para que tomes las mejores decisiones.'";
    case 6: return "Dile con empatía: 'Conocer tus antecedentes nos ayuda a prevenir. No somos médicos de urgencias, somos tu equipo preventivo.'";
    case 7: return "Coméntale: 'Los medicamentos son tus aliados. En CAIMED te acompañamos para que tu tratamiento sea fácil de llevar.'";
    case 8: return "Explícale: 'Sabemos que acceder a medicinas puede ser un reto. En CAIMED te orientamos para superar estas barreras.'";
    case 9: return "Dile: 'Tomar tus medicinas a tiempo salva vidas. Nuestro programa te dará herramientas prácticas para que nunca lo olvides.'";
    case 10: return "Mientras tomas sus signos, dile: 'Tus cifras nos hablan. En CAIMED te enseñaremos a entenderlas como un profesional.'";
    case 11: return "Coméntale: 'Más allá de la báscula, buscamos tu bienestar integral. En CAIMED diseñamos estrategias reales para tu cuerpo.'";
    case 12: return "Explícale: 'Tus exámenes son el mapa de tu salud. En CAIMED los traducimos a un lenguaje sencillo para cuidar tus arterias.'";
    case 13: return "Con mucho tacto, dile: 'La salud cardiovascular se refleja en todo tu cuerpo. En CAIMED cuidamos tu bienestar integral.'";
    case 14:
    case 15: return "Dile: 'Si fumas, no te juzgamos, te ayudamos. En CAIMED tenemos programas para acompañarte a romper cadenas a tu ritmo.'";
    case 16: return "Coméntale: 'El buen descanso y el movimiento son vida. En CAIMED adaptamos el ejercicio a tu energía y cuidamos tu sueño.'";
    case 17: return "Dile con calidez: 'Tu tranquilidad mental es vital para tu corazón. En CAIMED te escuchamos y te apoyamos en cada paso.'";
    case 18: return "Coméntale: 'Comer rico y sano es posible. En CAIMED te daremos herramientas visuales para una alimentación cardiosaludable.'";
    case 19:
    case 20: return "Despídete diciendo: 'Gracias por confiar en CAIMED. Hoy diste un gran paso; recuerda que cuidar tu corazón es cuidar tu vida.'";
    default: return "Recuerda: Cuidar su corazón es cuidar su vida. Hazlo sentir cómodo.";
  }
};

interface QuestionnaireProps {
  onComplete: (url: string) => void;
  existingProfile?: ExistingProfile | null;
  skipPersonalData?: boolean;
  editMode?: boolean;
}

export interface ExistingProfile {
  primer_nombre: string | null;
  segundo_nombre: string | null;
  primer_apellido: string | null;
  segundo_apellido: string | null;
  tipo_documento: string | null;
  documento: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  telefono: string | null;
  correo: string | null;
  regimen_afiliacion: string | null;
  aseguradora: string | null;
  prepagada: string | null;
  plan_complementario: string | null;
  pais_nacimiento: string | null;
  pais_residencia: string | null;
  departamento_residencia: string | null;
  municipio_residencia: string | null;
  direccion_residencia: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_parentesco: string | null;
  contacto_emergencia_telefono: string | null;
}

export default function Questionnaire({ onComplete, existingProfile, skipPersonalData, editMode }: QuestionnaireProps) {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState(editMode ? 3 : 1);
  const totalSteps = 18;
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (editMode) return;
    if (step > 0 && step <= totalSteps) {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToastMsg(getCaimedMessage(step));
      toastTimeoutRef.current = setTimeout(() => setToastMsg(''), 6000);
    }
  }, [step, editMode]);

  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current || !existingProfile) return;
    prefilledRef.current = true;
    setFormData(prev => ({
      ...prev,
      firstName: existingProfile.primer_nombre ?? '',
      secondName: existingProfile.segundo_nombre ?? '',
      firstLastName: existingProfile.primer_apellido ?? '',
      secondLastName: existingProfile.segundo_apellido ?? '',
      docType: existingProfile.tipo_documento ?? prev.docType,
      docNumber: existingProfile.documento ?? '',
      dob: existingProfile.fecha_nacimiento ?? '',
      phone: existingProfile.telefono ?? '',
      email: existingProfile.correo ?? '',
      gender: existingProfile.sexo ?? '',
      birthCountry: existingProfile.pais_nacimiento ?? prev.birthCountry,
      residenceCountry: existingProfile.pais_residencia ?? prev.residenceCountry,
      residenceDept: existingProfile.departamento_residencia ?? '',
      residenceMun: existingProfile.municipio_residencia ?? '',
      address: existingProfile.direccion_residencia ?? '',
      emergencyName: existingProfile.contacto_emergencia_nombre ?? '',
      emergencyRelation: existingProfile.contacto_emergencia_parentesco ?? '',
      emergencyPhone: existingProfile.contacto_emergencia_telefono ?? '',
      affiliation: existingProfile.regimen_afiliacion ?? '',
      eps: existingProfile.aseguradora ?? '',
      prepaid: existingProfile.prepagada ?? '',
      complementary: existingProfile.plan_complementario ?? '',
    }));
  }, [existingProfile]);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    secondName: '',
    firstLastName: '',
    secondLastName: '',
    docType: 'CC',
    docNumber: '',
    dob: '',
    phone: '',
    email: '',
    gender: '',
    birthCountry: 'Colombia',
    residenceCountry: 'Colombia',
    residenceDept: '',
    residenceMun: '',
    address: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
    affiliation: '',
    eps: '',
    prepaid: '',
    complementary: '',
    height: '',
    weight: '',
    bodyFat: '',
    neckCirc: '',
    waistCirc: '',
    diseases: [] as string[],
    cie10: [] as Cie10Selection[],
    takesMeds: null as boolean | null,
    medAccess: 0,
    medAccessReason: 0,
    arms: Array(12).fill(1),
    smoked: null as boolean | null,
    smokeStatus: [] as number[],
    activity: '',
    sleep: '',
    consent: false,
    mspss: Array(12).fill(0),
    hes: Array(8).fill(0),
    vitalSigns: {
      pas: '',
      pad: '',
      hr: '',
      rr: '',
      spo2: '',
      temp: '',
      outOfRange: false,
      outOfRangeDetails: ''
    },
    paraclinics: {
      lipidDate: '',
      totalChol: '',
      hdl: '',
      ldl: '',
      triglycerides: '',
      hba1cDate: '',
      hba1c: ''
    },
    hasSexualActivity: null as boolean | null,
    iief: Array(5).fill(0),
    phq9: Array(9).fill(0),
    phq9Difficulty: 0,
    medas: Array(8).fill(-1)
  });

  // EP-5: chip context — el chip muestra valor sin contexto SCA/DM2 (lo ignoramos
  // en captura porque depende del input del médico en ClinicalHistoryClient).
  const chipContexto: ContextoClinico = {
    isSCA: false,
    isDM2: false,
    isPluripatologico: false,
    isPocaExpectativa: false,
    edad: 0,
    takesMeds: formData.takesMeds === true,
    iiefAplica: formData.gender === 'Masculino' && formData.hasSexualActivity === true,
  };
  const chipFor = (name: string) => {
    const result = computeChipScore(name, formData as unknown as Record<string, unknown>, chipContexto);
    return result
      ? { label: result.label, displayValue: result.displayValue, score: result.score }
      : { label: 'Pendiente', displayValue: null, score: null };
  };

  // EP-6: keyboard navigation hook (intercepta números 1-9 en grupos marcados)
  useKeyboardSelection();

  // EP-6: auto-focus al primer botón del primer grupo Likert/binario al cambiar de step.
  // Si el step actual no tiene grupos marcados (welcome, datos personales, etc.), no pasa nada.
  useEffect(() => {
    const t = setTimeout(() => {
      const firstGroup = document.querySelector('[data-keyboard-group]') as HTMLElement | null;
      const firstBtn = firstGroup?.querySelector('[data-key="1"]') as HTMLElement | null;
      firstBtn?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [step]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');

  const handleNext = () => {
    if (step === 2 && skipPersonalData) {
      setStep(4);
    } else if (step === 7 && formData.takesMeds === false) {
      setStep(10);
    } else if (step === 12 && formData.gender !== 'Masculino') {
      setStep(14);
    } else if (step === 14 && formData.smoked === false) {
      setStep(16);
    } else if (step < totalSteps) {
      setStep(s => s + 1);
    }
  };

  const handlePrev = () => {
    if (step === 4 && skipPersonalData) {
      setStep(2);
    } else if (step === 10 && formData.takesMeds === false) {
      setStep(7);
    } else if (step === 14 && formData.gender !== 'Masculino') {
      setStep(12);
    } else if (step === 16 && formData.smoked === false) {
      setStep(14);
    } else if (step > 1) {
      setStep(s => s - 1);
    }
  };

  const generateUrl = () => {
    const nombre = `${formData.firstName} ${formData.secondName} ${formData.firstLastName} ${formData.secondLastName}`.replace(/\s+/g, ' ').trim();
    const doc = formData.docNumber;
    const fecha_nac = formData.dob;
    
    const hasComorbidities = formData.diseases.length > 0 && !formData.diseases.includes('Ninguna') && !formData.diseases.includes('No sé qué enfermedad tengo');
    const sca = formData.diseases.includes('Infarto cardiaco') || formData.diseases.includes('Trombosis cerebral');
    const dm2 = formData.diseases.includes('Diabetes');
    const heightNum = parseFloat(formData.height as string) || 0;
    const weightNum = parseFloat(formData.weight as string) || 0;
    const imc = heightNum > 0 ? weightNum / (heightNum * heightNum) : 0;
    const peso = imc; // Pass BMI to the URL for the "Peso" component score calculation
    
    let nicotina = 1;
    if (formData.smoked) {
      if (formData.smokeStatus.includes(6) || formData.smokeStatus.includes(5)) {
        nicotina = 5;
      } else if (formData.smokeStatus.includes(4)) {
        nicotina = 4;
      } else if (formData.smokeStatus.includes(3)) {
        nicotina = 3;
      } else if (formData.smokeStatus.includes(2)) {
        nicotina = 2;
      } else {
        nicotina = 5; // Default if somehow empty but smoked is true
      }
    }

    const actividad = formData.activity;
    const sueno = formData.sleep;

    let acceso = 1;
    if (formData.medAccess === 1) acceso = 1;
    else if (formData.medAccess === 2) acceso = 2;
    else if (formData.medAccess === 3) acceso = 3;

    const adherencia = formData.arms.reduce((a, b, idx) => {
      if (idx === 11) {
        return a + (5 - b);
      }
      return a + b;
    }, 0);

    const empoderamiento = formData.hes.reduce((a, b) => a + b, 0);
    const red_apoyo = formData.mspss.reduce((a, b) => a + b, 0);
    const alimentacion = formData.medas.reduce((a, b) => a + (b > 0 ? b : 0), 0);
    const salud_mental = formData.phq9.reduce((a, b) => a + b, 0);

    const params = new URLSearchParams({
      // Demográficos + datos personales
      nombre,
      primer_nombre: formData.firstName,
      segundo_nombre: formData.secondName,
      primer_apellido: formData.firstLastName,
      segundo_apellido: formData.secondLastName,
      doc,
      tipo_doc: formData.docType,
      fecha_nac,
      sexo: formData.gender,
      genero: formData.gender,
      telefono: formData.phone,
      correo: formData.email,
      pais_nacimiento: formData.birthCountry,
      pais_residencia: formData.residenceCountry,
      depto: formData.residenceDept,
      municipio: formData.residenceMun,
      direccion: formData.address,
      emergencia_nombre: formData.emergencyName,
      emergencia_parentesco: formData.emergencyRelation,
      emergencia_telefono: formData.emergencyPhone,
      regimen: formData.affiliation,
      eps: formData.eps,
      prepagada: formData.prepaid,
      plan_complementario: formData.complementary,
      // Banderas clínicas
      sca: sca.toString(),
      dm2: dm2.toString(),
      comorbidities: hasComorbidities.toString(),
      antecedentes: (formData.diseases ?? []).join(', '),
      antecedentes_cie10: (formData.cie10 ?? [])
        .map((c) => `${c.code} - ${c.name}`)
        .join('; '),
      // Componentes scoreados (ya agregados — entran al algoritmo)
      peso: peso.toFixed(1), // IMC computado
      nicotina: nicotina.toString(),
      actividad: actividad.toString(),
      sueno: sueno.toString(),
      empoderamiento: empoderamiento.toString(),
      adherencia: adherencia.toString(),
      acceso: acceso.toString(),
      glucosa: formData.paraclinics.hba1c.toString(),
      presion_arterial: formData.vitalSigns.pas.toString(),
      red_apoyo: red_apoyo.toString(),
      alimentacion: alimentacion.toString(),
      colesterol: formData.paraclinics.ldl.toString(),
      salud_mental: salud_mental.toString(),
      takesMeds: formData.takesMeds ? 'true' : 'false',
      // IIEF-5: solo aplica si gender=Masculino y respondió Sí al gate.
      disfuncion_erectil: formData.iief.reduce((a, b) => a + b, 0).toString(),
      iief_aplica: (formData.gender === 'Masculino' && formData.hasSexualActivity === true) ? 'true' : 'false',
      // ───────────── Campos crudos extra (para export Excel y trazabilidad) ─────────────
      // Signos vitales completos
      pad: formData.vitalSigns.pad.toString(),
      hr: formData.vitalSigns.hr.toString(),
      rr: formData.vitalSigns.rr.toString(),
      spo2: formData.vitalSigns.spo2.toString(),
      temp: formData.vitalSigns.temp.toString(),
      // Antropometría real
      talla: formData.height.toString(),
      peso_kg: formData.weight.toString(),
      // Paraclínicos completos
      lipid_date: formData.paraclinics.lipidDate,
      colesterol_total: formData.paraclinics.totalChol.toString(),
      hdl: formData.paraclinics.hdl.toString(),
      triglicéridos: formData.paraclinics.triglycerides.toString(),
      hba1c_date: formData.paraclinics.hba1cDate,
      // Acceso a medicamentos: motivo (códigoo numérico)
      med_access_reason: formData.medAccessReason.toString(),
      // Tabaquismo crudo
      smoked: formData.smoked ? 'true' : 'false',
    });

    return `${window.location.origin}/?${params.toString()}`;
  };

  const calculateFinalUrl = async () => {
    setIsSubmitting(true);
    setStep(19); // Loading screen

    const url = generateUrl();
    
    setGeneratedUrl(url);
    
    const nombre = `${formData.firstName} ${formData.secondName} ${formData.firstLastName} ${formData.secondLastName}`.replace(/\s+/g, ' ').trim();

    // Originally hcxx posted to /api/submit-questionnaire (Resend + Sheets).
    // In the integrated app, persistence happens via onComplete -> server actions.

    setTimeout(() => {
      setIsSubmitting(false);
      setStep(20); // Final screen
    }, 3000);
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return true;
      case 2: return formData.consent;
      case 3: 
        return formData.firstName && formData.firstLastName && formData.docNumber && formData.dob && formData.email && formData.phone && formData.gender && formData.birthCountry && formData.residenceCountry && (formData.residenceCountry !== 'Colombia' || (formData.residenceDept && formData.residenceMun)) && formData.address && formData.emergencyName && formData.emergencyRelation && formData.emergencyPhone && formData.affiliation && formData.eps && formData.prepaid && formData.complementary;
      case 4: return formData.mspss.every(v => v > 0);
      case 5: return formData.hes.every(v => v > 0);
      case 6: return formData.diseases.length > 0 || formData.cie10.length > 0;
      case 7: return formData.takesMeds !== null;
      case 8: 
        if (formData.takesMeds === false) return true;
        if (formData.takesMeds === true) {
          return formData.medAccess > 0 && (formData.medAccess === 1 || formData.medAccessReason > 0);
        }
        return false;
      case 9: return formData.arms.every(v => v > 0);
      case 10: return formData.vitalSigns.pas && formData.vitalSigns.pad && formData.vitalSigns.hr && formData.vitalSigns.rr && formData.vitalSigns.spo2 && formData.vitalSigns.temp && (!formData.vitalSigns.outOfRange || formData.vitalSigns.outOfRangeDetails);
      case 11: return formData.weight && formData.height;
      case 12: return true;
      case 13:
        if (formData.gender !== 'Masculino') return true;
        if (formData.hasSexualActivity === null) return false;
        if (formData.hasSexualActivity === false) return true;
        return formData.iief.every(v => v >= 1);
      case 14: return formData.smoked !== null;
      case 15: return formData.smoked === false || formData.smokeStatus.length > 0;
      case 16: {
        const activityNum = Number(formData.activity);
        const sleepNum = Number(formData.sleep);
        const activityValid =
          formData.activity !== '' && Number.isFinite(activityNum) && activityNum >= 0 && activityNum <= 1440;
        const sleepValid =
          formData.sleep !== '' && Number.isFinite(sleepNum) && sleepNum >= 0 && sleepNum <= 24;
        return activityValid && sleepValid;
      }
      case 17: return formData.phq9.every(v => v >= 0) && (formData.phq9.some(v => v > 0) ? formData.phq9Difficulty >= 0 : true);
      case 18: return formData.medas.every(v => v >= 0);
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-8 bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden min-h-[640px]">
            <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
               <svg viewBox="0 0 500 100" className="w-[200%] h-full stroke-blue-300 fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path
                   className="animate-[ekg_3s_linear_infinite]"
                   strokeDasharray="1000"
                   strokeDashoffset="1000"
                   d="M 0 50 L 150 50 L 170 20 L 190 80 L 210 10 L 230 90 L 250 50 L 500 50"
                 />
               </svg>
               <style>{`
                 @keyframes ekg {
                   0% { stroke-dashoffset: 1000; }
                   50% { stroke-dashoffset: 0; }
                   100% { stroke-dashoffset: -1000; }
                 }
               `}</style>
            </div>

            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.5, delay: 0 }}
              className="relative z-10 bg-white rounded-2xl px-6 py-5 shadow-[0_8px_32px_rgba(0,0,0,0.25)] border border-white/30 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-shadow duration-300"
            >
              <img
                src="/logo-medicina-preventiva.png"
                alt="CAIMED Preventiva"
                className="w-48 h-auto object-contain"
              />
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.5, delay: 0.15 }}
              className="relative z-10 space-y-3"
            >
              <p className="text-xs uppercase tracking-[0.3em] font-bold text-blue-300">
                Tu copiloto en salud
              </p>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                ¡Bienvenido, Equipo CAIMED!
              </h1>
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.2 : 0.5, delay: 0.3 }}
              className="relative z-10 max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 ring-1 ring-white/10 rounded-2xl p-8 text-left hover:bg-white/[0.14] hover:border-white/30 transition-all duration-300"
            >
              <p className="text-white/90 leading-relaxed">
                Hacer sentir al paciente cómodo es parte del cuidado. La evaluación preventiva se guarda automáticamente en la plataforma de Medicina Preventiva al finalizar.
              </p>
              <div className="border-t border-white/15 my-6" />
              <div className="relative">
                <span className="absolute -top-4 -left-2 text-6xl text-blue-300/30 font-serif leading-none select-none" aria-hidden="true">&ldquo;</span>
                <p className="text-blue-100 italic leading-relaxed pl-6">
                  Al igual que cambias el aceite de tu carro cada 10.000 km —aunque funcione bien— tu corazón necesita mantenimiento preventivo. No esperes a que el motor falle.
                </p>
                <p className="text-xs text-blue-200/80 font-bold mt-3 pl-6">— Equipo CAIMED</p>
              </div>
            </motion.div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Check className="w-6 h-6 text-blue-600" /> Autorización de Datos
            </h2>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-sm text-slate-600 leading-relaxed">
              "Autorizo de manera libre, expresa e informada a CAIMED S.A.S. para el tratamiento de mis datos personales y datos sensibles relacionados con mi salud, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y la Política de Tratamiento de Datos PL-PCG-001 de CAIMED S.A.S., con el fin de realizar la Evaluación Preventiva, generar un reporte de mis resultados y registrarlo en la plataforma de Medicina Preventiva CAIMED."
              <br/><br/>
              <a href="https://caimed.com/" target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">Ver política de tratamiento de datos</a>
            </div>

            <label className="flex items-start gap-4 p-4 rounded-xl border-2 border-slate-200 cursor-pointer hover:bg-slate-50 transition-all">
              <input 
                type="checkbox" 
                checked={formData.consent}
                onChange={e => setFormData({...formData, consent: e.target.checked})}
                className="mt-1 w-6 h-6 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-bold text-slate-700 text-lg">
                Acepto todos los <button type="button" onClick={(e) => { e.preventDefault(); setIsTermsOpen(true); }} className="text-blue-600 hover:underline">términos y condiciones</button> y declaro que ya fueron leídos.
              </span>
            </label>
            <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[60vh] overflow-y-auto pr-2">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10">
              <User className="w-6 h-6 text-blue-600" /> Datos Personales
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Primer Nombre *</label>
                <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Segundo Nombre</label>
                <input type="text" value={formData.secondName} onChange={e => setFormData({...formData, secondName: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Primer Apellido *</label>
                <input type="text" value={formData.firstLastName} onChange={e => setFormData({...formData, firstLastName: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Segundo Apellido</label>
                <input type="text" value={formData.secondLastName} onChange={e => setFormData({...formData, secondLastName: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><CreditCard className="w-4 h-4"/> Tipo Doc *</label>
                <select value={formData.docType} onChange={e => setFormData({...formData, docType: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                  <option value="CC">CC — Cédula de Ciudadanía</option>
                  <option value="CE">CE — Cédula de Extranjería</option>
                  <option value="CD">CD — Carné Diplomático</option>
                  <option value="PA">PA — Pasaporte</option>
                  <option value="SC">SC — Salvo Conducto</option>
                  <option value="PE">PE — Permiso Especial de Permanencia</option>
                  <option value="RC">RC — Registro Civil</option>
                  <option value="TI">TI — Tarjeta de Identidad</option>
                  <option value="CN">CN — Certificado de Nacido Vivo</option>
                  <option value="AS">AS — Adulto sin identificación</option>
                  <option value="MS">MS — Menor sin identificación</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 mb-1">Número de Documento *</label>
                <input type="text" value={formData.docNumber} onChange={e => setFormData({...formData, docNumber: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Calendar className="w-4 h-4"/> Fecha de Nacimiento *</label>
                <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Phone className="w-4 h-4"/> Teléfono *</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-2"><Mail className="w-4 h-4"/> Correo Electrónico *</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Género *</label>
                <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                  <option value="">Seleccione...</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="No binario">No binario</option>
                  <option value="Prefiere no informar">Prefiere no informar</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">País de Nacimiento *</label>
                <select value={formData.birthCountry} onChange={e => setFormData({...formData, birthCountry: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                  <option value="">Seleccione...</option>
                  {countries.map(c => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">País de Residencia *</label>
                <select value={formData.residenceCountry} onChange={e => setFormData({...formData, residenceCountry: e.target.value, residenceDept: '', residenceMun: ''})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                  <option value="">Seleccione...</option>
                  {countries.map(c => (
                    <option key={c.code} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              {formData.residenceCountry === 'Colombia' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Departamento *</label>
                    <select value={formData.residenceDept} onChange={e => setFormData({...formData, residenceDept: e.target.value, residenceMun: ''})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                      <option value="">Seleccione...</option>
                      {colombia.map(d => (
                        <option key={d.department} value={d.department}>{d.department}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Municipio *</label>
                    <select value={formData.residenceMun} onChange={e => setFormData({...formData, residenceMun: e.target.value})} disabled={!formData.residenceDept} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400">
                      <option value="">Seleccione...</option>
                      {formData.residenceDept && colombia.find(d => d.department === formData.residenceDept)?.municipalities.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Dirección de Residencia *</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Contacto de Emergencia</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre *</label>
                  <input type="text" value={formData.emergencyName} onChange={e => setFormData({...formData, emergencyName: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Parentesco *</label>
                  <input type="text" value={formData.emergencyRelation} onChange={e => setFormData({...formData, emergencyRelation: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Teléfono *</label>
                  <input type="tel" value={formData.emergencyPhone} onChange={e => setFormData({...formData, emergencyPhone: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Afiliación en Salud</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Régimen de Afiliación *</label>
                  <select value={formData.affiliation} onChange={e => setFormData({...formData, affiliation: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                    <option value="">Seleccione...</option>
                    {REGIMEN_AFILIACION.map(r => (
                      <option key={r.code} value={r.label}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Aseguradora (EPS) *</label>
                  <select value={formData.eps} onChange={e => setFormData({...formData, eps: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                    <option value="">Seleccione...</option>
                    <optgroup label="Régimen Contributivo">
                      {EPS_LIST.filter(e => e.group === 'Contributivo').map(e => (
                        <option key={e.code} value={e.name}>{e.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Régimen Subsidiado">
                      {EPS_LIST.filter(e => e.group === 'Subsidiado').map(e => (
                        <option key={e.code} value={e.name}>{e.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Régimen de Excepción y Especial">
                      {EPS_LIST.filter(e => e.group === 'Excepción y Especial').map(e => (
                        <option key={e.code} value={e.name}>{e.name}</option>
                      ))}
                    </optgroup>
                    <option value="No asegurado">No asegurado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Prepagada *</label>
                  <select value={formData.prepaid} onChange={e => setFormData({...formData, prepaid: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                    <option value="">Seleccione...</option>
                    <option value="No aplica">No aplica</option>
                    {PREPAGADAS_LIST.map(p => (
                      <option key={p.code} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Plan Complementario *</label>
                  <select value={formData.complementary} onChange={e => setFormData({...formData, complementary: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                    <option value="">Seleccione...</option>
                    <option value="No aplica">No aplica</option>
                    {PLAN_COMPLEMENTARIO_LIST.map(p => (
                      <option key={p.code} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        const mspssQuestions = [
          "Hay una persona especial que está cerca mío cuando la necesito",
          "Hay una persona especial con quien puedo compartir alegrías y tristezas",
          "Mi familia realmente trata de ayudarme",
          "Recibo la ayuda emocional y apoyo que necesito de mi familia",
          "Tengo una persona especial que es una verdadera fuente de consuelo para mí",
          "Mis amigos/as realmente tratan de ayudarme",
          "Puedo contar con mis amigos/as cuando las cosas van mal",
          "Puedo hablar con mi familia de mis problemas",
          "Tengo amigos/as con los que puedo compartir alegrías y tristezas",
          "Hay una persona especial en mi vida a quien le importan mis sentimientos",
          "Mi familia está dispuesta a ayudarme a tomar decisiones",
          "Puedo hablar con mis amigos/as de mis problemas"
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <User className="w-6 h-6 text-blue-600" /> Apoyo Social (MSPSS)
              </h2>
              <ScoreChip {...chipFor('Red de apoyo')} />
            </div>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {mspssQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2" data-keyboard-group={`mspss-${idx}`}>
                    {[
                      { val: 1, label: 'Muy en desacuerdo' },
                      { val: 2, label: 'En desacuerdo' },
                      { val: 3, label: 'Algo en desacuerdo' },
                      { val: 4, label: 'Ni de acuerdo ni en desacuerdo' },
                      { val: 5, label: 'Algo de acuerdo' },
                      { val: 6, label: 'De acuerdo' },
                      { val: 7, label: 'Muy de acuerdo' }
                    ].map(opt => (
                      <label
                        key={opt.val}
                        data-key={opt.val}
                        tabIndex={0}
                        className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer transition-all text-xs text-center ${
                          formData.mspss[idx] === opt.val
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`mspss_${idx}`} 
                          value={opt.val} 
                          checked={formData.mspss[idx] === opt.val}
                          onChange={() => {
                            const newMspss = [...formData.mspss];
                            newMspss[idx] = opt.val;
                            setFormData({...formData, mspss: newMspss});
                          }}
                          className="hidden"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 5:
        const hesQuestions = [
          "Sé muy bien con qué parte(s) del cuidado de mi salud no estoy satisfecho",
          "Soy capaz de alcanzar mis metas de salud mediante planes concretos de acción",
          "Tengo diferentes maneras de superar los obstáculos para lograr mis objetivos de salud",
          "Tener salud me hace sentir mejor",
          "Puedo afrontar el estrés por mis problemas de salud de manera positiva",
          "Puedo solicitar ayuda para cuidar y mantener mi salud cuando lo necesito",
          "Reconozco lo que me motiva para cuidar mi salud",
          "Me conozco lo suficiente para escoger lo que más conviene a mi salud"
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" /> Empoderamiento en Salud (HES)
              </h2>
              <ScoreChip {...chipFor('Empoderamiento')} />
            </div>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {hesQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2" data-keyboard-group={`hes-${idx}`}>
                    {[
                      { val: 1, label: 'Fuertemente en desacuerdo' },
                      { val: 2, label: 'En desacuerdo' },
                      { val: 3, label: 'Ni de acuerdo ni en desacuerdo' },
                      { val: 4, label: 'De acuerdo' },
                      { val: 5, label: 'Fuertemente de acuerdo' }
                    ].map(opt => (
                      <label
                        key={opt.val}
                        data-key={opt.val}
                        tabIndex={0}
                        className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all text-sm text-center ${
                          formData.hes[idx] === opt.val
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`hes_${idx}`} 
                          value={opt.val} 
                          checked={formData.hes[idx] === opt.val}
                          onChange={() => {
                            const newHes = [...formData.hes];
                            newHes[idx] = opt.val;
                            setFormData({...formData, hes: newHes});
                          }}
                          className="hidden"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 6:
        return (
          <AntecedentesStep
            diseases={formData.diseases}
            cie10={formData.cie10}
            onChange={({ diseases, cie10 }) =>
              setFormData({ ...formData, diseases, cie10 })
            }
          />
        );
      case 7:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Pill className="w-6 h-6 text-blue-600" /> Medicamentos
            </h2>
            
            <div className="space-y-4">
              <p className="text-slate-600 font-medium">¿Usted toma medicamentos actualmente?</p>
              <div className="grid grid-cols-2 gap-4" data-keyboard-group="takes-meds-gate">
                <button
                  data-key="1"
                  onClick={() => setFormData({...formData, takesMeds: true})}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${
                    formData.takesMeds === true
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <span className="text-2xl block mb-2">💊</span>
                  <span className="font-bold text-slate-700">Sí, tomo</span>
                </button>
                <button
                  data-key="2"
                  onClick={() => setFormData({...formData, takesMeds: false, medAccess: 0, medAccessReason: 0, arms: Array(12).fill(1)})}
                  className={`p-4 rounded-2xl border-2 text-center transition-all ${
                    formData.takesMeds === false
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <span className="text-2xl block mb-2">❌</span>
                  <span className="font-bold text-slate-700">No tomo</span>
                </button>
              </div>
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Pill className="w-6 h-6 text-blue-600" /> Acceso a Medicamentos
              </h2>
              <ScoreChip {...chipFor('Acceso a medicamentos')} />
            </div>
            <div className="space-y-4">
              <p className="text-slate-600 font-medium">¿Usted tiene acceso a los medicamentos que le son formulados?</p>
              
              <div className="space-y-3" data-keyboard-group="med-access">
                {[
                  { id: 1, label: 'Sí', icon: '✅' },
                  { id: 2, label: 'Parcialmente', icon: '⚠️' },
                  { id: 3, label: 'No', icon: '❌' }
                ].map(opt => (
                  <button
                    key={opt.id}
                    data-key={opt.id}
                    onClick={() => setFormData({...formData, medAccess: opt.id, medAccessReason: opt.id === 1 ? 0 : formData.medAccessReason})}
                    className={`w-full p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
                      formData.medAccess === opt.id
                        ? 'border-blue-600 bg-blue-50 shadow-md'
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="font-bold text-slate-700">{opt.label}</span>
                  </button>
                ))}
              </div>

              {(formData.medAccess === 2 || formData.medAccess === 3) && (
                <div className="mt-8 animate-in fade-in slide-in-from-top-4">
                  <p className="text-slate-600 font-medium mb-4">¿Cuál es la razón principal?</p>
                  <div className="space-y-2" data-keyboard-group="med-access-motivo">
                    {[
                      { id: 1, label: 'Problemas con entrega de la EPS/IPS' },
                      { id: 2, label: 'Medicamento desabastecido' },
                      { id: 3, label: 'Barreras administrativas' },
                      { id: 4, label: 'Medicamento no incluido en PBS' },
                      { id: 5, label: 'Barreras económicas' },
                      { id: 6, label: 'Dificultad para reclamarlo' },
                      { id: 7, label: 'No desea reclamarlo' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        data-key={opt.id}
                        onClick={() => setFormData({...formData, medAccessReason: opt.id})}
                        className={`w-full p-3 rounded-xl border text-left transition-all ${
                          formData.medAccessReason === opt.id
                            ? 'border-blue-600 bg-blue-600 text-white font-bold'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {opt.id}. {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 9:
        const armsQuestions = [
          "¿Con qué frecuencia olvida tomar sus medicinas?",
          "¿Con qué frecuencia decide no tomar sus medicinas?",
          "¿Con qué frecuencia olvida recoger de la farmacia las medicinas que le han recetado?",
          "¿Con qué frecuencia se queda sin medicinas?",
          "¿Con qué frecuencia se salta una dosis de su medicación antes de ir al médico?",
          "¿Con qué frecuencia deja de tomar sus medicinas cuando se encuentra mejor?",
          "¿Con qué frecuencia deja de tomar sus medicinas cuando se encuentra mal?",
          "¿Con qué frecuencia deja de tomar sus medicinas por descuido?",
          "¿Con qué frecuencia cambia la dosis de su medicación y la adapta a sus necesidades (por ejemplo, cuando se toma más o menos pastillas de las que debería)?",
          "¿Con qué frecuencia olvida tomar sus medicinas cuando debe tomarlas más de una vez al día?",
          "¿Con qué frecuencia retrasa ir a recoger sus medicinas de la farmacia porque cuestan demasiado dinero?",
          "¿Con qué frecuencia planifica recoger de la farmacia sus medicinas antes de que se le acaben?"
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Package className="w-6 h-6 text-blue-600" /> Adherencia
              </h2>
              <ScoreChip {...chipFor('Adherencia a medicamentos')} />
            </div>
            <p className="text-slate-600 font-medium">Cuando le formulan algún medicamento...</p>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {armsQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-keyboard-group={`arms-${idx}`}>
                    {[
                      { val: 1, label: 'Nunca' },
                      { val: 2, label: 'Algunas veces' },
                      { val: 3, label: 'Casi siempre' },
                      { val: 4, label: 'Siempre' }
                    ].map(opt => (
                      <label
                        key={opt.val}
                        data-key={opt.val}
                        tabIndex={0}
                        className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all text-sm text-center ${
                          formData.arms[idx] === opt.val
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`arms_${idx}`} 
                          value={opt.val} 
                          checked={formData.arms[idx] === opt.val}
                          onChange={() => {
                            const newArms = [...formData.arms];
                            newArms[idx] = opt.val;
                            setFormData({...formData, arms: newArms});
                          }}
                          className="hidden"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 10:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <HeartPulse className="w-6 h-6 text-blue-600" /> Signos Vitales
              </h2>
              <ScoreChip {...chipFor('Presión arterial')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Presión Arterial Sistólica (PAS) *</label>
                <input type="number" value={formData.vitalSigns.pas} onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, pas: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="Ej. 120" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Presión Arterial Diastólica (PAD) *</label>
                <input type="number" value={formData.vitalSigns.pad} onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, pad: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="Ej. 80" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Frecuencia Cardiaca (HR) *</label>
                <input type="number" value={formData.vitalSigns.hr} onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, hr: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="Ej. 75" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Frecuencia Respiratoria (RR) *</label>
                <input type="number" value={formData.vitalSigns.rr} onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, rr: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="Ej. 16" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Saturación de Oxígeno (SpO2) *</label>
                <input type="number" value={formData.vitalSigns.spo2} onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, spo2: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="Ej. 98" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Temperatura (°C) *</label>
                <input type="number" step="0.1" value={formData.vitalSigns.temp} onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, temp: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="Ej. 36.5" />
              </div>
            </div>
            <div className="border-t border-slate-200 pt-4 mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={formData.vitalSigns.outOfRange} onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, outOfRange: e.target.checked}})} className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="font-bold text-slate-700">¿Algún signo vital está fuera de rango?</span>
              </label>
              {formData.vitalSigns.outOfRange && (
                <div className="mt-4">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Detalles *</label>
                  <textarea value={formData.vitalSigns.outOfRangeDetails} onChange={e => setFormData({...formData, vitalSigns: {...formData.vitalSigns, outOfRangeDetails: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" rows={3} placeholder="Especifique..."></textarea>
                </div>
              )}
            </div>
          </div>
        );
      case 11:
        const heightNum = parseFloat(formData.height) || 0;
        const weightNum = parseFloat(formData.weight) || 0;
        const imc = heightNum > 0 ? weightNum / (heightNum * heightNum) : 0;
        let imcColor = 'bg-green-500';
        let imcText = 'Normal';
        if (imc > 0 && imc < 18.5) { imcColor = 'bg-blue-500'; imcText = 'Bajo peso'; }
        else if (imc >= 25 && imc < 30) { imcColor = 'bg-yellow-500'; imcText = 'Sobrepeso'; }
        else if (imc >= 30) { imcColor = 'bg-red-500'; imcText = 'Obesidad'; }

        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Ruler className="w-6 h-6 text-blue-600" /> Antropometría
              </h2>
              <ScoreChip {...chipFor('Peso')} />
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <label className="block text-lg font-bold text-slate-700 mb-4 flex justify-between items-center">
                <span>¿Cuánto mides? (m)</span>
                <input 
                  type="number" 
                  min="1.30" max="2.20" step="0.01" 
                  value={formData.height}
                  onChange={e => setFormData({...formData, height: e.target.value})}
                  className="w-24 p-2 text-right rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-blue-600 font-bold"
                />
              </label>
              <input 
                type="range" min="1.30" max="2.20" step="0.01" 
                value={formData.height} 
                onChange={e => setFormData({...formData, height: String(parseFloat(e.target.value))})}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
              <label className="block text-lg font-bold text-slate-700 mb-4 flex justify-between items-center">
                <span>¿Cuánto pesas aproximadamente? (kg)</span>
                <input 
                  type="number" 
                  min="30" max="200" step="0.5" 
                  value={formData.weight}
                  onChange={e => setFormData({...formData, weight: e.target.value})}
                  className="w-24 p-2 text-right rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-blue-600 font-bold"
                />
              </label>
              <input 
                type="range" min="30" max="200" step="0.5" 
                value={formData.weight} 
                onChange={e => setFormData({...formData, weight: String(parseFloat(e.target.value))})}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="font-bold text-slate-600">IMC Calculado:</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black">{imc.toFixed(1)}</span>
                <span className={`px-3 py-1 rounded-full text-white text-xs font-bold ${imcColor}`}>
                  {imcText}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">% Grasa Corporal</label>
                <input type="number" step="0.1" value={formData.bodyFat} onChange={e => setFormData({...formData, bodyFat: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="Ej. 20.5" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Perímetro Cuello (cm)</label>
                <input type="number" step="0.1" value={formData.neckCirc} onChange={e => setFormData({...formData, neckCirc: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="Ej. 35" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Perímetro Abdominal (cm)</label>
                <input type="number" step="0.1" value={formData.waistCirc} onChange={e => setFormData({...formData, waistCirc: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" placeholder="Ej. 85" />
              </div>
            </div>
          </div>
        );
      case 12:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" /> Paraclínicos
              </h2>
              <div className="flex flex-wrap gap-2">
                <ScoreChip {...chipFor('Colesterol')} />
                <ScoreChip {...chipFor('Glucosa')} />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Perfil Lipídico</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha del Examen</label>
                  <input type="date" value={formData.paraclinics.lipidDate} onChange={e => setFormData({...formData, paraclinics: {...formData.paraclinics, lipidDate: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Colesterol Total</label>
                  <input type="number" value={formData.paraclinics.totalChol} onChange={e => setFormData({...formData, paraclinics: {...formData.paraclinics, totalChol: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">HDL</label>
                  <input type="number" value={formData.paraclinics.hdl} onChange={e => setFormData({...formData, paraclinics: {...formData.paraclinics, hdl: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">LDL</label>
                  <input type="number" value={formData.paraclinics.ldl} onChange={e => setFormData({...formData, paraclinics: {...formData.paraclinics, ldl: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Triglicéridos</label>
                  <input type="number" value={formData.paraclinics.triglycerides} onChange={e => setFormData({...formData, paraclinics: {...formData.paraclinics, triglycerides: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Hemoglobina Glicosilada (HbA1c)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Fecha del Examen</label>
                  <input type="date" value={formData.paraclinics.hba1cDate} onChange={e => setFormData({...formData, paraclinics: {...formData.paraclinics, hba1cDate: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">HbA1c (%)</label>
                  <input type="number" step="0.1" value={formData.paraclinics.hba1c} onChange={e => setFormData({...formData, paraclinics: {...formData.paraclinics, hba1c: e.target.value}})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>
          </div>
        );
      case 13: {
        const setHasActivity = (v: boolean) => {
          if (v === false) {
            setFormData({ ...formData, hasSexualActivity: false, iief: Array(5).fill(0) });
          } else {
            setFormData({ ...formData, hasSexualActivity: true });
          }
        };
        const setIiefAnswer = (idx: number, val: number) => {
          const newIief = [...formData.iief];
          newIief[idx] = val;
          setFormData({ ...formData, iief: newIief });
        };
        const iiefQuestions: { question: string; options: { val: number; label: string }[] }[] = [
          {
            question: '¿Cómo calificarías tu confianza para conseguir y mantener una erección?',
            options: [
              { val: 1, label: 'Muy bajo' },
              { val: 2, label: 'Bajo' },
              { val: 3, label: 'Moderado' },
              { val: 4, label: 'Alto' },
              { val: 5, label: 'Muy alto' },
            ],
          },
          {
            question: '¿Con qué frecuencia tus erecciones fueron suficientemente firmes para penetrar a tu pareja?',
            options: [
              { val: 1, label: 'Casi nunca' },
              { val: 2, label: 'Pocas veces' },
              { val: 3, label: 'A veces' },
              { val: 4, label: 'La mayoría de las veces' },
              { val: 5, label: 'Casi siempre' },
            ],
          },
          {
            question: 'Durante las relaciones sexuales, ¿con qué frecuencia mantuviste la erección después de penetrar a tu pareja?',
            options: [
              { val: 1, label: 'Casi nunca' },
              { val: 2, label: 'Pocas veces' },
              { val: 3, label: 'A veces' },
              { val: 4, label: 'La mayoría de las veces' },
              { val: 5, label: 'Casi siempre' },
            ],
          },
          {
            question: 'Durante el coito, ¿qué tan difícil fue mantener la erección hasta completar el acto?',
            options: [
              { val: 1, label: 'Extremadamente difícil' },
              { val: 2, label: 'Muy difícil' },
              { val: 3, label: 'Difícil' },
              { val: 4, label: 'Algo difícil' },
              { val: 5, label: 'Sin dificultad' },
            ],
          },
          {
            question: 'Cuando intentaste tener relaciones, ¿qué tan satisfactorias fueron?',
            options: [
              { val: 1, label: 'Nada satisfactorias' },
              { val: 2, label: 'Poco satisfactorias' },
              { val: 3, label: 'Moderadamente satisfactorias' },
              { val: 4, label: 'Muy satisfactorias' },
              { val: 5, label: 'Extremadamente satisfactorias' },
            ],
          },
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" /> Salud Sexual
              </h2>
              {formData.gender === 'Masculino' && formData.hasSexualActivity === true && (
                <ScoreChip {...chipFor('Disfunción eréctil')} />
              )}
            </div>
            <p className="text-slate-600 font-medium">¿Tienes actividad sexual?</p>
            <div className="grid grid-cols-2 gap-4" data-keyboard-group="sex-activity-gate">
              <button
                type="button"
                data-key="1"
                onClick={() => setHasActivity(true)}
                aria-pressed={formData.hasSexualActivity === true}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  formData.hasSexualActivity === true
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <span className="text-2xl block mb-2" aria-hidden="true">✓</span>
                <span className="font-bold text-slate-700">Sí</span>
              </button>
              <button
                type="button"
                data-key="2"
                onClick={() => setHasActivity(false)}
                aria-pressed={formData.hasSexualActivity === false}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  formData.hasSexualActivity === false
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <span className="text-2xl block mb-2" aria-hidden="true">✗</span>
                <span className="font-bold text-slate-700">No</span>
              </button>
            </div>

            {formData.hasSexualActivity === true && (
              <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {iiefQuestions.map((q, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q.question}</p>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2" data-keyboard-group={`iief-${idx}`}>
                      {q.options.map(opt => (
                        <label
                          key={opt.val}
                          data-key={opt.val}
                          tabIndex={0}
                          className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer transition-all text-xs text-center ${
                            formData.iief[idx] === opt.val
                              ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`iief_${idx}`}
                            value={opt.val}
                            checked={formData.iief[idx] === opt.val}
                            onChange={() => setIiefAnswer(idx, opt.val)}
                            className="hidden"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }
      case 14:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Tabaquismo
            </h2>
            <p className="text-slate-600 font-medium">¿Alguna vez se ha expuesto a nicotina? (fumar o vapear)</p>

            <div className="grid grid-cols-2 gap-4" data-keyboard-group="smoked-gate">
              <button
                data-key="1"
                onClick={() => setFormData({...formData, smoked: true})}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  formData.smoked === true
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <span className="text-4xl block mb-2">✅</span>
                <span className="font-bold text-slate-700">Sí</span>
              </button>
              <button
                data-key="2"
                onClick={() => setFormData({...formData, smoked: false, smokeStatus: []})}
                className={`p-6 rounded-2xl border-2 text-center transition-all ${
                  formData.smoked === false
                    ? 'border-blue-600 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <span className="text-4xl block mb-2">❌</span>
                <span className="font-bold text-slate-700">No</span>
              </button>
            </div>
          </div>
        );
      case 15:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" /> Tabaquismo
              </h2>
              <ScoreChip {...chipFor('Nicotina')} />
            </div>
            <p className="text-slate-600 font-medium mb-4">¿Cuál es tu situación actual?</p>
            <div className="space-y-2" data-keyboard-group="nicotina">
              {[
                { id: 6, label: 'Fumador actual de cigarrillo', key: 1 },
                { id: 5, label: 'Fumador actual de cigarrillo electrónico/vapeador', key: 2 },
                { id: 4, label: 'Exfumador, suspendido hace < 1 año', key: 3 },
                { id: 3, label: 'Exfumador, suspendido hace 1-5 años', key: 4 },
                { id: 2, label: 'Exfumador, suspendido hace más de 5 años', key: 5 }
              ].map(opt => {
                const isSelected = formData.smokeStatus.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    data-key={opt.key}
                    onClick={() => {
                      let newStatus = [...formData.smokeStatus];
                      if (isSelected) {
                        newStatus = newStatus.filter(id => id !== opt.id);
                      } else {
                        if (opt.id <= 4) {
                          newStatus = [opt.id];
                        } else {
                          newStatus = newStatus.filter(id => id > 4);
                          newStatus.push(opt.id);
                        }
                      }
                      setFormData({...formData, smokeStatus: newStatus});
                    }}
                    className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' 
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 16: {
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Dumbbell className="w-6 h-6 text-blue-600" /> Actividad Física y Sueño
              </h2>
              <div className="flex flex-wrap gap-2">
                <ScoreChip {...chipFor('Actividad física')} />
                <ScoreChip {...chipFor('Sueño')} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <label className="block text-slate-700 font-bold mb-2" htmlFor="activity-minutes">
                En promedio, ¿cuántos minutos a la semana dedica a actividades físicas moderadas o vigorosas?
              </label>
              <p className="text-slate-500 text-sm mb-4">
                Caminar rápido, montar bicicleta, nadar, correr, etc.
              </p>
              <div className="flex items-center gap-3">
                <input
                  id="activity-minutes"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={1440}
                  step={1}
                  value={formData.activity}
                  onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                  className="w-40 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="0"
                />
                <span className="text-slate-600 text-sm">minutos por semana</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Rango aceptado: 0 a 1440 minutos.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <label className="block text-slate-700 font-bold mb-4" htmlFor="sleep-hours">
                En promedio, ¿cuántas horas duerme por noche?
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="sleep-hours"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={24}
                  step={0.5}
                  value={formData.sleep}
                  onChange={(e) => setFormData({ ...formData, sleep: e.target.value })}
                  className="w-40 rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="0"
                />
                <span className="text-slate-600 text-sm">horas por noche</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Rango aceptado: 0 a 24 horas, incrementos de 0.5.</p>
            </div>
          </div>
        );
      }
      case 17:
        const phq9Questions = [
          "Poco interés o placer en hacer las cosas",
          "Se ha sentido decaído(a), deprimido(a) o sin esperanzas",
          "Ha tenido dificultad para quedarse o permanecer dormido(a), o ha dormido demasiado",
          "Se ha sentido cansado(a) o con poca energía",
          "Sin apetito o ha comido en exceso",
          "Se ha sentido mal con usted mismo(a) - o que es un fracaso o que ha quedado mal con usted mismo(a) o con su familia",
          "Ha tenido dificultad para concentrarse en ciertas actividades, tales como leer el periódico o ver la televisión",
          "¿Se ha movido o hablado tan lento que otras personas podrían haberlo notado? - o lo contrario - muy inquieto(a) o agitado(a) que ha estado moviéndose mucho más de lo normal",
          "Pensamientos de que estaría mejor muerto(a) o de lastimarse de alguna manera"
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" /> Salud Mental (PHQ-9)
              </h2>
              <ScoreChip {...chipFor('Salud mental')} />
            </div>
            <p className="text-slate-600 font-medium">Durante las últimas 2 semanas, ¿qué tan a menudo le han afectado alguno de los siguientes problemas?</p>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {phq9Questions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2" data-keyboard-group={`phq9-${idx}`}>
                    {[
                      { val: 0, label: 'Ningún día', dkey: 1 },
                      { val: 1, label: 'Varios días', dkey: 2 },
                      { val: 2, label: 'Más de la mitad de los días', dkey: 3 },
                      { val: 3, label: 'Casi todos los días', dkey: 4 }
                    ].map(opt => (
                      <label
                        key={opt.val}
                        data-key={opt.dkey}
                        tabIndex={0}
                        className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer transition-all text-xs text-center ${
                          formData.phq9[idx] === opt.val
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`phq9_${idx}`} 
                          value={opt.val} 
                          checked={formData.phq9[idx] === opt.val}
                          onChange={() => {
                            const newPhq9 = [...formData.phq9];
                            newPhq9[idx] = opt.val;
                            setFormData({...formData, phq9: newPhq9});
                          }}
                          className="hidden"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              {formData.phq9.some(v => v > 0) && (
                <div className="bg-blue-50 p-5 rounded-2xl border border-blue-200 shadow-sm mt-8">
                  <p className="font-bold text-slate-700 mb-4">Si marcó cualquiera de los problemas, ¿qué tanta dificultad le han dado estos problemas para hacer su trabajo, encargarse de las tareas del hogar, o llevarse bien con las personas?</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2" data-keyboard-group="phq9-dif">
                    {[
                      { val: 0, label: 'No ha sido difícil', dkey: 1 },
                      { val: 1, label: 'Un poco difícil', dkey: 2 },
                      { val: 2, label: 'Muy difícil', dkey: 3 },
                      { val: 3, label: 'Extremadamente difícil', dkey: 4 }
                    ].map(opt => (
                      <label
                        key={opt.val}
                        data-key={opt.dkey}
                        tabIndex={0}
                        className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all text-sm text-center ${
                          formData.phq9Difficulty === opt.val
                            ? 'border-blue-600 bg-blue-600 text-white font-bold'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="phq9Difficulty" 
                          value={opt.val} 
                          checked={formData.phq9Difficulty === opt.val}
                          onChange={() => setFormData({...formData, phq9Difficulty: opt.val})}
                          className="hidden"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      case 18: {
        const foodQuestions: { q: string; options: { label: string; val: 0 | 1 | 2 }[] }[] = [
          {
            q: "¿Cuántas veces a la semana comió usted comida rápida o golosinas o bocadillos?",
            options: [
              { label: "menos de 1", val: 0 },
              { label: "1-3", val: 1 },
              { label: "4 o más", val: 2 },
            ],
          },
          {
            q: "¿Cuántas porciones de frutas comió cada día?",
            options: [
              { label: "5 o más", val: 0 },
              { label: "3-4", val: 1 },
              { label: "2 o menos", val: 2 },
            ],
          },
          {
            q: "¿Cuántas porciones de verduras comió cada día?",
            options: [
              { label: "5 o más", val: 0 },
              { label: "3-4", val: 1 },
              { label: "2 o menos", val: 2 },
            ],
          },
          {
            q: "¿Cuántas sodas o vasos de té dulce tomó cada día?",
            options: [
              { label: "menos de 1", val: 0 },
              { label: "1-2", val: 1 },
              { label: "3 o más", val: 2 },
            ],
          },
          {
            q: "¿Cuántas veces a la semana comió frijoles (pintos o negros), pollo, o pescado?",
            options: [
              { label: "3 o más", val: 0 },
              { label: "1-2", val: 1 },
              { label: "menos de 1", val: 2 },
            ],
          },
          {
            q: "¿Cuántas veces a la semana comió papalinas, papas fritas o galletas (no dietéticas)?",
            options: [
              { label: "1 o menos", val: 0 },
              { label: "2-3", val: 1 },
              { label: "4 o más", val: 2 },
            ],
          },
          {
            q: "¿Cuántas veces a la semana comió postres y otras golosinas (no dietéticas)?",
            options: [
              { label: "1 o menos", val: 0 },
              { label: "2-3", val: 1 },
              { label: "4 o más", val: 2 },
            ],
          },
          {
            q: "¿Cuánta margarina, mantequilla, o grasa de carne usó para sazonar los vegetales, o puso en las papas, carne, o maíz?",
            options: [
              { label: "muy poca", val: 0 },
              { label: "algo de", val: 1 },
              { label: "mucha", val: 2 },
            ],
          },
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                <Activity className="w-6 h-6 text-blue-600" /> Evaluación de alimentación
              </h2>
              <ScoreChip {...chipFor('Alimentación')} />
            </div>
            <p className="text-slate-600 font-medium">Menor puntaje = mejor patrón alimentario.</p>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {foodQuestions.map((item, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {item.q}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2" data-keyboard-group={`medas-${idx}`}>
                    {item.options.map((opt, optIdx) => (
                      <label
                        key={opt.val}
                        data-key={optIdx + 1}
                        tabIndex={0}
                        className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all text-sm font-bold text-center ${
                          formData.medas[idx] === opt.val
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`food_${idx}`}
                          value={opt.val}
                          checked={formData.medas[idx] === opt.val}
                          onChange={() => {
                            const newMedas = [...formData.medas];
                            newMedas[idx] = opt.val;
                            setFormData({...formData, medas: newMedas});
                          }}
                          className="hidden"
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 19:
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-6 py-12 animate-in fade-in duration-500">
            <div className="w-full max-w-md h-32 relative overflow-hidden flex items-center justify-center">
               <svg viewBox="0 0 500 100" className="w-full h-full stroke-blue-600 fill-none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                 <path 
                   className="animate-[ekg_3s_linear_infinite]" 
                   strokeDasharray="1000" 
                   strokeDashoffset="1000" 
                   d="M 0 50 L 150 50 L 170 20 L 190 80 L 210 10 L 230 90 L 250 50 L 500 50" 
                 />
               </svg>
               <style>{`
                 @keyframes ekg {
                   0% { stroke-dashoffset: 1000; }
                   50% { stroke-dashoffset: 0; }
                   100% { stroke-dashoffset: -1000; }
                 }
               `}</style>
            </div>
            <h2 className="text-2xl font-black text-slate-800">Estamos usando nuestras fórmulas matemáticas creadas para ti...</h2>
            <p className="text-slate-500">Estamos creando tu reporte PDF...</p>
          </div>
        );
      case 20:
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-8 py-8 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-2">
              <span className="text-5xl">🎉</span>
            </div>
            <h2 className="text-3xl font-black text-slate-800">¡Tu reporte está listo!</h2>
            <p className="text-slate-600 max-w-md">
              Puedes acceder a tu reporte personalizado a continuación.
            </p>
            
            <div className="flex flex-col w-full max-w-md gap-4 mt-8">
              <button 
                onClick={() => onComplete(generateUrl())}
                className="w-full bg-blue-600 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:bg-blue-700 hover:-translate-y-1 transition-all"
              >
                Ver mi Reporte Completo →
              </button>
              
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="text-green-700 text-sm font-bold">
                  ✅ Una copia ha sido enviada al correo electrónico proporcionado.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
      <div className="w-full max-w-4xl bg-white rounded-[2.5rem] shadow-xl p-8 md:p-12 relative">
        {step > 0 && step <= totalSteps && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-bold text-slate-400">
                <span>Paso {step} de {totalSteps}</span>
                <span className="ml-2">{Math.round((step / totalSteps) * 100)}%</span>
              </div>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-amber-500 text-xl">💡</span>
              <div className="text-sm text-amber-800">
                <strong>Recordatorio para Auxiliar de Enfermería:</strong> {getCaimedMessage(step)} <a href="https://pagina-caimeddd.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline ml-1">Ver principios CAIMED</a>
              </div>
            </div>
          </div>
        )}

        {renderStep()}

        {step > 0 && step <= totalSteps && !editMode && (
          <div className="mt-12 flex justify-between items-center pt-6 border-t border-slate-100">
            <button
              onClick={handlePrev}
              className={`px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all ${step === 1 ? 'invisible' : ''}`}
            >
              Atrás
            </button>
            <button
              onClick={step === totalSteps ? calculateFinalUrl : handleNext}
              disabled={!isStepValid() || isSubmitting}
              className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                isStepValid() && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:-translate-y-1'
                  : 'bg-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? 'Procesando...' : (step === totalSteps ? 'Finalizar' : 'Siguiente')}
            </button>
          </div>
        )}

        {editMode && (
          <div className="mt-12 flex justify-end items-center pt-6 border-t border-slate-100">
            <button
              onClick={() => onComplete(generateUrl())}
              disabled={!isStepValid() || isSubmitting}
              className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all ${
                isStepValid() && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:-translate-y-1'
                  : 'bg-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              Guardar cambios
            </button>
          </div>
        )}
      </div>
      
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-5 fade-in duration-300 z-50 max-w-lg border border-blue-400/30">
          <HeartPulse className="w-8 h-8 shrink-0 text-blue-200" aria-hidden="true" />
          <p className="font-medium text-sm leading-relaxed flex-1">{toastMsg}</p>
          <button
            type="button"
            onClick={() => {
              if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
              setToastMsg('');
            }}
            className="shrink-0 p-1 rounded-md hover:bg-white/15 transition-colors"
            aria-label="Cerrar mensaje"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
