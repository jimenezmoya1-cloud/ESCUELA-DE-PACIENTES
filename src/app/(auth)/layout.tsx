export const dynamic = "force-dynamic"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFFFF_38%,#F0F4FA_60%,#DCE9F8_82%,#A8C5E3_100%)] px-4 py-10 sm:py-12">
      {/* Orbes flotantes con desenfoque — animación intensificada */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-orb absolute -bottom-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-gradient-to-tr from-[#1E8DCE]/75 to-[#06559F]/45 blur-3xl" />
        <div className="animate-float-orb-reverse absolute -bottom-32 -right-40 h-[44rem] w-[44rem] rounded-full bg-gradient-to-tl from-[#06559F]/70 to-[#1E8DCE]/40 blur-3xl" />
        <div
          className="animate-float-orb-slow absolute left-1/2 bottom-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-t from-[#1E8DCE]/65 to-[#06559F]/25 blur-3xl"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="animate-float-orb absolute -top-40 right-1/4 h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-[#1E8DCE]/55 to-transparent blur-3xl"
          style={{ animationDelay: "3s" }}
        />
        <div
          className="animate-float-orb-reverse absolute top-1/4 -left-32 h-80 w-80 rounded-full bg-gradient-to-r from-[#06559F]/55 to-transparent blur-3xl"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="animate-orb-pulse absolute top-1/2 right-1/3 h-72 w-72 rounded-full bg-gradient-to-bl from-[#1E8DCE]/40 to-transparent blur-3xl"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="animate-orb-pulse absolute top-2/3 left-1/4 h-64 w-64 rounded-full bg-gradient-to-tr from-[#06559F]/45 to-transparent blur-3xl"
          style={{ animationDelay: "3.5s" }}
        />
      </div>

      {/* Contenido principal — logo grande arriba, formulario compacto debajo */}
      <div className="relative flex w-full max-w-2xl flex-col items-center">
        <div className="-mb-6 flex w-full justify-center sm:-mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-medicina-preventiva-transparente.png"
            alt="CaimeD Medicina Preventiva"
            width={1980}
            height={1320}
            draggable={false}
            className="animate-logo-entrance h-auto w-full max-w-[40rem] select-none"
          />
        </div>
        <div className="w-full max-w-md">
          <div className="glass-card animate-welcome-fade-up rounded-3xl p-7 sm:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
