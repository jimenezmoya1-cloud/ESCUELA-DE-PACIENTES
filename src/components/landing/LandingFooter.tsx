import { Heart } from "lucide-react"

export default function LandingFooter() {
  return (
    <footer id="contacto" className="bg-[#111827] px-6 py-16 text-white/60">
      <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-3">
        <div>
          <img
            src="/logo-medicina-preventiva-transparente.png"
            alt="CaimeD Medicina Preventiva"
            className="mb-4 h-12 w-auto brightness-0 invert"
            draggable={false}
          />
          <p className="text-sm leading-relaxed">
            Programa de medicina preventiva cardiovascular con presencia nacional
            e internacional desde 2007.
          </p>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">
            Programa
          </h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#programa" className="transition-colors hover:text-white cursor-pointer">¿Cómo funciona?</a></li>
            <li><a href="#planes" className="transition-colors hover:text-white cursor-pointer">Planes</a></li>
            <li><a href="/chequeo" className="transition-colors hover:text-white cursor-pointer">Evaluación de salud</a></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/80">
            Contacto
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://wa.me/573001234567"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white cursor-pointer"
              >
                WhatsApp
              </a>
            </li>
            <li>Bogotá · Medellín · Cali · Barranquilla</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl items-center justify-center gap-1 border-t border-white/10 pt-8 text-xs text-white/40">
        <span>© {new Date().getFullYear()} CAIMED CardioPreventiva</span>
        <Heart size={12} className="text-error" fill="currentColor" />
        <span>Todos los derechos reservados</span>
      </div>
    </footer>
  )
}
