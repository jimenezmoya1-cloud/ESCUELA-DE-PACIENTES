import { Heading, Text, Section, Button } from "@react-email/components"
import CaimedLayout from "./CaimedLayout"

interface Props {
  patientName: string
  planLabel: string                  // ej. "1 evaluación de salud"
  amountFormatted: string            // ej. "$80.000 COP"
  appUrl: string                     // ej. "https://caimed.example.com/agendar"
}

export default function ManualPaymentApprovedEmail({ patientName, planLabel, amountFormatted, appUrl }: Props) {
  return (
    <CaimedLayout preheader={`Pago confirmado: ${planLabel}`}>
      <Heading style={{ fontSize: "18px", color: "#212B52" }}>¡Tu pago fue confirmado!</Heading>
      <Text>Hola {patientName},</Text>
      <Text>
        Recibimos tu pago de <strong>{amountFormatted}</strong> por el plan: <strong>{planLabel}</strong>. Tus créditos ya están disponibles en tu cuenta para que agendes cuando quieras.
      </Text>
      <Section style={{ textAlign: "center", margin: "24px 0" }}>
        <Button
          href={appUrl}
          style={{
            background: "#06559F",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          Agendar mi evaluación
        </Button>
      </Section>
    </CaimedLayout>
  )
}
