import { Heading, Text, Section, Button } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  appointmentDateTime: string
  teamsUrl: string
}

export default function Reminder1hPatientEmail({ patientName, appointmentDateTime, teamsUrl }: Props) {
  return (
    <CaimedLayout preheader={`Tu evaluación es en una hora`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>Tu evaluación empieza en una hora</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Tu cita es a las <strong>{appointmentDateTime}</strong>.
      </Text>
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
          Unirme a Teams ahora
        </Button>
      </Section>
    </CaimedLayout>
  )
}
