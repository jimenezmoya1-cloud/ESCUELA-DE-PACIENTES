"use client"

import React from 'react';
import { X } from 'lucide-react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-xl font-black text-slate-800">Términos y Condiciones</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto text-sm text-slate-600 space-y-4 leading-relaxed">
          <div className="text-center mb-6">
            <h3 className="font-black text-lg text-slate-800">CAIMED CARDIOPREVENTIVA</h3>
            <p className="font-bold">Programa de Medicina Preventiva Cardiovascular</p>
            <p>CAIMED S.A.S. — NIT 900.187.738-4</p>
            <p className="font-bold mt-2">TÉRMINOS Y CONDICIONES DE USO DEL PROGRAMA</p>
            <p className="italic">Versión 1.0 — vigente a partir del 13 de marzo de 2026</p>
          </div>

          <div className="p-4 border border-red-200 bg-red-50 text-red-800 font-bold rounded-lg text-justify">
            AVISO IMPORTANTE: ESTE PROGRAMA NO CONSTITUYE UN SERVICIO DE ATENCIÓN MÉDICA, UN DIAGNÓSTICO CLÍNICO NI UN TRATAMIENTO MÉDICO. EL CAIMED SCORE Y LOS REPORTES GENERADOS SON HERRAMIENTAS DE APOYO INFORMATIVO Y NO REEMPLAZAN LA VALORACIÓN DE UN PROFESIONAL DE LA SALUD. EN CASO DE EMERGENCIA MÉDICA, LLAME INMEDIATAMENTE AL NÚMERO DE EMERGENCIAS DE SU LOCALIDAD.
          </div>

          <h4 className="font-black text-slate-800 text-base mt-6">1. PARTES, IDENTIFICACIÓN Y ÁMBITO DE APLICACIÓN</h4>
          
          <p className="font-bold text-slate-800">1.1 El Titular del Programa</p>
          <p>CAIMED S.A.S. (en adelante, indistintamente, "CAIMED", "la Empresa" o "el Titular") es una sociedad por acciones simplificada constituida bajo las leyes de la República de Colombia, identificada con Número de Identificación Tributaria (NIT) 900.187.738-4, con domicilio principal en Chía Cundinamarca, inscrita en la Cámara de Comercio de Bogotá. CAIMED es la propietaria, operadora y responsable exclusiva del programa denominado CAIMED Cardiopreventiva (en adelante, "el Programa").</p>

          <p className="font-bold text-slate-800">1.2 El Usuario</p>
          <p>Se entiende por Usuario toda persona natural que acceda, utilice, se registre, interactúe o solicite información a través de cualquiera de los canales del Programa, incluyendo sin limitación: (i) el sitio web oficial del Programa; (ii) el chatbot de WhatsApp; (iii) los formularios o cuestionarios digitales habilitados por CAIMED; (iv) los códigos QR instalados en sedes aliadas; y (v) cualquier otro canal tecnológico o presencial que CAIMED habilite en el futuro. Se entiende también como Usuario el familiar, cuidador o tercero que actúe en nombre o en beneficio de un paciente, en cuyo caso dicha persona garantiza contar con la autorización del titular de los datos.</p>

          <p className="font-bold text-slate-800">1.3 Aceptación de los Términos</p>
          <p>El acceso o uso del Programa, en cualquiera de sus modalidades y canales, implica la aceptación plena, libre, informada y sin reservas de los presentes Términos y Condiciones (en adelante, "los Términos") y de la Política de Tratamiento de Datos Personales de CAIMED. Si el Usuario no está de acuerdo con alguna de estas disposiciones, deberá abstenerse de usar el Programa.</p>
          <p>La aceptación electrónica mediante el diligenciamiento de formularios, el envío de mensajes a través del chatbot, o el clic en botones de confirmación, tendrá plena validez jurídica de conformidad con la Ley 527 de 1999 y demás normas aplicables sobre comercio electrónico en Colombia.</p>

          <p className="font-bold text-slate-800">1.4 Usuarios Menores de Edad</p>
          <p>El Programa está dirigido a personas mayores de edad conforme a la legislación colombiana (18 años o más). El acceso de menores de edad solo podrá efectuarse bajo la autorización expresa y acompañamiento de sus padres o representantes legales, quienes asumirán la plena responsabilidad sobre dicho acceso. CAIMED no será responsable por el uso del Programa por parte de menores sin la debida supervisión.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">2. NATURALEZA DEL PROGRAMA Y LIMITACIONES ESENCIALES</h4>
          
          <p className="font-bold text-slate-800">2.1 Descripción General del Programa</p>
          <p>CAIMED Cardiopreventiva es un programa de medicina preventiva cardiovascular de carácter informativo, educativo y de apoyo al autocuidado. Opera bajo un modelo híbrido —presencial y digital— que combina herramientas de tamizaje, educación en salud y seguimiento longitudinal, con el propósito de apoyar la identificación y la gestión del riesgo cardiovascular en adultos.</p>

          <p className="font-bold text-slate-800">2.2 El Programa NO es un Servicio de Salud</p>
          <div className="p-4 border border-red-200 bg-red-50 text-red-800 font-bold rounded-lg text-justify">
            El Programa CAIMED Cardiopreventiva NO es un servicio de salud, NO constituye atención médica, NO equivale a una consulta médica y NO reemplaza, en ningún caso, la valoración, el diagnóstico, la prescripción ni el seguimiento realizados por un profesional de la salud legalmente habilitado.
          </div>
          <p>Los reportes, puntajes, semáforos, recomendaciones, alertas y cualquier otro resultado generado por el Programa son exclusivamente de carácter orientativo e informativo. Ningún resultado del Programa tiene validez diagnóstica, clínica, terapéutica ni legal. El Usuario deberá siempre consultar con su médico tratante o con un profesional de la salud habilitado ante cualquier duda, síntoma, hallazgo o decisión relacionada con su salud.</p>

          <p className="font-bold text-slate-800">2.3 Limitación del Programa frente a Urgencias</p>
          <p>El Programa no está diseñado para gestionar situaciones de emergencia médica. Si el Usuario experimenta síntomas que puedan indicar una emergencia cardiovascular u otra urgencia médica —tales como dolor torácico, dificultad para respirar, parálisis repentina, pérdida de conciencia u otros— debe suspender inmediatamente el uso del Programa y llamar a los servicios de emergencia correspondientes.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">3. EL CAIMED SCORE: NATURALEZA, ALCANCE Y EXONERACIÓN DE RESPONSABILIDAD</h4>

          <p className="font-bold text-slate-800">3.1 Definición del CAIMED Score</p>
          <p>El CAIMED Score es una puntuación numérica en escala de 0 a 100, desarrollada y de propiedad exclusiva de CAIMED S.A.S. Su propósito es traducir, de manera simplificada y orientativa, un conjunto de variables cualitativas, cuantitativas y escalas estandarizadas en un único valor numérico que busca facilitar la comprensión del usuario sobre aspectos generales de su perfil de salud.</p>

          <p className="font-bold text-slate-800">3.2 Naturaleza Algorítmica del CAIMED Score</p>
          <p>El CAIMED Score es el resultado de la aplicación de un algoritmo propietario y confidencial de titularidad exclusiva de CAIMED S.A.S. (en adelante, "el Algoritmo"), el cual incluye ponderaciones, transformaciones matemáticas y criterios de clasificación definidos unilateralmente por CAIMED. El Algoritmo pondera variables que pueden incluir, entre otras, datos de estilo de vida, medidas antropométricas, resultados de laboratorio, respuestas a cuestionarios validados y otros indicadores de salud autorreportados o medidos.</p>
          <p className="italic">El CAIMED Score es un promedio ponderado de variables heterogéneas procesadas por un algoritmo propietario. No es un índice de riesgo clínico validado científicamente ni un instrumento de diagnóstico médico.</p>

          <p className="font-bold text-slate-800">3.3 Ausencia de Validez Científica y Clínica</p>
          <p>CAIMED declara expresamente que:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>El CAIMED Score NO ha sido objeto de validación científica formal ante ninguna entidad regulatoria de salud, nacional o internacional.</li>
            <li>El CAIMED Score NO ha sido validado clínicamente como instrumento predictivo de eventos cardiovasculares, enfermedades, condiciones médicas ni ninguna otra situación de salud.</li>
            <li>El CAIMED Score NO refleja con exactitud ni de forma integral el estado de salud del Usuario.</li>
            <li>Los resultados del CAIMED Score pueden variar según la calidad, completitud y veracidad de los datos suministrados por el Usuario.</li>
            <li>El CAIMED Score no debe ser interpretado como el único indicador de la condición cardiovascular u otra condición médica del Usuario.</li>
            <li>La utilidad del CAIMED Score como herramienta de orientación depende, en todo momento, de la valoración y criterio del médico tratante del Usuario.</li>
          </ul>

          <p className="font-bold text-slate-800">3.4 El CAIMED Score como Herramienta de Apoyo</p>
          <p>El CAIMED Score es, exclusivamente, una herramienta de apoyo informativo que facilita la comunicación entre el Usuario y su equipo de salud. Su valor reside en su capacidad orientativa, no en su precisión clínica o científica. La interpretación del CAIMED Score en el contexto de la salud individual de cada paciente corresponde, en todo caso, al médico tratante o al profesional de la salud que atienda al Usuario.</p>

          <p className="font-bold text-slate-800">3.5 Exoneración Total de Responsabilidad frente al CAIMED Score</p>
          <div className="p-4 border border-red-200 bg-red-50 text-red-800 font-bold rounded-lg text-justify">
            CAIMED S.A.S. no asume responsabilidad alguna —de carácter civil, penal, administrativo o de cualquier otra naturaleza— derivada de: (i) la interpretación, uso o aplicación del CAIMED Score por parte del Usuario; (ii) decisiones tomadas por el Usuario con base en el CAIMED Score o cualquier otro resultado del Programa; (iii) cualquier evento de salud adverso, incluyendo sin limitación fallecimiento, incapacidad, hospitalización, complicación médica o cualquier otro daño, que el Usuario o terceros relacionen, directa o indirectamente, con el CAIMED Score, las escalas utilizadas, los reportes generados o cualquier otro componente del Programa.
          </div>

          <p className="font-bold text-slate-800">3.6 Semaforización y Reportes</p>
          <p>Los resultados de semaforización (Verde, Amarillo, Rojo), los reportes personalizados, los perfiles de salud detallados, las alertas críticas u orientadoras, y demás entregables del Programa tienen el mismo carácter informativo y orientativo descrito en esta sección. Ninguno de estos elementos constituye diagnóstico, prescripción médica ni tratamiento. CAIMED no asume responsabilidad por eventos de salud relacionados con estos entregables.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">4. DATOS PERSONALES Y AUTORIZACIÓN DE TRATAMIENTO</h4>

          <p className="font-bold text-slate-800">4.1 Marco Legal Aplicable</p>
          <p>El tratamiento de los datos personales del Usuario se rige por la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013, y demás normas que los modifiquen, adicionen o sustituyan. CAIMED S.A.S. actúa en calidad de Responsable del Tratamiento de los datos recolectados a través del Programa.</p>

          <p className="font-bold text-slate-800">4.2 Autorización Expresa del Titular</p>
          <p>Al acceder y utilizar el Programa, el Usuario otorga de manera libre, previa, expresa e informada su autorización a CAIMED S.A.S. para recolectar, almacenar, usar, circular, suprimir, procesar y en general tratar sus datos personales, incluyendo datos sensibles de salud, para las finalidades descritas en los presentes Términos y en la Política de Tratamiento de Datos Personales de CAIMED.</p>

          <p className="font-bold text-slate-800">4.3 Finalidades del Tratamiento</p>
          <p>Los datos del Usuario serán tratados para las siguientes finalidades:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Prestación del Programa y sus servicios asociados, incluyendo la generación del CAIMED Score, reportes y semáforos de salud.</li>
            <li>Seguimiento longitudinal del estado de salud del Usuario dentro del Programa.</li>
            <li>Envío de comunicaciones relacionadas con el Programa, alertas de salud, recordatorios de citas y contenido educativo.</li>
            <li>Investigación y mejora continua del Algoritmo y los instrumentos del Programa, de manera anonimizada y bajo estrictos estándares de seguridad.</li>
            <li>Cumplimiento de obligaciones legales y requerimientos de autoridades competentes.</li>
            <li>Gestión administrativa, de facturación y de relación con aliados estratégicos del Programa, en los términos autorizados.</li>
            <li>Evaluación de la calidad del Programa y generación de estadísticas agregadas de salud poblacional.</li>
          </ul>

          <p className="font-bold text-slate-800">4.4 Datos Sensibles</p>
          <p>Dado que el Programa involucra datos de salud, los cuales constituyen datos sensibles en los términos de la Ley 1581 de 2012, el Usuario autoriza expresamente su recolección y tratamiento para las finalidades descritas. CAIMED adoptará las medidas de seguridad técnicas, administrativas y físicas necesarias para proteger estos datos.</p>

          <p className="font-bold text-slate-800">4.5 Veracidad de los Datos</p>
          <p>El Usuario es responsable de la veracidad, exactitud, calidad, vigencia y autenticidad de los datos que suministra al Programa. CAIMED no asume responsabilidad alguna por resultados incorrectos, inapropiados o potencialmente perjudiciales derivados del suministro de datos incompletos, inexactos o falsos por parte del Usuario. La calidad del CAIMED Score y de los demás resultados del Programa depende directamente de la calidad de la información ingresada.</p>

          <p className="font-bold text-slate-800">4.6 Derechos del Titular de los Datos</p>
          <p>De conformidad con la Ley 1581 de 2012, el Usuario tiene derecho a: (i) conocer, actualizar y rectificar sus datos personales; (ii) solicitar prueba de la autorización otorgada; (iii) ser informado sobre el uso de sus datos; (iv) presentar quejas ante la Superintendencia de Industria y Comercio; (v) revocar la autorización y/o solicitar la supresión de sus datos cuando no medie deber legal o contractual que lo impida. Para ejercer estos derechos, el Usuario podrá comunicarse a través de los canales indicados en la Política de Tratamiento de Datos Personales disponible en www.caimed.com.</p>

          <p className="font-bold text-slate-800">4.7 Transferencia a Aliados</p>
          <p>CAIMED podrá compartir datos del Usuario con aliados estratégicos del Programa —incluyendo sin limitación entidades como Boston Medical Group u otras organizaciones con las que CAIMED celebre convenios— únicamente en la medida necesaria para la prestación del Programa y con sujeción a las obligaciones de confidencialidad y protección de datos personales aplicables. Dicha transferencia se realizará siempre en los términos autorizados por el Usuario y conforme al marco legal vigente.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">5. PLATAFORMAS TECNOLÓGICAS, DISPONIBILIDAD Y USO PERMITIDO</h4>

          <p className="font-bold text-slate-800">5.1 Canales del Programa</p>
          <p>El Programa opera a través de los siguientes canales tecnológicos: (i) sitio web oficial del Programa; (ii) chatbot de WhatsApp; (iii) plataforma MetricMed (aplicación digital de monitoreo de salud, propiedad de CAIMED); (iv) cuestionarios y formularios digitales; y (v) cualquier otro canal tecnológico que CAIMED habilite. El acceso a determinados canales o funcionalidades puede requerir registro previo y aceptación de condiciones específicas adicionales.</p>

          <p className="font-bold text-slate-800">5.2 Disponibilidad del Servicio</p>
          <p>CAIMED no garantiza la disponibilidad ininterrumpida del Programa ni de sus plataformas tecnológicas. El Programa puede verse afectado por interrupciones, mantenimientos programados o no programados, fallas técnicas, problemas de conectividad, casos fortuitos o de fuerza mayor, o cualquier otra circunstancia ajena al control de CAIMED. CAIMED no será responsable por los perjuicios que puedan derivarse de la falta de disponibilidad temporal o permanente del Programa.</p>

          <p className="font-bold text-slate-800">5.3 Uso Permitido</p>
          <p>El Usuario se compromete a utilizar el Programa exclusivamente para los fines personales y legítimos para los que fue diseñado. Queda expresamente prohibido:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Utilizar el Programa con fines comerciales, de lucro, de competencia o de cualquier otro propósito distinto al personal y preventivo de salud para el que fue creado.</li>
            <li>Suministrar datos falsos, incompletos o de terceros sin su debida autorización.</li>
            <li>Intentar acceder, copiar, modificar, descompilar, realizar ingeniería inversa o de cualquier manera explotar el Algoritmo, MetricMed u otras herramientas tecnológicas propietarias de CAIMED.</li>
            <li>Interferir con el funcionamiento de las plataformas del Programa.</li>
            <li>Transmitir contenido ilícito, dañino, difamatorio, o que viole derechos de terceros a través de los canales del Programa.</li>
            <li>Compartir credenciales de acceso con terceros no autorizados.</li>
          </ul>

          <p className="font-bold text-slate-800">5.4 Modificaciones al Programa</p>
          <p>CAIMED se reserva el derecho de modificar, suspender, ampliar o discontinuar, total o parcialmente, el Programa, sus canales, funcionalidades, precios, planes o cualquier otro elemento, en cualquier momento y sin previo aviso, a su exclusivo criterio. Los cambios sustanciales serán comunicados al Usuario a través de los medios disponibles.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">6. PROPIEDAD INTELECTUAL</h4>

          <p className="font-bold text-slate-800">6.1 Titularidad</p>
          <p>Todos los derechos de propiedad intelectual sobre el Programa, incluyendo sin limitación el Algoritmo del CAIMED Score, la plataforma MetricMed), el nombre comercial CAIMED Cardiopreventiva, los reportes y formatos generados, los cuestionarios, los contenidos educativos, el diseño gráfico, las marcas, los logotipos y cualquier otro elemento del Programa, son de propiedad exclusiva de CAIMED S.A.S. y están protegidos por la legislación colombiana e internacional sobre propiedad intelectual, incluyendo la Decisión Andina 351 de 1993 y la Ley 23 de 1982.</p>

          <p className="font-bold text-slate-800">6.2 Licencia de Uso Limitada</p>
          <p>CAIMED otorga al Usuario una licencia no exclusiva, intransferible, revocable y de alcance estrictamente personal para acceder y usar el Programa de conformidad con los presentes Términos. Esta licencia no implica cesión ni transferencia de derechos de propiedad intelectual de ningún tipo. Cualquier uso no autorizado de los elementos propietarios de CAIMED podrá dar lugar a acciones legales.</p>

          <p className="font-bold text-slate-800">6.3 Confidencialidad del Algoritmo</p>
          <p>El Algoritmo que subyace al cálculo del CAIMED Score constituye un secreto empresarial de CAIMED S.A.S., protegido bajo las normas de competencia desleal y propiedad industrial aplicables. El Usuario reconoce este carácter confidencial y se abstiene de intentar, por cualquier medio, descubrir, replicar, divulgar o usar el Algoritmo fuera del marco del Programa.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">7. LIMITACIÓN GENERAL DE RESPONSABILIDAD</h4>

          <p className="font-bold text-slate-800">7.1 Exoneración Amplia</p>
          <p>En la máxima medida permitida por la ley colombiana, CAIMED S.A.S., sus socios, directores, representantes legales, empleados, contratistas, aliados y cualquier otro tercero vinculado al Programa, no serán responsables por:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cualquier daño directo, indirecto, incidental, especial, consecuente, moral o punitivo derivado del uso o la imposibilidad de uso del Programa.</li>
            <li>Decisiones de salud, cambios de hábitos, inicio, modificación o suspensión de tratamientos médicos adoptadas por el Usuario con base en los resultados del Programa.</li>
            <li>Cualquier evento adverso de salud, incluyendo sin limitación deterioro de la condición de salud, hospitalización, incapacidad permanente o temporal, o fallecimiento, que el Usuario o terceros atribuyan, directa o indirectamente, al uso del Programa, al CAIMED Score, a los reportes generados o a las recomendaciones del Programa.</li>
            <li>Errores, omisiones, imprecisiones o desactualizaciones en los contenidos educativos del Programa.</li>
            <li>Fallas técnicas, interrupciones o pérdida de datos en las plataformas del Programa.</li>
            <li>Acceso no autorizado por terceros a los datos del Usuario, siempre que CAIMED haya implementado las medidas de seguridad razonables y exigibles.</li>
            <li>Cualquier perjuicio derivado de la actuación de aliados estratégicos del Programa.</li>
          </ul>

          <p className="font-bold text-slate-800">7.2 Responsabilidad Residual</p>
          <p>En caso de que, no obstante lo anterior, se determinara judicialmente alguna responsabilidad de CAIMED, esta quedará limitada en todo caso al valor efectivamente pagado por el Usuario al Programa durante los tres (3) meses inmediatamente anteriores al evento que originó el daño, o a un salario mínimo mensual legal vigente (SMMLV) en Colombia, el que resulte menor.</p>

          <p className="font-bold text-slate-800">7.3 Caso Fortuito y Fuerza Mayor</p>
          <p>CAIMED no será responsable por incumplimientos o fallos atribuibles a caso fortuito o fuerza mayor, en los términos del artículo 1 de la Ley 95 de 1890 y demás normas concordantes del Código Civil colombiano.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">8. OBLIGACIONES Y COMPROMISOS DEL USUARIO</h4>
          <p>Al aceptar los presentes Términos, el Usuario asume las siguientes obligaciones:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Suministrar información veraz, completa y actualizada al Programa.</li>
            <li>Mantener la confidencialidad de sus credenciales de acceso y notificar a CAIMED inmediatamente ante cualquier uso no autorizado de su cuenta.</li>
            <li>Usar el Programa exclusivamente para los fines personales y preventivos de salud para los que fue diseñado.</li>
            <li>Consultar siempre con su médico tratante o un profesional de la salud habilitado antes de tomar cualquier decisión médica, incluyendo la interpretación de los resultados del Programa.</li>
            <li>No intentar acceder a información de otros usuarios ni vulnerar la seguridad de las plataformas del Programa.</li>
            <li>Actualizar sus datos cuando estos cambien, a fin de garantizar la calidad de los resultados del Programa.</li>
            <li>Revisar periódicamente los presentes Términos para mantenerse informado sobre sus actualizaciones.</li>
          </ul>

          <h4 className="font-black text-slate-800 text-base mt-6">9. PLANES, PRECIOS Y CONDICIONES COMERCIALES</h4>
          
          <p className="font-bold text-slate-800">9.1 Descripción de los Planes</p>
          <p>El Programa ofrece diferentes niveles de acceso: Plan Gratuito (Termómetro), Plan Copiloto, Plan Insignia y Plan Insignia Plus, cuyas características se describen en el material informativo del Programa disponible en www.caimed.com. CAIMED se reserva el derecho de modificar los precios, contenidos y condiciones de los planes en cualquier momento, comunicando dichos cambios al Usuario con la antelación razonable.</p>

          <p className="font-bold text-slate-800">9.2 Tarifas</p>
          <p>Los precios se expresan en pesos colombianos (COP) e incluyen los impuestos aplicables, salvo indicación expresa en contrario. El pago de los planes con cargo mensual se realizará de conformidad con las condiciones de pago acordadas al momento del registro.</p>

          <p className="font-bold text-slate-800">9.3 Cancelación</p>
          <p>El Usuario podrá cancelar su suscripción al Programa en cualquier momento, sin penalización, siguiendo el procedimiento indicado en los canales del Programa. La cancelación no dará derecho a reembolsos de períodos ya pagados, salvo cuando la ley colombiana de protección al consumidor (Ley 1480 de 2011) así lo exija.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">10. MODIFICACIONES A LOS TÉRMINOS Y CONDICIONES</h4>
          <p>CAIMED se reserva el derecho de modificar los presentes Términos en cualquier momento. Las modificaciones entrarán en vigencia en la fecha de su publicación en los canales oficiales del Programa. El uso continuado del Programa con posterioridad a la publicación de modificaciones implicará la aceptación de los Términos actualizados. CAIMED procurará informar al Usuario sobre cambios materiales mediante los canales de comunicación disponibles.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">11. LEY APLICABLE Y SOLUCIÓN DE CONFLICTOS</h4>

          <p className="font-bold text-slate-800">11.1 Ley Aplicable</p>
          <p>Los presentes Términos se rigen e interpretan de conformidad con las leyes de la República de Colombia, incluyendo sin limitación: la Ley 23 de 1982, la Ley 527 de 1999, la Ley 1480 de 2011, la Ley 1581 de 2012, el Decreto 1377 de 2013, la Ley 23 de 1981 (Ética Médica) y demás normas concordantes.</p>

          <p className="font-bold text-slate-800">11.2 Solución de Conflictos</p>
          <p>Para la resolución de cualquier controversia derivada de los presentes Términos, las partes acuerdan agotar en primera instancia una etapa de conciliación directa ante CAIMED. Si la controversia no se resuelve en un plazo de treinta (30) días hábiles, las partes podrán acudir a los mecanismos de solución de conflictos previstos por la ley colombiana, incluyendo los centros de conciliación y arbitraje de la Cámara de Comercio de Bogotá, o los jueces competentes de la ciudad de Bogotá, D.C., Colombia.</p>

          <h4 className="font-black text-slate-800 text-base mt-6">12. DISPOSICIONES FINALES</h4>

          <p className="font-bold text-slate-800">12.1 Integralidad</p>
          <p>Los presentes Términos, junto con la Política de Tratamiento de Datos Personales de CAIMED y cualquier condición específica de los planes, constituyen el acuerdo íntegro entre CAIMED y el Usuario en relación con el Programa, y sustituyen cualquier comunicación o acuerdo anterior sobre el mismo objeto.</p>

          <p className="font-bold text-slate-800">12.2 Invalidez Parcial</p>
          <p>Si alguna disposición de los presentes Términos fuere declarada nula, inválida o inaplicable por autoridad competente, las demás disposiciones conservarán plena vigencia y eficacia.</p>

          <p className="font-bold text-slate-800">12.3 No Renuncia</p>
          <p>La tolerancia o el no ejercicio por parte de CAIMED de cualquier derecho previsto en los presentes Términos no constituirá renuncia a dicho derecho ni impedirá su ejercicio ulterior.</p>

          <p className="font-bold text-slate-800">12.4 Idioma</p>
          <p>Los presentes Términos se han redactado en idioma español. En caso de existir versiones en otros idiomas, la versión en español prevalecerá en caso de discrepancia.</p>

          <p className="font-bold text-slate-800">12.5 Contacto</p>
          <p>Para cualquier consulta, solicitud o reclamación relacionada con los presentes Términos o con el Programa, el Usuario podrá comunicarse con CAIMED S.A.S. a través de los siguientes canales:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Sitio web: www.caimed.com</li>
            <li>Correo electrónico de atención al usuario: a través del formulario de contacto en www.caimed.com</li>
            <li>Canales digitales del Programa (WhatsApp y plataforma web)</li>
            <li>Sedes presenciales de CAIMED en Colombia</li>
          </ul>

          <h4 className="font-black text-slate-800 text-base mt-6 text-center">DECLARACIÓN DE ACEPTACIÓN DEL USUARIO</h4>
          <p>Al utilizar el Programa CAIMED Cardiopreventiva, el Usuario declara que:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ha leído, comprendido y aceptado en su totalidad los presentes Términos y Condiciones de Uso.</li>
            <li>Ha leído y acepta la Política de Tratamiento de Datos Personales de CAIMED S.A.S.</li>
            <li>Autoriza de manera libre, previa, expresa e informada el tratamiento de sus datos personales, incluyendo datos sensibles de salud, para las finalidades descritas en los presentes Términos.</li>
            <li>Comprende que el CAIMED Score y los demás resultados del Programa son herramientas de apoyo informativo y NO constituyen diagnóstico médico, validación clínica ni recomendación terapéutica.</li>
            <li>Comprende que ningún resultado del Programa reemplaza la valoración de su médico tratante o de un profesional de la salud habilitado.</li>
            <li>Asume plena responsabilidad por la veracidad de los datos suministrados al Programa.</li>
            <li>Exonera a CAIMED S.A.S. de toda responsabilidad derivada de eventos de salud relacionados con el uso del Programa, el CAIMED Score o cualquier otro resultado generado por el Programa.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
