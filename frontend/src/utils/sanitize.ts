// NB: replica di sanitizeFilename in backend/persistence.go — se
// modifichi questa logica, aggiorna anche la versione Go.
export function sanitizeFilename(name: string): string {
  const s = name.replace(/[/\\:*?"<>|]/g, '_')
  const runes = [...s]
  return runes.length > 100 ? runes.slice(0, 100).join('') : s
}

// Normalized key for duplicate detection: sanitized + lowercased,
// so collisions that differ only by case OR only by sanitized chars
// are both treated as duplicates.
export function templateNameKey(name: string): string {
  return sanitizeFilename(name.trim()).toLowerCase()
}
