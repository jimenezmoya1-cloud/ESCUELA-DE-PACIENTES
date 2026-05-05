import { Html, Head, Body, Container, Heading, Text, Section, Hr, Preview } from "@react-email/components"
import type { ReactNode } from "react"

interface Props {
  preheader?: string
  children: ReactNode
}

const BRAND_NAVY = "#1a2a52"
const BRAND_NAVY_DEEP = "#0f1d3d"
const ACCENT_PURPLE = "#a855f7"
const ACCENT_TEAL = "#06b6d4"
const TEXT_DARK = "#212B52"
const TEXT_MUTED = "#6b7280"
const BG_PAGE = "#f5f7fb"

const containerStyle = {
  margin: "32px auto",
  maxWidth: "580px",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  background: "#ffffff",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
}

// Header con typographic wordmark — sin imagen
const headerStyle = {
  background: `linear-gradient(135deg, ${BRAND_NAVY_DEEP} 0%, ${BRAND_NAVY} 100%)`,
  padding: "44px 24px 36px",
  textAlign: "center" as const,
}

const wordmarkStyle = {
  color: "#ffffff",
  fontSize: "34px",
  fontWeight: 700,
  margin: 0,
  letterSpacing: "-0.5px",
  lineHeight: 1,
}

const wordmarkRegStyle = {
  fontSize: "12px",
  fontWeight: 400,
  verticalAlign: "super" as const,
  marginLeft: "2px",
  color: "#a8b3d4",
}

// Pequeño acento decorativo entre wordmark y subtítulo (rectángulo con gradiente)
const ornamentStyle = {
  display: "inline-block" as const,
  width: "44px",
  height: "3px",
  background: `linear-gradient(90deg, ${ACCENT_PURPLE} 0%, ${ACCENT_TEAL} 100%)`,
  borderRadius: "2px",
  margin: "16px auto 14px",
}

const taglineStyle = {
  color: "#cbd2e8",
  fontSize: "12px",
  fontWeight: 600,
  margin: 0,
  letterSpacing: "3px",
  textTransform: "uppercase" as const,
}

const accentBarStyle = {
  height: "3px",
  background: `linear-gradient(90deg, ${ACCENT_PURPLE} 0%, ${ACCENT_TEAL} 100%)`,
  margin: 0,
  border: "none",
}

const contentStyle = {
  padding: "36px 36px 20px",
}

const footerStyle = {
  padding: "20px 36px 36px",
  textAlign: "center" as const,
  background: "#fafbfd",
  borderTop: "1px solid #eef0f5",
}

const footerBrandStyle = {
  margin: "0 0 6px",
  color: TEXT_DARK,
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.3px",
}

const footerTextStyle = {
  margin: 0,
  color: TEXT_MUTED,
  fontSize: "11px",
  lineHeight: "1.6",
}

export default function CaimedLayout({ preheader, children }: Props) {
  return (
    <Html>
      <Head />
      {preheader && <Preview>{preheader}</Preview>}
      <Body style={{ background: BG_PAGE, margin: 0, padding: "0 16px" }}>
        <Container style={containerStyle}>
          {/* Header con wordmark tipográfico */}
          <Section style={headerStyle}>
            <Heading as="h1" style={wordmarkStyle}>
              CAIMED<span style={wordmarkRegStyle}>®</span>
            </Heading>
            <div style={ornamentStyle}></div>
            <Text style={taglineStyle}>Medicina Preventiva</Text>
          </Section>

          {/* Acento gradient (rosa → teal) */}
          <Hr style={accentBarStyle} />

          {/* Contenido */}
          <Section style={contentStyle}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerBrandStyle}>
              CAIMED<sup style={{ fontSize: "8px", verticalAlign: "super" }}>®</sup> Medicina Preventiva
            </Text>
            <Text style={footerTextStyle}>
              Este es un mensaje automático. Si tienes preguntas, responde a este correo o entra a la sección de Mensajes en la plataforma.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
