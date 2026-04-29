"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  HeartPulse, User, CreditCard, Calendar, Phone, Mail,
  Ruler, Scale, Activity, Pill, Package, Moon, Dumbbell,
  Check, ChevronRight, ChevronLeft, Loader2, Link as LinkIcon, CheckCircle2, FileText
} from 'lucide-react';
import TermsModal from './TermsModal';
import { colombia } from '@/lib/clinical/data/colombia';
import { countries } from '@/lib/clinical/data/countries';

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
}

export default function Questionnaire({ onComplete }: QuestionnaireProps) {
  const [step, setStep] = useState(0);
  const totalSteps = 18;
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (step > 0 && step <= totalSteps) {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setToastMsg(getCaimedMessage(step));
      toastTimeoutRef.current = setTimeout(() => setToastMsg(''), 6000);
    }
  }, [step]);

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
    erectileDysfunction: Array(6).fill(0),
    phq9: Array(9).fill(0),
    phq9Difficulty: 0,
    medas: Array(14).fill(-1)
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState('');

  const handleNext = () => {
    if (step === 0) {
      if (password === 'CAIMEDCARDIOPREVENTIVA2026*') {
        setPasswordError(false);
        setStep(1);
      } else {
        setPasswordError(true);
      }
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
    if (step === 10 && formData.takesMeds === false) {
      setStep(7);
    } else if (step === 14 && formData.gender !== 'Masculino') {
      setStep(12);
    } else if (step === 16 && formData.smoked === false) {
      setStep(14);
    } else if (step > 0) {
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
      nombre,
      doc,
      fecha_nac,
      sca: sca.toString(),
      dm2: dm2.toString(),
      comorbidities: hasComorbidities.toString(),
      peso: peso.toFixed(1),
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
      takesMeds: formData.takesMeds ? 'true' : 'false'
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
      case 0: return password === 'CAIMEDCARDIOPREVENTIVA2026*';
      case 1: return true;
      case 2: return formData.consent;
      case 3: 
        return formData.firstName && formData.firstLastName && formData.docNumber && formData.dob && formData.email && formData.phone && formData.gender && formData.birthCountry && formData.residenceCountry && (formData.residenceCountry !== 'Colombia' || (formData.residenceDept && formData.residenceMun)) && formData.address && formData.emergencyName && formData.emergencyRelation && formData.emergencyPhone && formData.affiliation && formData.eps && formData.prepaid && formData.complementary;
      case 4: return formData.mspss.every(v => v > 0);
      case 5: return formData.hes.every(v => v > 0);
      case 6: return formData.diseases.length > 0;
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
      case 13: return formData.gender !== 'Masculino' || formData.erectileDysfunction.every(v => v >= 0);
      case 14: return formData.smoked !== null;
      case 15: return formData.smoked === false || formData.smokeStatus.length > 0;
      case 16: return formData.activity !== '' && formData.sleep !== '';
      case 17: return formData.phq9.every(v => v >= 0) && (formData.phq9.some(v => v > 0) ? formData.phq9Difficulty >= 0 : true);
      case 18: return formData.medas.every(v => v >= 0);
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <h1 className="text-4xl font-black text-white tracking-tight relative z-10">Acceso Restringido</h1>
            <p className="text-lg font-medium text-blue-200 relative z-10">Por favor, ingrese la contraseña para continuar.</p>
            <div className="w-full max-w-md relative z-10">
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full p-4 rounded-xl border-2 border-white/20 bg-white/10 text-white placeholder-blue-200 focus:border-white focus:ring-2 focus:ring-white/50 outline-none transition-all text-center text-xl tracking-widest"
                placeholder="Contraseña"
              />
              {passwordError && <p className="text-red-300 mt-2 font-bold">Contraseña incorrecta</p>}
            </div>
          </div>
        );
      case 1:
        return (
          <div className="flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 pointer-events-none flex items-center justify-center">
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
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-white/20 relative z-10">
              <HeartPulse className="w-12 h-12 text-blue-300 animate-pulse" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight relative z-10">¡Bienvenido, Equipo CAIMED!</h1>
            <p className="text-lg font-medium text-blue-200 relative z-10 max-w-2xl">
              Recuerda hacer sentir al paciente "como en casa" y muy cómodo para aplicar el cuestionario. Al final del cuestionario automáticamente se le enviará al paciente el correo con el PDF del reporte respectivo.
            </p>
            <div className="bg-white/10 p-6 rounded-2xl border border-white/20 mt-6 relative z-10 text-left">
              <h3 className="text-xl font-bold text-white mb-2">Nuestra Filosofía</h3>
              <p className="text-blue-100 mb-4 font-medium">Tu copiloto en salud. No tu médico de urgencias.</p>
              <p className="text-blue-100 mb-4 text-sm leading-relaxed">
                Complementamos tu atención médica tradicional con educación en salud, prevención estratégica y un modelo de monitoreo inteligente diseñado específicamente para adultos que quieren vivir con tranquilidad.
              </p>
              <blockquote className="border-l-4 border-blue-400 pl-4 italic text-blue-200 text-sm">
                "Al igual que cambias el aceite de tu carro cada 10.000 km —aunque funcione bien— tu corazón necesita mantenimiento preventivo. No esperes a que el motor falle."
                <br/><span className="font-bold mt-2 block">— Equipo CAIMED</span>
              </blockquote>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Check className="w-6 h-6 text-blue-600" /> Autorización de Datos
            </h2>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-sm text-slate-600 leading-relaxed">
              "Autorizo de manera libre, expresa e informada a CAIMED S.A.S. para el tratamiento de mis datos personales y datos sensibles relacionados con mi salud, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y la Política de Tratamiento de Datos PL-PCG-001 de CAIMED S.A.S., con el fin de realizar el Chequeo Cardiovascular Express, generar un reporte de mis resultados y enviarlos a mi correo electrónico."
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
                    <option value="01 - Contributivo">01 - Contributivo</option>
                    <option value="02 - Subsidiado">02 - Subsidiado</option>
                    <option value="03 - Vinculado">03 - Vinculado</option>
                    <option value="04 - Particular">04 - Particular</option>
                    <option value="05 - Excepción (Fuerzas Militares)">05 - Excepción (Fuerzas Militares)</option>
                    <option value="06 - Excepción (Policía Nacional)">06 - Excepción (Policía Nacional)</option>
                    <option value="07 - Excepción (Magisterio - FOMAG)">07 - Excepción (Magisterio - FOMAG)</option>
                    <option value="08 - Excepción (ECOPETROL)">08 - Excepción (ECOPETROL)</option>
                    <option value="09 - Excepción (Universidades Públicas)">09 - Excepción (Universidades Públicas)</option>
                    <option value="10 - Especial (Congreso)">10 - Especial (Congreso)</option>
                    <option value="11 - Especial (Banco de la República)">11 - Especial (Banco de la República)</option>
                    <option value="12 - Especial (DIAN)">12 - Especial (DIAN)</option>
                    <option value="13 - Especial (Magistratura)">13 - Especial (Magistratura)</option>
                    <option value="14 - Especial (CTI)">14 - Especial (CTI)</option>
                    <option value="15 - Especial (INPEC)">15 - Especial (INPEC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Aseguradora (EPS) *</label>
                  <select value={formData.eps} onChange={e => setFormData({...formData, eps: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                    <option value="">Seleccione...</option>
                    <optgroup label="Régimen Contributivo">
                      <option value="Aliansalud EPS">Aliansalud EPS</option>
                      <option value="Compensar EPS">Compensar EPS</option>
                      <option value="Coosalud EPS">Coosalud EPS</option>
                      <option value="EPS Sanitas">EPS Sanitas</option>
                      <option value="EPS Sura">EPS Sura</option>
                      <option value="Famisanar">Famisanar</option>
                      <option value="Nueva EPS">Nueva EPS</option>
                      <option value="Salud Total EPS">Salud Total EPS</option>
                      <option value="SOS EPS">SOS EPS</option>
                    </optgroup>
                    <optgroup label="Régimen Subsidiado">
                      <option value="Asmet Salud">Asmet Salud</option>
                      <option value="Cajacopi EPS">Cajacopi EPS</option>
                      <option value="Capital Salud">Capital Salud</option>
                      <option value="Capresoca EPS">Capresoca EPS</option>
                      <option value="Comfachoco">Comfachoco</option>
                      <option value="Comfaguajira">Comfaguajira</option>
                      <option value="Comfaoriente">Comfaoriente</option>
                      <option value="Comfasucre">Comfasucre</option>
                      <option value="Coosalud EPS (Subsidiado)">Coosalud EPS (Subsidiado)</option>
                      <option value="Dusakawi">Dusakawi</option>
                      <option value="Ecoopsos">Ecoopsos</option>
                      <option value="Emssanar">Emssanar</option>
                      <option value="Mallamas">Mallamas</option>
                      <option value="Mutual Ser">Mutual Ser</option>
                      <option value="Pijaos Salud">Pijaos Salud</option>
                      <option value="Savia Salud">Savia Salud</option>
                    </optgroup>
                    <optgroup label="Excepción / Especial">
                      <option value="FFMM (Fuerzas Militares)">FFMM (Fuerzas Militares)</option>
                      <option value="Policía Nacional">Policía Nacional</option>
                      <option value="Magisterio (FOMAG)">Magisterio (FOMAG)</option>
                      <option value="ECOPETROL">ECOPETROL</option>
                      <option value="Universidad Pública">Universidad Pública</option>
                      <option value="INPEC">INPEC</option>
                    </optgroup>
                    <option value="No asegurado">No asegurado</option>
                    <option value="Otra">Otra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Prepagada *</label>
                  <select value={formData.prepaid} onChange={e => setFormData({...formData, prepaid: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                    <option value="">Seleccione...</option>
                    <option value="No aplica">No aplica</option>
                    <option value="Allianz">Allianz</option>
                    <option value="AXA Colpatria">AXA Colpatria</option>
                    <option value="Colsanitas">Colsanitas</option>
                    <option value="Compensar">Compensar</option>
                    <option value="Coomeva">Coomeva</option>
                    <option value="Medisanitas">Medisanitas</option>
                    <option value="Medplus">Medplus</option>
                    <option value="Seguros Bolívar">Seguros Bolívar</option>
                    <option value="Sura">Sura</option>
                    <option value="Otra">Otra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Plan Complementario *</label>
                  <select value={formData.complementary} onChange={e => setFormData({...formData, complementary: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none">
                    <option value="">Seleccione...</option>
                    <option value="No aplica">No aplica</option>
                    <option value="Compensar">Compensar</option>
                    <option value="Famisanar">Famisanar</option>
                    <option value="Nueva EPS">Nueva EPS</option>
                    <option value="Salud Total">Salud Total</option>
                    <option value="Sanitas">Sanitas</option>
                    <option value="Sura">Sura</option>
                    <option value="Otra">Otra</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      case 4:
        const mspssQuestions = [
          "Hay una persona especial con quien puedo compartir mis alegrías y tristezas.",
          "Tengo a alguien que es una verdadera fuente de consuelo para mí.",
          "Mi familia trata de ayudarme de verdad.",
          "Consigo la ayuda y el apoyo emocional que necesito de mi familia.",
          "Tengo una persona especial que me consuela cuando lo necesito.",
          "Mis amigos intentan ayudarme de verdad.",
          "Puedo contar con mis amigos cuando las cosas van mal.",
          "Puedo hablar de mis problemas con mi familia.",
          "Tengo amigos con los que puedo compartir mis alegrías y tristezas.",
          "Hay una persona especial en mi vida que se preocupa por mis sentimientos.",
          "Mi familia está dispuesta a ayudarme a tomar decisiones.",
          "Puedo hablar de mis problemas con mis amigos."
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <User className="w-6 h-6 text-blue-600" /> Apoyo Social (MSPSS)
            </h2>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {mspssQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
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
          "Para mí es fácil entender la información de salud.",
          "Entiendo bien las instrucciones del médico o farmacéutico.",
          "Me resulta fácil encontrar información sobre salud.",
          "Puedo evaluar si la información de salud es confiable.",
          "Sé dónde conseguir ayuda si no entiendo algo sobre mi salud.",
          "Puedo usar la información de salud para tomar decisiones.",
          "Me siento seguro/a al hablar con los profesionales de salud.",
          "Puedo seguir las instrucciones sobre cómo tomar mis medicamentos."
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Alfabetización en Salud (HES)
            </h2>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {hesQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {[
                      { val: 1, label: 'Fuertemente en desacuerdo' },
                      { val: 2, label: 'En desacuerdo' },
                      { val: 3, label: 'Ni de acuerdo ni en desacuerdo' },
                      { val: 4, label: 'De acuerdo' },
                      { val: 5, label: 'Fuertemente de acuerdo' }
                    ].map(opt => (
                      <label 
                        key={opt.val} 
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
        const toggleDisease = (d: string) => {
          if (d === 'Ninguna' || d === 'No sé qué enfermedad tengo') {
            setFormData({...formData, diseases: [d]});
          } else {
            const newD = formData.diseases.includes(d) 
              ? formData.diseases.filter(x => x !== d)
              : [...formData.diseases.filter(x => x !== 'Ninguna' && x !== 'No sé qué enfermedad tengo'), d];
            setFormData({...formData, diseases: newD});
          }
        };
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Antecedentes
            </h2>
            <p className="text-slate-600 font-medium">¿Tienes diagnóstico de alguna de las siguientes enfermedades?</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-2">
              {[
                { id: 'Diabetes', icon: '🩸' },
                { id: 'Hipertensión', icon: '💊' },
                { id: 'Dislipidemia', icon: '🫀' },
                { id: 'Infarto cardiaco', icon: '⚡' },
                { id: 'Trombosis cerebral', icon: '🧠' },
                { id: 'Otra patología cardiaca', icon: '❤️', label: 'Tengo otra patología relacionada con el corazón' },
                { id: 'Colesterol alto', icon: '🩸' },
                { id: 'Triglicéridos altos', icon: '🩸' },
                { id: 'HDL bajo ("colesterol bueno bajo")', icon: '🩸' },
                { id: 'Prediabetes', icon: '🩸' },
                { id: 'Azúcar alta en ayunas', icon: '🩸' },
                { id: 'Resistencia a la insulina', icon: '🩸' },
                { id: 'Sobrepeso u obesidad', icon: '⚖️' },
                { id: 'Grasa en el abdomen', icon: '⚖️' },
                { id: 'Hígado graso', icon: '🩺' },
                { id: 'Tiroides baja (hipotiroidismo)', icon: '🦋' },
                { id: 'Tiroides alta (hipertiroidismo)', icon: '🦋' },
                { id: 'Síndrome de Cushing', icon: '🩺' },
                { id: 'Presión arterial alta', icon: '💊' },
                { id: 'Apnea del sueño (ronquido con pausas al respirar)', icon: '😴' },
                { id: 'Síndrome de ovario poliquístico', icon: '🩺' },
                { id: 'Menopausia antes de los 40 años', icon: '🩺' },
                { id: 'Preeclampsia en un embarazo anterior', icon: '🤰' },
                { id: 'Enfermedad del riñón', icon: '🩺' },
                { id: 'Proteína en la orina', icon: '🩺' },
                { id: 'Artritis reumatoide', icon: '🦴' },
                { id: 'Lupus', icon: '🦋' },
                { id: 'Psoriasis', icon: '🩺' },
                { id: 'Colitis o enfermedad de Crohn', icon: '🩺' },
                { id: 'Anemia crónica', icon: '🩸' },
                { id: 'VIH', icon: '🩺' },
                { id: 'Chagas', icon: '🩺' },
                { id: 'COVID-19 con complicaciones', icon: '🦠' },
                { id: 'Depresión', icon: '🧠' },
                { id: 'Trastorno bipolar', icon: '🧠' },
                { id: 'Esquizofrenia', icon: '🧠' },
                { id: 'Tratamiento con quimioterapia o radioterapia en el pecho', icon: '☢️' },
                { id: 'Cáncer activo', icon: '🎗️' },
                { id: 'Várices con trombosis', icon: '🩸' },
                { id: 'Trombosis venosa profunda', icon: '🩸' },
                { id: 'Coágulos recurrentes', icon: '🩸' },
                { id: 'Ninguna', icon: '❌', label: 'Ninguna de las anteriores' },
                { id: 'No sé qué enfermedad tengo', icon: '❓' }
              ].map(d => (
                <button
                  key={d.id}
                  onClick={() => toggleDisease(d.id)}
                  className={`p-4 rounded-2xl border-2 text-left flex items-center gap-4 transition-all ${
                    formData.diseases.includes(d.id) 
                      ? 'border-blue-600 bg-blue-50 shadow-md' 
                      : 'border-slate-200 bg-white hover:border-blue-300'
                  }`}
                >
                  <span className="text-2xl">{d.icon}</span>
                  <span className="font-bold text-slate-700">{d.label || d.id}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Pill className="w-6 h-6 text-blue-600" /> Medicamentos
            </h2>
            
            <div className="space-y-4">
              <p className="text-slate-600 font-medium">¿Usted toma medicamentos actualmente?</p>
              <div className="grid grid-cols-2 gap-4">
                <button
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
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Pill className="w-6 h-6 text-blue-600" /> Acceso a Medicamentos
            </h2>
            <div className="space-y-4">
              <p className="text-slate-600 font-medium">¿Usted tiene acceso a los medicamentos que le son formulados?</p>
              
              <div className="space-y-3">
                {[
                  { id: 1, label: 'Sí', icon: '✅' },
                  { id: 2, label: 'Parcialmente', icon: '⚠️' },
                  { id: 3, label: 'No', icon: '❌' }
                ].map(opt => (
                  <button
                    key={opt.id}
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
                  <div className="space-y-2">
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
          "¿Con qué frecuencia cambia la dosis de su medicación y la adapta a sus necesidades?",
          "¿Con qué frecuencia olvida tomar sus medicinas cuando debe tomarlas más de una vez al día?",
          "¿Con qué frecuencia retrasa ir a recoger sus medicinas de la farmacia porque cuestan demasiado dinero?",
          "¿Con qué frecuencia planifica recoger de la farmacia sus medicinas antes de que se le acaben?"
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Package className="w-6 h-6 text-blue-600" /> Adherencia
            </h2>
            <p className="text-slate-600 font-medium">Cuando le formulan algún medicamento...</p>
            
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {armsQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { val: 1, label: 'Nunca' },
                      { val: 2, label: 'Algunas veces' },
                      { val: 3, label: 'Casi siempre' },
                      { val: 4, label: 'Siempre' }
                    ].map(opt => (
                      <label 
                        key={opt.val} 
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
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <HeartPulse className="w-6 h-6 text-blue-600" /> Signos Vitales
            </h2>
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
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Ruler className="w-6 h-6 text-blue-600" /> Antropometría
            </h2>
            
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
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Paraclínicos
            </h2>
            
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
      case 13:
        const edQuestions = [
          "¿Con qué frecuencia fue capaz de lograr una erección durante la actividad sexual?",
          "Cuando tuvo erecciones con estimulación sexual, ¿con qué frecuencia fueron lo suficientemente firmes para la penetración?",
          "Al intentar tener relaciones sexuales, ¿con qué frecuencia fue capaz de penetrar a su pareja?",
          "Durante las relaciones sexuales, ¿con qué frecuencia fue capaz de mantener la erección después de haber penetrado a su pareja?",
          "Durante las relaciones sexuales, ¿qué tan difícil fue mantener la erección hasta completar el acto sexual?",
          "¿Cómo calificaría su nivel de confianza para lograr y mantener una erección?"
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Salud Sexual (IIEF-5)
            </h2>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {edQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {[
                      { val: 1, label: 'Casi nunca / Nunca' },
                      { val: 2, label: 'Pocas veces' },
                      { val: 3, label: 'A veces' },
                      { val: 4, label: 'La mayoría de las veces' },
                      { val: 5, label: 'Casi siempre / Siempre' }
                    ].map(opt => (
                      <label 
                        key={opt.val} 
                        className={`flex items-center justify-center p-2 rounded-xl border cursor-pointer transition-all text-xs text-center ${
                          formData.erectileDysfunction[idx] === opt.val 
                            ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' 
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`ed_${idx}`} 
                          value={opt.val} 
                          checked={formData.erectileDysfunction[idx] === opt.val}
                          onChange={() => {
                            const newEd = [...formData.erectileDysfunction];
                            newEd[idx] = opt.val;
                            setFormData({...formData, erectileDysfunction: newEd});
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
      case 14:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Tabaquismo
            </h2>
            <p className="text-slate-600 font-medium">¿Alguna vez se ha expuesto a nicotina? (fumar o vapear)</p>
            
            <div className="grid grid-cols-2 gap-4">
              <button
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
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Tabaquismo
            </h2>
            <p className="text-slate-600 font-medium mb-4">¿Cuál es tu situación actual?</p>
            <div className="space-y-2">
              {[
                { id: 6, label: 'Fumador actual de cigarrillo' },
                { id: 5, label: 'Fumador actual de cigarrillo electrónico/vapeador' },
                { id: 4, label: 'Exfumador, suspendido hace < 1 año' },
                { id: 3, label: 'Exfumador, suspendido hace 1-5 años' },
                { id: 2, label: 'Exfumador, suspendido hace más de 5 años' }
              ].map(opt => {
                const isSelected = formData.smokeStatus.includes(opt.id);
                return (
                  <button
                    key={opt.id}
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
      case 16:
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-h-[60vh] overflow-y-auto pr-2">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Dumbbell className="w-6 h-6 text-blue-600" /> Actividad Física y Sueño
            </h2>
            
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 mt-8">
              <p className="text-slate-600 font-medium mb-4">En promedio, ¿cuántos minutos a la semana dedica a actividades físicas moderadas o vigorosas?</p>
              <div className="flex justify-center mb-8 items-end gap-2">
                <input 
                  type="number" 
                  min="0"
                  max="1000"
                  value={formData.activity} 
                  onChange={e => setFormData({...formData, activity: e.target.value})} 
                  className="text-5xl font-black text-blue-600 bg-transparent border-b-2 border-blue-200 focus:border-blue-600 outline-none w-32 text-center"
                />
                <span className="text-xl text-slate-400 mb-2">min</span>
              </div>
              <input 
                type="range" min="0" max="300" step="15" 
                value={Number(formData.activity) > 300 ? 300 : (formData.activity || 0)}
                onChange={e => setFormData({...formData, activity: e.target.value})} 
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs font-bold text-slate-400 mt-4">
                <span>0</span>
                <span>150</span>
                <span>300+</span>
              </div>
            </div>

            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 mt-8">
              <p className="text-slate-600 font-medium mb-4">En promedio, ¿cuántas horas duerme por noche?</p>
              <div className="flex justify-center mb-8 items-end gap-2">
                <input 
                  type="number" 
                  min="0"
                  max="24"
                  step="0.5"
                  value={formData.sleep} 
                  onChange={e => setFormData({...formData, sleep: e.target.value})} 
                  className="text-5xl font-black text-blue-600 bg-transparent border-b-2 border-blue-200 focus:border-blue-600 outline-none w-32 text-center"
                />
                <span className="text-xl text-slate-400 mb-2">hrs</span>
              </div>
              <input 
                type="range" min="3" max="12" step="0.5" 
                value={formData.sleep || 3} 
                onChange={e => setFormData({...formData, sleep: e.target.value})} 
                className="w-full h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs font-bold text-slate-400 mt-4">
                <span>3h</span>
                <span>8h</span>
                <span>12h</span>
              </div>
            </div>
          </div>
        );
      case 17:
        const phq9Questions = [
          "Tener poco interés o placer en hacer las cosas",
          "Sentirse desanimado/a, deprimido/a o sin esperanza",
          "Tener problemas para dormir o mantenerse dormido/a, o dormir demasiado",
          "Sentirse cansado/a o tener poca energía",
          "Tener poco apetito o comer en exceso",
          "Sentirse mal consigo mismo/a, o sentir que es un fracaso o que ha decepcionado a su familia",
          "Tener dificultad para concentrarse en cosas tales como leer el periódico o ver la televisión",
          "Moverse o hablar tan lentamente que otras personas lo podrían haber notado. O lo contrario, estar tan inquieto/a o agitado/a que se ha estado moviendo mucho más de lo normal",
          "Pensar que estaría mejor muerto/a o que le gustaría lastimarse de alguna manera"
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Salud Mental (PHQ-9)
            </h2>
            <p className="text-slate-600 font-medium">Durante las últimas 2 semanas, ¿con qué frecuencia le han molestado los siguientes problemas?</p>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {phq9Questions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { val: 0, label: 'Ningún día' },
                      { val: 1, label: 'Varios días' },
                      { val: 2, label: 'Más de la mitad de los días' },
                      { val: 3, label: 'Casi todos los días' }
                    ].map(opt => (
                      <label 
                        key={opt.val} 
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
                  <p className="font-bold text-slate-700 mb-4">Si marcó cualquier problema, ¿qué tan difícil se le ha hecho hacer su trabajo, encargarse de las cosas de la casa o llevarse bien con otras personas debido a estos problemas?</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    {[
                      { val: 0, label: 'Nada difícil' },
                      { val: 1, label: 'Un poco difícil' },
                      { val: 2, label: 'Muy difícil' },
                      { val: 3, label: 'Extremadamente difícil' }
                    ].map(opt => (
                      <label 
                        key={opt.val} 
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
      case 18:
        const medasQuestions = [
          "¿Usa usted aceite de oliva como principal grasa para cocinar?",
          "¿Consume 4 o más cucharadas soperas de aceite de oliva al día?",
          "¿Consume 2 o más raciones de verduras u hortalizas al día?",
          "¿Consume 3 o más piezas de fruta al día?",
          "¿Consume menos de 1 ración al día de carnes rojas, hamburguesas, salchichas o embutidos?",
          "¿Consume menos de 1 ración al día de mantequilla, margarina o nata?",
          "¿Consume menos de 1 bebida carbonatada y/o azucarada al día?",
          "¿Consume 7 o más vasos de vino a la semana?",
          "¿Consume 3 o más raciones de legumbres a la semana?",
          "¿Consume 3 o más raciones de pescado o mariscos a la semana?",
          "¿Consume menos de 3 veces a la semana repostería comercial (galletas, bollería, dulces)?",
          "¿Consume 3 o más veces a la semana frutos secos?",
          "¿Consume preferentemente carne de pollo, pavo o conejo en vez de ternera, cerdo, hamburguesas o salchichas?",
          "¿Consume 2 o más veces a la semana vegetales cocinados, pasta, arroz u otros platos aderezados con sofrito?"
        ];
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" /> Alimentación
            </h2>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 pb-8">
              {medasQuestions.map((q, idx) => (
                <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="font-bold text-slate-700 mb-4">{idx + 1}. {q}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 1, label: 'Sí' },
                      { val: 0, label: 'No' }
                    ].map(opt => (
                      <label 
                        key={opt.val} 
                        className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all text-sm font-bold text-center ${
                          formData.medas[idx] === opt.val 
                            ? 'border-blue-600 bg-blue-50 text-blue-700' 
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name={`medas_${idx}`} 
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
              <button 
                onClick={() => onComplete(generateUrl())}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Ver PDF prellenado
              </button>
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

        {step === 0 && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleNext}
              className="px-8 py-4 rounded-xl font-bold text-white shadow-lg transition-all bg-blue-600 hover:bg-blue-700 shadow-blue-500/30 hover:-translate-y-1 text-lg"
            >
              Ingresar
            </button>
          </div>
        )}

        {step > 0 && step <= totalSteps && (
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
      </div>
      
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5 fade-in duration-300 z-50 max-w-md border border-blue-500/50">
          <HeartPulse className="w-8 h-8 shrink-0 text-blue-200" />
          <p className="font-medium text-sm leading-relaxed">{toastMsg}</p>
        </div>
      )}
    </div>
  );
}
