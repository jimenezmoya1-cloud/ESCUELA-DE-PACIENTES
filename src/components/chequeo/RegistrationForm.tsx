'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { colombia } from '@/lib/clinical/data/colombia'
import { insertLead } from '@/lib/chequeo/actions'
import type { ChequeoScore, ChequeoFormData, ChequeoRegistration } from '@/lib/chequeo/types'

interface RegistrationFormProps {
  score: ChequeoScore
  formData: ChequeoFormData
  onSuccess: (result: { accountCreated: boolean; nombre: string }) => void
}

export default function RegistrationForm({
  score,
  formData,
  onSuccess,
}: RegistrationFormProps) {
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [cedula, setCedula] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [sexo, setSexo] = useState('')
  const [departamento, setDepartamento] = useState('BOGOTÁ, D.C.')
  const [municipio, setMunicipio] = useState('BOGOTÁ, D.C.')
  const [accountType, setAccountType] = useState<'full' | 'magic-link'>('full')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const departments = useMemo(
    () => colombia.map((d) => d.department).sort(),
    [],
  )

  const municipalities = useMemo(() => {
    const dept = colombia.find((d) => d.department === departamento)
    return dept ? dept.municipalities.sort() : []
  }, [departamento])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!consent) {
      setError('Debes aceptar para continuar.')
      return
    }

    if (accountType === 'magic-link' && !email) {
      setError('El correo es obligatorio para recibir el enlace de acceso.')
      return
    }

    if (accountType === 'full' && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    try {
      const registration: ChequeoRegistration = {
        nombre,
        apellido,
        cedula,
        fechaNacimiento,
        telefono,
        email,
        sexo,
        departamento,
        municipio,
        accountType,
        password,
        consent,
      }

      const result = await insertLead({ registration, formData, score })
      onSuccess({ accountCreated: result.accountCreated, nombre })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error. Intenta de nuevo.',
      )
    } finally {
      setLoading(false)
    }
  }

  const inputClasses =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-[#212B52] placeholder:text-gray-400 focus:border-[#1E8DCE] focus:outline-none focus:ring-1 focus:ring-[#1E8DCE]'
  const labelClasses = 'block text-sm font-medium text-[#212B52] mb-1'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-1 text-lg font-semibold text-[#212B52]">
        Guarda tu resultado
      </h2>
      <p className="mb-6 text-sm text-[#6A778F]">
        Completa tus datos para guardar tu chequeo y recibir seguimiento personalizado.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre / Apellido */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-nombre" className={labelClasses}>
              Nombre *
            </label>
            <input
              id="reg-nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label htmlFor="reg-apellido" className={labelClasses}>
              Apellido *
            </label>
            <input
              id="reg-apellido"
              type="text"
              required
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        {/* Cedula */}
        <div>
          <label htmlFor="reg-cedula" className={labelClasses}>
            Cédula *
          </label>
          <input
            id="reg-cedula"
            type="text"
            required
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            className={inputClasses}
          />
        </div>

        {/* Fecha de nacimiento */}
        <div>
          <label htmlFor="reg-fecha" className={labelClasses}>
            Fecha de nacimiento
          </label>
          <input
            id="reg-fecha"
            type="date"
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(e.target.value)}
            className={inputClasses}
          />
        </div>

        {/* Telefono */}
        <div>
          <label htmlFor="reg-telefono" className={labelClasses}>
            Teléfono *
          </label>
          <input
            id="reg-telefono"
            type="text"
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className={inputClasses}
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className={labelClasses}>
            Email{accountType === 'magic-link' ? ' *' : ''}
          </label>
          <input
            id="reg-email"
            type="email"
            required={accountType === 'magic-link'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClasses}
          />
        </div>

        {/* Sexo */}
        <fieldset>
          <legend className={labelClasses}>Sexo</legend>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-[#212B52]">
              <input
                type="radio"
                name="sexo"
                value="M"
                checked={sexo === 'M'}
                onChange={() => setSexo('M')}
                className="accent-[#06559F]"
              />
              Masculino
            </label>
            <label className="flex items-center gap-2 text-sm text-[#212B52]">
              <input
                type="radio"
                name="sexo"
                value="F"
                checked={sexo === 'F'}
                onChange={() => setSexo('F')}
                className="accent-[#06559F]"
              />
              Femenino
            </label>
          </div>
        </fieldset>

        {/* Departamento / Municipio */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="reg-departamento" className={labelClasses}>
              Departamento
            </label>
            <select
              id="reg-departamento"
              value={departamento}
              onChange={(e) => {
                setDepartamento(e.target.value)
                const dept = colombia.find(
                  (d) => d.department === e.target.value,
                )
                if (dept && dept.municipalities.length > 0) {
                  setMunicipio(dept.municipalities[0])
                }
              }}
              className={inputClasses}
            >
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reg-municipio" className={labelClasses}>
              Municipio
            </label>
            <select
              id="reg-municipio"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              className={inputClasses}
            >
              {municipalities.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Account type */}
        <fieldset>
          <legend className={labelClasses}>Tipo de cuenta</legend>
          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm text-[#212B52]">
              <input
                type="radio"
                name="accountType"
                value="full"
                checked={accountType === 'full'}
                onChange={() => setAccountType('full')}
                className="mt-0.5 accent-[#06559F]"
              />
              Crear mi cuenta para ver mi evolución
            </label>
            <label className="flex items-start gap-2 text-sm text-[#212B52]">
              <input
                type="radio"
                name="accountType"
                value="magic-link"
                checked={accountType === 'magic-link'}
                onChange={() => setAccountType('magic-link')}
                className="mt-0.5 accent-[#06559F]"
              />
              Solo envíame un enlace por correo
            </label>
          </div>
        </fieldset>

        {/* Password (full account only) */}
        {accountType === 'full' && (
          <div>
            <label htmlFor="reg-password" className={labelClasses}>
              Contraseña *
            </label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-[#6A778F]">
              Mínimo 6 caracteres
            </p>
          </div>
        )}

        {/* Consent */}
        <label className="flex items-start gap-2 text-sm text-[#6A778F]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 accent-[#06559F]"
          />
          Acepto que CAIMED me contacte para informarme sobre su programa de salud preventiva.
        </label>

        {/* Error */}
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#06559F] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#054A87] disabled:opacity-60"
        >
          {loading && (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          )}
          Guardar mi resultado
        </button>
      </form>
    </motion.div>
  )
}
