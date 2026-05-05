import { Heading, Text } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  clinicianName: string
  patientName: string
  patientEmail: string
  appointmentDateTime: string
}

export default function AppointmentBookedClinicianEmail({ clinicianName, patientName, patientEmail, appointmentDateTime }: Props) {
  return (
    <CaimedLayout preheader={`Nueva cita asignada: ${appointmentDateTime}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Te asignaron una nueva cita</Heading>
      <Text>Hola {clinicianName},</Text>
      <Text>
        Se te asignó una evaluación de salud para el <strong>{appointmentDateTime}</strong>.
      </Text>
      <Text>
        <strong>Paciente:</strong> {patientName}<br />
        <strong>Correo:</strong> {patientEmail}
      </Text>
      <Text style={{ fontSize: "13px", color: "#6b7280" }}>
        Puedes ver el detalle completo en tu agenda en la plataforma.
      </Text>
    </CaimedLayout>
  )
}
