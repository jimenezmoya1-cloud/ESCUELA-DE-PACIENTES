export const dynamic = "force-dynamic"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFFFF_38%,#F0F4FA_60%,#DCE9F8_82%,#A8C5E3_100%)] px-4 py-10 sm:py-12">
      {/* Orbes flotantes con desenfoque para reforzar el glassmorphism (paleta original) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-orb absolute -bottom-40 -left-32 h-[34rem] w-[34rem] rounded-full bg-gradient-to-tr from-[#1E8DCE]/55 to-[#06559F]/30 blur-3xl" />
        <div className="animate-float-orb-reverse absolute -bottom-32 -right-32 h-[38rem] w-[38rem] rounded-full bg-gradient-to-tl from-[#06559F]/50 to-[#1E8DCE]/25 blur-3xl" />
        <div
          className="animate-float-orb-slow absolute left-1/2 bottom-1/4 h-80 w-80 -translate-x-1/2 rounded-full bg-gradient-to-t from-[#1E8DCE]/45 to-[#06559F]/15 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="animate-float-orb absolute -top-32 right-1/4 h-72 w-72 rounded-full bg-gradient-to-br from-[#1E8DCE]/35 to-transparent blur-3xl"
          style={{ animationDelay: "5s" }}
        />
        <div
          className="animate-float-orb-reverse absolute top-1/3 -left-24 h-64 w-64 rounded-full bg-gradient-to-r from-[#06559F]/30 to-transparent blur-3xl"
          style={{ animationDelay: "3s" }}
        />
      </div>

      {/* Contenido principal — logo y formulario unidos en una sola tarjeta cuadrada */}
      <div className="relative w-full max-w-3xl">
        <div className="glass-card animate-welcome-fade-up rounded-3xl px-6 pb-7 pt-1 sm:px-8 sm:pb-9 sm:pt-2">
          <div className="-mt-6 -mb-8 flex flex-col items-center sm:-mt-8 sm:-mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-medicina-preventiva-transparente.png"
              alt="CaimeD Medicina Preventiva"
              width={1980}
              height={1320}
              draggable={false}
              className="animate-logo-entrance h-auto w-full max-w-[44rem] select-none"
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
