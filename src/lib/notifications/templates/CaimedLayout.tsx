import { Html, Head, Body, Container, Heading, Text, Section, Hr } from "@react-email/components"
import type { ReactNode } from "react"

interface Props {
  preheader?: string
  children: ReactNode
}

const containerStyle = {
  margin: "0 auto",
  padding: "20px",
  maxWidth: "560px",
  fontFamily: "system-ui, -apple-system, sans-serif",
}
const headerStyle = {
  textAlign: "center" as const,
  paddingBottom: "16px",
  borderBottom: "1px solid #e5e7eb",
}
const footerStyle = {
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center" as const,
  marginTop: "32px",
}

export default function CaimedLayout({ preheader, children }: Props) {
  return (
    <Html>
      <Head>
        {preheader && <title>{preheader}</title>}
      </Head>
      <Body style={{ background: "#f9fafb", margin: 0 }}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Heading style={{ fontSize: "20px", color: "#06559F", margin: 0 }}>
              CAIMED · Escuela de Pacientes
            </Heading>
          </Section>
          <Section style={{ paddingTop: "24px" }}>{children}</Section>
          <Hr style={{ borderColor: "#e5e7eb", margin: "32px 0 16px" }} />
          <Text style={footerStyle}>
            Este es un mensaje automático de la plataforma CAIMED. Si tienes preguntas, responde a este correo o entra a la sección de Mensajes en la plataforma.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
