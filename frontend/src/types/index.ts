// Internal plain interfaces — used throughout the app.
// Cast to backend.* only at Go call-sites (see goTypes helper).

export interface Node {
  name: string
  children?: Node[]
  is_file?: boolean
  color?: string
}

export interface Template {
  template_name: string
  tree: Node[]
}

export type ColorMode = 'palette' | 'depth' | 'single'

export interface Settings {
  accent: string          // hex color of the app tint (e.g. "#4F8EF7")
  accent_custom?: string[] // up to 4 user-added hex tints
  font_size: number
  default_output: string
  scan_hidden: boolean
  scan_max_depth: number
  theme?: string
  color_mode?: ColorMode
  palette?: string[]
  depth_primary?: string
  single_color?: string
}

// UI-only types

export interface TreeItem {
  id: string          // unique runtime id (not persisted)
  name: string
  is_file: boolean
  children: TreeItem[]
  depth: number
  parentId: string | null
  expanded: boolean
  color?: string
}

export type DropPosition = 'before' | 'into' | 'after'

export interface DragState {
  sourceId: string | null
  targetId: string | null
  position: DropPosition
}

// Fixed app-tint presets (point 5). Stored as hex on `settings.accent`.
export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: 'Arancione', hex: '#ED8936' },
  { name: 'Verde',     hex: '#48BB78' },
  { name: 'Petrolio',  hex: '#0E8C84' },
  { name: 'Blu',       hex: '#4F8EF7' },
]

// Legacy name → hex, for settings saved before tints became hex-based.
const LEGACY_ACCENTS: Record<string, string> = {
  Blue: '#4F8EF7', Red: '#F56565', Green: '#48BB78', Purple: '#9F7AEA', Orange: '#ED8936',
}

/** Normalises an accent value (hex or legacy name) to a hex string. */
export function resolveAccent(value: string | undefined): string {
  if (!value) return '#4F8EF7'
  if (value.startsWith('#')) return value
  return LEGACY_ACCENTS[value] ?? '#4F8EF7'
}
