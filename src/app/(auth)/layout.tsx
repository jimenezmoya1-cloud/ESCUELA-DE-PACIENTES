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
        <div className="animate-float-orb absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-gradient-to-tr from-[#1E8DCE]/30 to-[#06559F]/15 blur-3xl" />
        <div className="animate-float-orb-reverse absolute -bottom-24 -right-24 h-[32rem] w-[32rem] rounded-full bg-gradient-to-tl from-[#06559F]/25 to-[#1E8DCE]/10 blur-3xl" />
        <div
          className="animate-float-orb absolute left-1/2 bottom-1/4 h-72 w-72 -translate-x-1/2 rounded-full bg-gradient-to-t from-[#1E8DCE]/20 to-transparent blur-3xl"
          style={{ animationDelay: "4s" }}
        />
      </div>

      {/* Contenido principal */}
      <div className="relative w-full max-w-md">
        <div className="mb-7 flex flex-col items-center sm:mb-9">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-medicina-preventiva.png"
            alt="CaimeD Medicina Preventiva"
            width={1536}
            height={1024}
            draggable={false}
            className="logo-blend animate-logo-entrance h-auto w-72 max-w-full select-none sm:w-80"
          />
        </div>
        <div className="animate-welcome-fade-up">{children}</div>
      </div>
    </div>
  )
}
