export const dynamic = "force-dynamic"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* TODO: reemplazar con /public/logo.svg */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary">CAIMED</h1>
          <p className="mt-1 text-sm text-tertiary">Escuela de Pacientes</p>
        </div>
        {children}
      </div>
    </div>
  )
}
