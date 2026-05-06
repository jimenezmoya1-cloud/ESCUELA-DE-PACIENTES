"use client"

import { useState, useEffect } from "react"
import { Menu, X } from "lucide-react"

const NAV_LINKS = [
  { label: "Inicio", href: "#inicio" },
  { label: "Programa", href: "#programa" },
  { label: "Planes", href: "#planes" },
  { label: "Contacto", href: "#contacto" },
]

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 80)
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  function scrollTo(href: string) {
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#080e1f]/90 backdrop-blur-xl shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <a href="#inicio" onClick={(e) => { e.preventDefault(); scrollTo("#inicio") }}>
          <img
            src="/logo-medicina-preventiva-transparente.png"
            alt="CaimeD Medicina Preventiva"
            className="h-10 w-auto brightness-0 invert"
            draggable={false}
          />
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { e.preventDefault(); scrollTo(link.href) }}
              className="text-sm font-medium text-white/70 transition-colors hover:text-white cursor-pointer"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/chequeo"
            className="rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-primary/30 hover:-translate-y-0.5 cursor-pointer"
          >
            Evaluación Gratis
          </a>
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-white md:hidden cursor-pointer"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-white/10 bg-[#080e1f]/95 backdrop-blur-xl md:hidden">
          <nav className="flex flex-col gap-1 px-6 py-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => { e.preventDefault(); scrollTo(link.href) }}
                className="rounded-lg px-4 py-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/chequeo"
              className="mt-2 rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-3 text-center text-sm font-semibold text-white cursor-pointer"
            >
              Evaluación Gratis
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
