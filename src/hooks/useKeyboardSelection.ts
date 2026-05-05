"use client"

import { useEffect } from 'react'

/**
 * Intercepta teclas numéricas (1-9) para activar el botón con `data-key="<n>"`
 * dentro del grupo `[data-keyboard-group]` que contiene el `document.activeElement`.
 *
 * Tab nativo navega entre botones; los números aceleran la selección dentro
 * del grupo enfocado. No interfiere con inputs de texto/número (el handler
 * los detecta y se retira).
 */
export function useKeyboardSelection() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target instanceof HTMLInputElement) {
        if (target.type !== 'radio' && target.type !== 'checkbox' && target.type !== 'button') return
      }
      if (target instanceof HTMLTextAreaElement) return
      if (target instanceof HTMLSelectElement) return
      if (target.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const num = parseInt(e.key, 10)
      if (isNaN(num) || num < 1 || num > 9) return

      const group = target.closest('[data-keyboard-group]') as HTMLElement | null
      if (!group) return

      const btn = group.querySelector(`[data-key="${num}"]`) as HTMLElement | null
      if (!btn) return

      e.preventDefault()
      btn.click()
      btn.focus()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
