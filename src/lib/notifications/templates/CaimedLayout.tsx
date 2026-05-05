import { Html, Head, Body, Container, Heading, Text, Section, Hr, Img, Preview } from "@react-email/components"
import type { ReactNode } from "react"

interface Props {
  preheader?: string
  children: ReactNode
}

const BRAND_NAVY = "#1a2a52"
const BRAND_NAVY_SOFT = "#212B52"
const ACCENT_PURPLE = "#a855f7"
const ACCENT_TEAL = "#06b6d4"
const TEXT_MUTED = "#6b7280"
const BG_PAGE = "#f5f7fb"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
const logoUrl = `${siteUrl}/logo-medicina-preventiva-transparente.png`

const containerStyle = {
  margin: "32px auto",
  maxWidth: "580px",
  fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  background: "#ffffff",
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)",
}

const headerStyle = {
  background: BRAND_NAVY,
  padding: "32px 24px 24px",
  textAlign: "center" as const,
}

const accentBarStyle = {
  height: "3px",
  background: `linear-gradient(90deg, ${ACCENT_PURPLE} 0%, ${ACCENT_TEAL} 100%)`,
  margin: 0,
  border: "none",
}

const contentStyle = {
  padding: "32px 32px 16px",
}

const footerStyle = {
  padding: "16px 32px 32px",
  textAlign: "center" as const,
  fontSize: "12px",
  color: TEXT_MUTED,
  lineHeight: "1.5",
}

const brandNameStyle = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 700,
  margin: 0,
  letterSpacing: "0.5px",
}

const brandTaglineStyle = {
  color: "#a8b3d4",
  fontSize: "13px",
  fontWeight: 500,
  margin: "4px 0 0",
  letterSpacing: "1px",
  textTransform: "uppercase" as const,
}

export default function CaimedLayout({ preheader, children }: Props) {
  return (
    <Html>
      <Head />
      {preheader && <Preview>{preheader}</Preview>}
      <Body style={{ background: BG_PAGE, margin: 0, padding: "0 16px" }}>
        <Container style={containerStyle}>
          {/* Header con logo + brand */}
          <Section style={headerStyle}>
            <Img
              src={logoUrl}
              alt="CaimeD Medicina Preventiva"
              width="180"
              style={{ display: "block", margin: "0 auto 12px", maxWidth: "180px", height: "auto" }}
            />
            <Heading as="h1" style={brandNameStyle}>
              CaimeD<sup style={{ fontSize: "10px", verticalAlign: "super" }}>®</sup>
            </Heading>
            <Text style={brandTaglineStyle}>Medicina Preventiva</Text>
          </Section>

          {/* Acento gradient (rosa → teal) */}
          <Hr style={accentBarStyle} />

          {/* Contenido */}
          <Section style={contentStyle}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={{ margin: "0 0 4px", color: BRAND_NAVY_SOFT, fontWeight: 600 }}>
              CaimeD<sup style={{ fontSize: "8px", verticalAlign: "super" }}>®</sup> Medicina Preventiva
            </Text>
            <Text style={{ margin: 0, color: TEXT_MUTED, fontSize: "11px" }}>
              Este es un mensaje automático. Si tienes preguntas, responde a este correo o entra a la sección de Mensajes en la plataforma.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
