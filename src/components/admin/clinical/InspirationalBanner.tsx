"use client"

import React, { useState, useEffect } from 'react';
import { Heart, Star, Leaf, Trophy, ArrowRight, CheckCircle2, Activity, Target } from 'lucide-react';
import { ComponenteScore } from '@/lib/clinical/types';

interface InspirationalBannerProps {
  nombrePaciente: string;
  caimedScore: number;
  nivelScore: string;
  metaProteccion: number;
  top3Criticos: ComponenteScore[];
  top3Fuertes: ComponenteScore[];
}

export default function InspirationalBanner({
  nombrePaciente,
  caimedScore,
  nivelScore,
  metaProteccion,
  top3Criticos,
  top3Fuertes
}: InspirationalBannerProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const brecha = Math.max(0, metaProteccion - caimedScore);

  const getLevelConfig = () => {
    switch (nivelScore) {
      case 'ROJO':
        return {
          color: '#D94F3D',
          bgLight: 'rgba(217, 79, 61, 0.1)',
          icon: <Heart className="w-8 h-8 text-white" />,
          title: `Llegaste en el momento justo, ${nombrePaciente}.`,
          subtitle: 'Tu corazón está mandando señales. Ahora las tienes en tus manos.',
          messages: [
            'El riesgo que conoces es el riesgo que puedes cambiar. Llegaste antes de que tu corazón tuviera que hablar más fuerte.',
            'En medicina preventiva, el momento más poderoso es exactamente este: cuando todavía hay tiempo de actuar.',
            'No viniste aquí a recibir malas noticias. Viniste a recibir un plan. Eso es lo que CAIMED te da.'
          ],
          ctaText: 'Hablar con mi médico CAIMED'
        };
      case 'AMARILLO':
        return {
          color: '#F5A623',
          bgLight: 'rgba(245, 166, 35, 0.1)',
          icon: <Star className="w-8 h-8 text-white" />,
          title: `Tienes más de lo que crees, ${nombrePaciente}.`,
          subtitle: `Solo ${brecha} puntos te separan de tu meta de protección cardiovascular.`,
          messages: [
            `Un score de ${caimedScore} con hábitos como los tuyos es una historia que ya está cambiando.`,
            'Los adultos que trabajan sus componentes críticos en el primer trimestre ven resultados reales y medibles.',
            'Estás en la zona donde cada acción importa más. Y lo mejor: ya sabes exactamente qué acciones tomar.'
          ],
          ctaText: 'Ver mi plan de seguimiento'
        };
      case 'VERDE CLARO':
        return {
          color: '#4CAF7D',
          bgLight: 'rgba(76, 175, 125, 0.1)',
          icon: <Leaf className="w-8 h-8 text-white" />,
          title: `${nombrePaciente}, tu corazón está protegido.`,
          subtitle: 'Estás por encima de tu meta. Ahora se trata de mantenerlo.',
          messages: [
            'Superaste tu meta de protección. Ahora el objetivo es que lo sigas disfrutando con la misma tranquilidad.',
            'La prevención que practicaste hoy es la factura médica que no tendrás que pagar mañana.',
            'Tu corazón está en buena forma. Tu trabajo ahora es mantenerlo así.'
          ],
          ctaText: 'Agendar mi próxima evaluación'
        };
      case 'VERDE':
      default:
        return {
          color: '#2E7D5E',
          bgLight: 'rgba(46, 125, 94, 0.1)',
          icon: <Trophy className="w-8 h-8 text-white" />,
          title: `Eres un ejemplo de prevención activa, ${nombrePaciente}.`,
          subtitle: 'Pocos adultos llegan hasta aquí. Tu compromiso es extraordinario.',
          messages: [
            `Un score de ${caimedScore}/100 no se logra por accidente. Refleja decisiones reales que tomaste cada día.`,
            'Eres parte de un grupo reducido de adultos que llegan a este nivel. Eso merece reconocimiento genuino.',
            'La mejor inversión en salud es la que hiciste antes de necesitarla. Eso es exactamente lo que hiciste.'
          ],
          ctaText: 'Compartir mi progreso con mi familia'
        };
    }
  };

  const config = getLevelConfig();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % config.messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [config.messages.length]);

  const getStrongMessage = () => {
    const names = top3Fuertes.map(c => c.nombre);
    const getScore = (name: string) => top3Fuertes.find(c => c.nombre === name)?.puntaje || 0;

    if (names.includes('Nicotina') && getScore('Nicotina') === 100 && names.includes('Actividad física') && getScore('Actividad física') >= 75) {
      return "No fumas y te mueves. Eso ya pone a tu corazón en una posición privilegiada frente a la mayoría de adultos de tu edad.";
    }
    if (names.includes('Alimentación') && getScore('Alimentación') >= 80 && names.includes('Glucosa') && getScore('Glucosa') >= 80) {
      return "Tu alimentación y tus niveles de glucosa muestran una disciplina real. Eso no es común, y tu corazón lo siente.";
    }
    if (names.includes('Adherencia a medicamentos') && getScore('Adherencia a medicamentos') === 100 && names.includes('Acceso a medicamentos') && getScore('Acceso a medicamentos') === 100) {
      return "Sigues tu tratamiento al pie de la letra. Eso es exactamente lo que marca la diferencia a largo plazo.";
    }
    if (names.includes('Sueño') && getScore('Sueño') >= 75) {
      return "Duermes bien. Eso solo ya es medicina preventiva de alto nivel.";
    }
    if (names.includes('Red de apoyo') && getScore('Red de apoyo') >= 75) {
      return "Tienes personas que te cuidan. Eso protege el corazón más de lo que cualquier medicamento puede hacer.";
    }
    return "Cada uno de estos componentes es un activo real de tu salud cardiovascular. Construiste esto con tus hábitos. Eso no se improvisa.";
  };

  const getCriticalMessage = () => {
    if (top3Criticos.length === 0) return "";
    const primary = top3Criticos[0];
    
    switch (primary.nombre) {
      case 'Presión arterial':
        if (primary.puntaje < 30) return "Tu presión arterial es el factor que más impacta tu score hoy. La buena noticia: es uno de los componentes que más responde al acompañamiento médico. Tu próxima cita CAIMED empieza exactamente aquí.";
        return "Tu presión arterial todavía tiene espacio para mejorar. Con monitoreo continuo y ajustes específicos, este número puede cambiar en semanas.";
      case 'Sueño':
        return "El sueño es el medicamento más subestimado que existe. Mientras no descansas bien, tu corazón tampoco lo hace. Esto lo trabajamos juntos en tu plan de seguimiento.";
      case 'Salud mental':
        return "Tu bienestar emocional y tu salud cardiovascular están profundamente conectados. No es algo que se resuelve solo. En CAIMED lo abordamos con la seriedad que merece.";
      case 'Empoderamiento':
        return "Entender tu propia salud es el primer paso para cuidarla. La Escuela de Pacientes CAIMED existe exactamente para esto: darte herramientas reales, no jerga médica.";
      case 'Red de apoyo':
        return "Las personas que cuidan su corazón rara vez lo hacen solos. Hablar con tu familia sobre tu salud cardiovascular puede ser uno de los pasos más poderosos que des hoy.";
      case 'Peso':
        return "El peso corporal influye directamente en tu presión, tu glucosa y tu corazón. Tu plan CAIMED incluye estrategias concretas, adaptadas a tu vida real, no a una dieta genérica.";
      case 'Colesterol':
        return "El colesterol trabaja en silencio. Que hoy lo sepas y lo tengas medido ya te pone en ventaja. De aquí en adelante, lo monitoreamos juntos.";
      case 'Alimentación':
        return "La alimentación cardiosaludable no es restricción, es estrategia. En la Escuela de Pacientes CAIMED aprenderás cómo comer bien sin renunciar a lo que te gusta.";
      case 'Actividad física':
        return "Moverse no requiere un gimnasio ni una rutina imposible. Hay formas de activar tu corazón que encajan en tu vida real. Eso es lo que diseñamos contigo.";
      default:
        return `Trabajar en tu ${primary.nombre.toLowerCase()} es el paso más importante que puedes dar hoy por tu corazón.`;
    }
  };

  const getClosingMessage = () => {
    if (nivelScore === 'ROJO') {
      return "Sabemos que tomar esta decisión no siempre es fácil. Hacerlo demuestra que tu salud es una prioridad real para ti. Eso es lo único que necesitamos para trabajar juntos.";
    }
    if (nivelScore === 'AMARILLO') {
      return "Participar en este programa es una decisión que marca una diferencia real. No solo para ti, sino para quienes te quieren. Gracias por estar aquí.";
    }
    return "Tu compromiso con la prevención es una inspiración. Gracias por ser parte de un programa que existe precisamente para personas como tú: que cuidan su salud antes de necesitarla.";
  };

  const handleCtaClick = () => {
    const text = encodeURIComponent(`Hola, acabo de ver mi reporte CAIMED y quisiera hablar sobre mi plan de seguimiento. Mi nombre es ${nombrePaciente}.`);
    window.open(`https://wa.me/573152103063?text=${text}`, '_blank');
  };

  return (
    <div className="w-full rounded-3xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] bg-white font-sans animate-in slide-in-from-bottom-8 duration-700 border border-slate-100">
      {/* [1] FRANJA SUPERIOR */}
      <div className="p-8 md:p-10 text-white flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left relative overflow-hidden" style={{ backgroundColor: config.color }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black opacity-10 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl"></div>
        
        <div className="shrink-0 mt-1 p-4 bg-white/20 rounded-2xl backdrop-blur-sm shadow-inner relative z-10 animate-bounce">
          {config.icon}
        </div>
        <div className="relative z-10">
          <h2 className="text-[28px] md:text-[36px] font-black leading-tight mb-3 tracking-tight">
            {config.title}
          </h2>
          <p className="text-[16px] md:text-[20px] font-medium opacity-90 leading-relaxed">
            {config.subtitle}
          </p>
        </div>
      </div>

      {/* [2] CUERPO */}
      <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* COLUMNA IZQUIERDA */}
        <div className="flex flex-col gap-5 bg-green-50/50 p-6 rounded-2xl border border-green-100/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-[18px] font-black text-slate-800 uppercase tracking-wide">
              Lo que tienes a tu favor
            </h3>
          </div>
          <p className="text-[15px] text-slate-600 font-medium">
            Estos son los pilares que ya están trabajando para protegerte:
          </p>
          <div className="flex flex-col gap-3 mt-2">
            {top3Fuertes.map((comp, i) => (
              <div key={i} className="flex items-center gap-3 text-[15px] text-slate-800 font-bold bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                <span>{comp.nombre}</span>
                <span className="ml-auto text-green-600 bg-green-50 px-2 py-1 rounded-md">{comp.puntaje}/100</span>
              </div>
            ))}
          </div>
          <p className="text-[15px] text-slate-700 mt-4 leading-relaxed italic font-medium border-l-4 border-green-300 pl-4 py-1">
            "{getStrongMessage()}"
          </p>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="flex flex-col gap-5 bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-[18px] font-black text-slate-800 uppercase tracking-wide">
              Tu próximo capítulo
            </h3>
          </div>
          <p className="text-[15px] text-slate-600 font-medium">
            Las áreas donde tu esfuerzo tendrá el mayor impacto:
          </p>
          <div className="flex flex-col gap-3 mt-2">
            {top3Criticos.map((comp, i) => (
              <div key={i} className="flex items-center gap-3 text-[15px] text-slate-800 font-bold bg-white p-3 rounded-xl shadow-sm border border-slate-100">
                <Target className="w-5 h-5 text-blue-500 shrink-0" />
                <span>{comp.nombre}</span>
                <span className="ml-auto text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{comp.puntaje}/100</span>
              </div>
            ))}
          </div>
          <p className="text-[15px] text-slate-700 mt-4 leading-relaxed italic font-medium border-l-4 border-blue-300 pl-4 py-1">
            "{getCriticalMessage()}"
          </p>
        </div>
      </div>

      {/* [3] MENSAJE ROTATIVO INTERACTIVO */}
      <div 
        className="px-8 py-6 border-y border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between group"
        onClick={() => setCurrentMessageIndex((prev) => (prev + 1) % config.messages.length)}
      >
        <div className="flex-grow relative h-16 flex items-center overflow-hidden">
          {config.messages.map((msg, i) => (
            <p 
              key={i}
              className={`absolute w-full text-[16px] md:text-[18px] font-medium text-slate-700 transition-all duration-700 ${
                i === currentMessageIndex ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-4 z-0'
              }`}
            >
              {msg}
            </p>
          ))}
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors shrink-0 ml-4">
          <ArrowRight className="w-5 h-5 text-slate-500" />
        </div>
      </div>

      {/* [4] FRANJA DE CIERRE */}
      <div className="p-8 md:p-10 flex flex-col items-center text-center gap-5" style={{ backgroundColor: config.bgLight }}>
        <h3 className="text-[20px] md:text-[24px] font-black text-slate-800">
          Gracias por confiar en CAIMED, {nombrePaciente}.
        </h3>
        <p className="text-[16px] md:text-[18px] text-slate-600 max-w-3xl leading-relaxed font-medium">
          {getClosingMessage()}
        </p>
        <button 
          onClick={handleCtaClick}
          className="mt-4 px-8 py-4 rounded-2xl text-white font-bold text-[16px] md:text-[18px] shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex items-center gap-3"
          style={{ backgroundColor: config.color }}
        >
          {config.ctaText}
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
