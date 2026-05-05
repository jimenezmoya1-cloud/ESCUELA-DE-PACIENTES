import { Heading, Text } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  clinicianName: string
  patientName: string
  appointmentDateTime: string
}

export default function Reminder1hClinicianEmail({ clinicianName, patientName, appointmentDateTime }: Props) {
  return (
    <CaimedLayout preheader={`Cita en una hora: ${patientName}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu próxima cita es en una hora</Heading>
      <Text>Hola {clinicianName},</Text>
      <Text>
        Tienes una evaluación de salud con <strong>{patientName}</strong> a las <strong>{appointmentDateTime}</strong>.
      </Text>
      <Text style={{ fontSize: "13px", color: "#6b7280" }}>
        Puedes acceder al link de Teams desde tu agenda en la plataforma.
      </Text>
    </CaimedLayout>
  )
}
