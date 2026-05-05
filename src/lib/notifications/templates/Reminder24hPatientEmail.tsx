import { Heading, Text, Section, Button } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  appointmentDateTime: string
  teamsUrl: string
}

export default function Reminder24hPatientEmail({ patientName, appointmentDateTime, teamsUrl }: Props) {
  return (
    <CaimedLayout preheader={`Recordatorio: tu evaluación es en 24 horas`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu evaluación es mañana</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Te recordamos que tu evaluación de salud es el <strong>{appointmentDateTime}</strong>.
      </Text>
      <Text>El link de Microsoft Teams ya está activo:</Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button
          href={teamsUrl}
          style={{
            background: "#06559F",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          Unirme a Teams
        </Button>
      </Section>
      <Text style={{ fontSize: "13px", color: "#6b7280" }}>
        Si no puedes asistir, avísale al administrador cuanto antes desde la sección de Mensajes.
      </Text>
    </CaimedLayout>
  )
}
