// Iconos planos SVG para el sistema de recompensas
// Cada icono es un componente con estilo flat/line consistente

export function RewardIcon({ name, className = "h-6 w-6" }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? ICONS.star
  return <Icon className={className} />
}

function IconSvg({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  )
}

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  // Módulos
  footsteps: ({ className }) => (
    <IconSvg className={className}>
      <path d="M18 8c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4z" fill="currentColor" opacity="0.3" />
      <path d="M14 14c-3 0-6 2-6 6v4h12v-4c0-4-3-6-6-6z" fill="currentColor" opacity="0.5" />
      <path d="M34 20c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4z" fill="currentColor" opacity="0.3" />
      <path d="M30 26c-3 0-6 2-6 6v4h12v-4c0-4-3-6-6-6z" fill="currentColor" opacity="0.5" />
      <path d="M10 30l8-6m4-4l8-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 3" />
    </IconSvg>
  ),
  flame: ({ className }) => (
    <IconSvg className={className}>
      <path d="M24 4c0 0-12 12-12 24a12 12 0 0024 0C36 16 24 4 24 4z" fill="currentColor" opacity="0.15" />
      <path d="M24 4c0 0-12 12-12 24a12 12 0 0024 0C36 16 24 4 24 4z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 20c0 0-4 4-4 10a4 4 0 008 0c0-6-4-10-4-10z" fill="currentColor" opacity="0.3" />
    </IconSvg>
  ),
  mountain: ({ className }) => (
    <IconSvg className={className}>
      <path d="M4 40l16-32 8 12 8-6 8 26H4z" fill="currentColor" opacity="0.15" />
      <path d="M4 40l16-32 8 12 8-6 8 26H4z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 8l-4 8 4-2 4 2-4-8z" fill="currentColor" opacity="0.3" />
    </IconSvg>
  ),
  heartbeat: ({ className }) => (
    <IconSvg className={className}>
      <path d="M24 42s-16-10-16-22a10 10 0 0116-8 10 10 0 0116 8c0 12-16 22-16 22z" fill="currentColor" opacity="0.15" />
      <path d="M24 42s-16-10-16-22a10 10 0 0116-8 10 10 0 0116 8c0 12-16 22-16 22z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 24h8l3-6 4 12 3-6h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconSvg>
  ),
  target: ({ className }) => (
    <IconSvg className={className}>
      <circle cx="24" cy="24" r="18" fill="currentColor" opacity="0.08" />
      <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="2" opacity="0.5" />
      <circle cx="24" cy="24" r="6" stroke="currentColor" strokeWidth="2" opacity="0.7" />
      <circle cx="24" cy="24" r="2" fill="currentColor" />
    </IconSvg>
  ),
  rocket: ({ className }) => (
    <IconSvg className={className}>
      <path d="M24 4c-6 8-8 16-8 24h16c0-8-2-16-8-24z" fill="currentColor" opacity="0.15" />
      <path d="M24 4c-6 8-8 16-8 24h16c0-8-2-16-8-24z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 28l-6 4 2-8m20 4l6 4-2-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 36h8l-4 8-4-8z" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="20" r="3" fill="currentColor" opacity="0.3" stroke="currentColor" strokeWidth="2" />
    </IconSvg>
  ),
  graduation: ({ className }) => (
    <IconSvg className={className}>
      <path d="M24 6L4 18l20 12 20-12L24 6z" fill="currentColor" opacity="0.15" />
      <path d="M24 6L4 18l20 12 20-12L24 6z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 24v12l12 6 12-6V24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M44 18v14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="44" cy="34" r="2" fill="currentColor" />
    </IconSvg>
  ),
  // Quizzes
  lightbulb: ({ className }) => (
    <IconSvg className={className}>
      <path d="M24 4a14 14 0 00-8 25.4V34h16v-4.6A14 14 0 0024 4z" fill="currentColor" opacity="0.15" />
      <path d="M24 4a14 14 0 00-8 25.4V34h16v-4.6A14 14 0 0024 4z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 38h12M20 42h8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 14v6m-4 2h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </IconSvg>
  ),
  star: ({ className }) => (
    <IconSvg className={className}>
      <path d="M24 4l6 14h14l-11 9 4 15-13-9-13 9 4-15L4 18h14z" fill="currentColor" opacity="0.15" />
      <path d="M24 4l6 14h14l-11 9 4 15-13-9-13 9 4-15L4 18h14z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconSvg>
  ),
  crown: ({ className }) => (
    <IconSvg className={className}>
      <path d="M6 36V18l10 8 8-14 8 14 10-8v18H6z" fill="currentColor" opacity="0.15" />
      <path d="M6 36V18l10 8 8-14 8 14 10-8v18H6z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 36h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="30" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="16" cy="30" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="32" cy="30" r="1.5" fill="currentColor" opacity="0.3" />
    </IconSvg>
  ),
  // Tareas
  pencil: ({ className }) => (
    <IconSvg className={className}>
      <path d="M8 36l-2 8 8-2 24-24-6-6L8 36z" fill="currentColor" opacity="0.15" />
      <path d="M8 36l-2 8 8-2 24-24-6-6L8 36z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 12l6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </IconSvg>
  ),
  clipboard: ({ className }) => (
    <IconSvg className={className}>
      <rect x="8" y="8" width="32" height="36" rx="4" fill="currentColor" opacity="0.1" />
      <rect x="8" y="8" width="32" height="36" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <rect x="16" y="4" width="16" height="8" rx="2" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="2" />
      <path d="M16 24h16M16 30h12M16 36h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </IconSvg>
  ),
  medal: ({ className }) => (
    <IconSvg className={className}>
      <path d="M16 4l-6 16h6l-4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <path d="M32 4l6 16h-6l4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <circle cx="24" cy="30" r="12" fill="currentColor" opacity="0.15" />
      <circle cx="24" cy="30" r="12" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="24" cy="30" r="7" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <path d="M24 25v6m-3-3h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </IconSvg>
  ),
  // Rachas
  calendar: ({ className }) => (
    <IconSvg className={className}>
      <rect x="6" y="10" width="36" height="32" rx="4" fill="currentColor" opacity="0.1" />
      <rect x="6" y="10" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="2.5" />
      <path d="M6 20h36" stroke="currentColor" strokeWidth="2.5" />
      <path d="M16 6v8M32 6v8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 28l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconSvg>
  ),
  fire: ({ className }) => (
    <IconSvg className={className}>
      <path d="M24 2c0 0-16 14-16 28a16 16 0 0032 0C40 16 24 2 24 2z" fill="currentColor" opacity="0.15" />
      <path d="M24 2c0 0-16 14-16 28a16 16 0 0032 0C40 16 24 2 24 2z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 18c0 0-6 6-6 14a6 6 0 0012 0c0-8-6-14-6-14z" fill="currentColor" opacity="0.25" stroke="currentColor" strokeWidth="2" />
    </IconSvg>
  ),
  bolt: ({ className }) => (
    <IconSvg className={className}>
      <path d="M28 4L12 26h12L20 44l16-22H24L28 4z" fill="currentColor" opacity="0.15" />
      <path d="M28 4L12 26h12L20 44l16-22H24L28 4z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconSvg>
  ),
  shield: ({ className }) => (
    <IconSvg className={className}>
      <path d="M24 4L6 12v12c0 12 8 18 18 20 10-2 18-8 18-20V12L24 4z" fill="currentColor" opacity="0.15" />
      <path d="M24 4L6 12v12c0 12 8 18 18 20 10-2 18-8 18-20V12L24 4z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 24l4 4 8-8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </IconSvg>
  ),
  // Especiales
  trophy: ({ className }) => (
    <IconSvg className={className}>
      <path d="M14 6h20v14a10 10 0 01-20 0V6z" fill="currentColor" opacity="0.15" />
      <path d="M14 6h20v14a10 10 0 01-20 0V6z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 10H8a4 4 0 000 8h2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M34 10h6a4 4 0 010 8h-2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 30v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 40h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M18 36h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </IconSvg>
  ),
}
