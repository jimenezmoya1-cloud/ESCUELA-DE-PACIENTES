import { Heading, Text } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  appointmentDateTime: string
  reason: string
  creditReturned: boolean
}

export default function AppointmentCancelledPatientEmail({ patientName, appointmentDateTime, reason, creditReturned }: Props) {
  return (
    <CaimedLayout preheader={`Cita cancelada: ${appointmentDateTime}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu evaluación fue cancelada</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Tu cita programada para el <strong>{appointmentDateTime}</strong> fue cancelada.
      </Text>
      <Text>
        <strong>Razón:</strong> {reason}
      </Text>
      {creditReturned && (
        <Text style={{ background: "#dcfce7", padding: "12px", borderRadius: "8px", color: "#166534" }}>
          Tu crédito fue devuelto y ya está disponible para agendar otra fecha cuando quieras.
        </Text>
      )}
      {!creditReturned && (
        <Text style={{ background: "#fef3c7", padding: "12px", borderRadius: "8px", color: "#92400e" }}>
          El crédito de esta cita NO fue devuelto. Si tienes alguna duda, escríbele al administrador desde la sección de Mensajes.
        </Text>
      )}
    </CaimedLayout>
  )
}
