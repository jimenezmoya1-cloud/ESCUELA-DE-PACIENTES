"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { ModulePdf } from "@/types/database"

export default function PdfUploader({
  moduleId,
  pdfs: initialPdfs,
}: {
  moduleId: string
  pdfs: ModulePdf[]
}) {
  const [pdfs, setPdfs] = useState(initialPdfs)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()
  const router = useRouter()

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    for (const file of Array.from(files)) {
      if (file.type !== "application/pdf") {
        alert(`"${file.name}" no es un archivo PDF`)
        continue
      }

      // Upload to Supabase Storage
      const fileName = `${moduleId}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from("module-pdfs")
        .upload(fileName, file)

      if (uploadError) {
        console.error("Upload error:", uploadError)
        alert(`Error al subir "${file.name}"`)
        continue
      }

      // Get public URL
      const { data: urlData } = supabase
        .storage
        .from("module-pdfs")
        .getPublicUrl(uploadData.path)

      // Save to database
      const { data: pdfRecord, error: dbError } = await supabase
        .from("module_pdfs")
        .insert({
          module_id: moduleId,
          filename: file.name,
          storage_path: urlData.publicUrl,
          file_size: file.size,
        })
        .select()
        .single()

      if (!dbError && pdfRecord) {
        setPdfs((prev) => [...prev, pdfRecord])
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
    router.refresh()
  }

  async function handleDelete(pdf: ModulePdf) {
    if (!confirm(`¿Eliminar el archivo "${pdf.filename}"?`)) return

    // Extract storage path from URL to delete file
    const pathMatch = pdf.storage_path.match(/module-pdfs\/(.+)$/)
    if (pathMatch) {
      await supabase.storage.from("module-pdfs").remove([pathMatch[1]])
    }

    // Delete from database
    await supabase.from("module_pdfs").delete().eq("id", pdf.id)

    setPdfs((prev) => prev.filter((p) => p.id !== pdf.id))
    router.refresh()
  }

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-semibold text-neutral">
        Archivos PDF ({pdfs.length})
      </h2>

      {/* List of PDFs */}
      <div className="space-y-2 mb-4">
        {pdfs.map((pdf) => (
          <div
            key={pdf.id}
            className="flex items-center gap-3 rounded-lg border border-tertiary/20 p-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral truncate">{pdf.filename}</p>
              <p className="text-xs text-tertiary">
                {pdf.file_size ? `${(pdf.file_size / 1024 / 1024).toFixed(1)} MB` : "PDF"}
              </p>
            </div>
            <a
              href={pdf.storage_path}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded px-2 py-1 text-xs text-secondary hover:bg-secondary/10"
            >
              Ver
            </a>
            <button
              onClick={() => handleDelete(pdf)}
              className="rounded px-2 py-1 text-xs text-error hover:bg-error/10"
            >
              Eliminar
            </button>
          </div>
        ))}
        {pdfs.length === 0 && (
          <p className="text-sm text-tertiary text-center py-3">
            No hay PDFs. Suba archivos para este módulo.
          </p>
        )}
      </div>

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleUpload}
          className="hidden"
          id="pdf-upload"
        />
        <label
          htmlFor="pdf-upload"
          className={`cursor-pointer rounded-lg border-2 border-dashed border-tertiary/30 px-4 py-3 text-sm font-medium text-tertiary transition-colors hover:border-secondary hover:text-secondary ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Subiendo...
            </span>
          ) : (
            "+ Subir PDF(s)"
          )}
        </label>
        <p className="text-xs text-tertiary">
          Puede seleccionar múltiples archivos PDF
        </p>
      </div>
    </div>
  )
}
