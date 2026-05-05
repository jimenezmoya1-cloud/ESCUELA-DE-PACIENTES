export function copToCents(cop: number): number {
  return Math.round(cop * 100)
}

export function centsToCop(cents: number): number {
  return cents / 100
}

export function formatCop(cents: number): string {
  const cop = centsToCop(cents)
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(cop)
}
