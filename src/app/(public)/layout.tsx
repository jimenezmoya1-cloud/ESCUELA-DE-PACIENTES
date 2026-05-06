export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F0F4FA] to-white">
      {children}
    </div>
  )
}
