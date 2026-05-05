import { Heading, Text } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  appointmentDateTime: string         // formatted "jueves 8 mayo, 10:30 AM"
}

export default function AppointmentBookedPatientEmail({ patientName, appointmentDateTime }: Props) {
  return (
    <CaimedLayout preheader={`Tu evaluación está agendada: ${appointmentDateTime}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu evaluación de salud está agendada</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Confirmamos tu cita para el <strong>{appointmentDateTime}</strong>.
      </Text>
      <Text>
        La evaluación será online por <strong>Microsoft Teams</strong>. Recibirás el link 24 horas antes de tu cita en otro correo y también lo encontrarás en la sección "Agendar evaluación" de la plataforma.
      </Text>
      <Text style={{ fontSize: "13px", color: "#6b7280" }}>
        ¿Necesitas reagendar o cancelar? Escríbele al administrador desde la sección de Mensajes en la plataforma.
      </Text>
    </CaimedLayout>
  )
}
