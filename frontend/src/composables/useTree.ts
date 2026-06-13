import { type Node, type TreeItem } from '@/types'
import { templateNameKey } from '@/utils/sanitize'

let _idCounter = 0
/** Monotonic runtime id generator (ids are not persisted). */
export const newId = () => `n${++_idCounter}`

// ─── Conversion ──────────────────────────────────────────────────────────────

export function nodesToItems(nodes: Node[], depth = 0, parentId: string | null = null): TreeItem[] {
  return (nodes ?? []).map(n => {
    const id = newId()
    const item: TreeItem = {
      id,
      name: n.name,
      is_file: !!n.is_file,
      depth,
      parentId,
      expanded: depth < 2,
      children: nodesToItems(n.children ?? [], depth + 1, id),
    }
    if (n.color) item.color = n.color
    return item
  })
}

export function itemsToNodes(items: TreeItem[]): Node[] {
  return items.map(i => {
    const n: Node = { name: i.name }
    if (i.is_file) n.is_file = true
    if (i.children.length) n.children = itemsToNodes(i.children)
    if (i.color) n.color = i.color
    return n
  })
}

export function deepCloneItems(items: TreeItem[]): TreeItem[] {
  return items.map(i => ({ ...i, children: deepCloneItems(i.children) }))
}

/** Assigns fresh runtime ids to an item and all its descendants (in place). */
export function reassignIds(item: TreeItem) {
  item.id = newId()
  for (const c of item.children) reassignIds(c)
}

/** Returns the ids whose ancestors are NOT also in the set — i.e. the roots of
 *  the selection. Prevents moving/copying a node and its parent together.
 *  Builds an id→parentId map once (O(n)) so it stays fast for large selections. */
export function topLevelSelected(root: TreeItem[], ids: string[]): string[] {
  const set = new Set(ids)
  const parentOf = new Map<string, string | null>()
  const index = (items: TreeItem[]) => {
    for (const it of items) { parentOf.set(it.id, it.parentId); index(it.children) }
  }
  index(root)
  return ids.filter(id => {
    let parent = parentOf.get(id) ?? null
    while (parent) {
      if (set.has(parent)) return false
      parent = parentOf.get(parent) ?? null
    }
    return true
  })
}

// ─── Lookup ───────────────────────────────────────────────────────────────────

export function findById(items: TreeItem[], id: string): TreeItem | null {
  for (const item of items) {
    if (item.id === id) return item
    const found = findById(item.children, id)
    if (found) return found
  }
  return null
}

export function findParentList(root: TreeItem[], id: string): [TreeItem[], number] | null {
  for (let i = 0; i < root.length; i++) {
    if (root[i].id === id) return [root, i]
    const found = findParentList(root[i].children, id)
    if (found) return found
  }
  return null
}

/** Returns true if `ancestorId` is a parent/grandparent/... of `targetId`. */
export function isAncestor(root: TreeItem[], ancestorId: string, targetId: string): boolean {
  const ancestor = findById(root, ancestorId)
  if (!ancestor) return false
  return findById(ancestor.children, targetId) !== null ||
    ancestor.children.some((c: TreeItem) => isAncestor(ancestor.children, c.id, targetId))
}

// ─── Naming / duplicate detection ───────────────────────────────────────────

// Matches an optional leading space + "(copy)" or "(copy N)" at end of string.
const COPY_SUFFIX = /\s*\(copy(?:\s+\d+)?\)$/i

/** True when a sibling already uses `name` (normalized key), excluding `exceptId`
 *  (e.g. the node being renamed against itself). Case-only and sanitize-only
 *  collisions both count as duplicates, matching templateNameKey semantics. */
export function siblingNameExists(siblings: TreeItem[], name: string, exceptId?: string): boolean {
  const key = templateNameKey(name)
  return siblings.some(s => s.id !== exceptId && templateNameKey(s.name) === key)
}

/** Returns a name unique among `siblings`. Always strips a trailing "(copy)"/
 *  "(copy N)" from `desiredName` first (so a moved "Report (copy)" reverts to
 *  "Report" when free, and progressives never nest). If the stripped base is
 *  free it is returned; otherwise "base (copy)", "base (copy 2)", … is tried. */
export function uniqueChildName(siblings: TreeItem[], desiredName: string, exceptId?: string): string {
  let base = desiredName.replace(COPY_SUFFIX, '').trim()
  if (!base) base = desiredName.trim()        // fallback: name was only "(copy)"
  if (!siblingNameExists(siblings, base, exceptId)) return base
  let candidate = `${base} (copy)`
  let n = 2
  while (siblingNameExists(siblings, candidate, exceptId)) candidate = `${base} (copy ${n++})`
  return candidate
}

// ─── Mutation ─────────────────────────────────────────────────────────────────

export function detach(root: TreeItem[], id: string): TreeItem | null {
  const loc = findParentList(root, id)
  if (!loc) return null
  return loc[0].splice(loc[1], 1)[0]
}

export function insertBefore(root: TreeItem[], refId: string, node: TreeItem) {
  const loc = findParentList(root, refId)
  if (!loc) return
  loc[0].splice(loc[1], 0, node)
}

export function insertAfter(root: TreeItem[], refId: string, node: TreeItem) {
  const loc = findParentList(root, refId)
  if (!loc) return
  loc[0].splice(loc[1] + 1, 0, node)
}

export function insertInto(root: TreeItem[], parentId: string, node: TreeItem) {
  const parent = findById(root, parentId)
  if (!parent || parent.is_file) return
  parent.children.push(node)
  parent.expanded = true
}

// ─── Reorder ──────────────────────────────────────────────────────────────────

export function moveUp(root: TreeItem[], id: string): boolean {
  const loc = findParentList(root, id)
  if (!loc || loc[1] === 0) return false
  const [list, idx] = loc
  ;[list[idx - 1], list[idx]] = [list[idx], list[idx - 1]]
  return true
}

export function moveDown(root: TreeItem[], id: string): boolean {
  const loc = findParentList(root, id)
  if (!loc) return false
  const [list, idx] = loc
  if (idx >= list.length - 1) return false
  ;[list[idx], list[idx + 1]] = [list[idx + 1], list[idx]]
  return true
}

/** Promote: move item out of its parent, placing it after the parent. */
export function promote(root: TreeItem[], id: string): boolean {
  const item = findById(root, id)
  if (!item || item.parentId === null) return false
  const parentId = item.parentId
  detach(root, id)
  insertAfter(root, parentId, item)
  return true
}

/** Demote: move item into its previous sibling (as last child). */
export function demoteNode(root: TreeItem[], id: string): boolean {
  const loc = findParentList(root, id)
  if (!loc || loc[1] === 0) return false
  const [list, idx] = loc
  const prevSibling = list[idx - 1]
  if (prevSibling.is_file) return false
  const [node] = list.splice(idx, 1)
  prevSibling.children.push(node)
  prevSibling.expanded = true
  return true
}

// ─── Depth recalc ─────────────────────────────────────────────────────────────

export function recalcDepths(items: TreeItem[], depth = 0, parentId: string | null = null) {
  for (const item of items) {
    item.depth = depth
    item.parentId = parentId
    recalcDepths(item.children, depth + 1, item.id)
  }
}

// ─── Flatten (for rendering) ──────────────────────────────────────────────────

export function flattenVisible(items: TreeItem[]): TreeItem[] {
  const out: TreeItem[] = []
  for (const item of items) {
    out.push(item)
    if (!item.is_file && item.expanded) out.push(...flattenVisible(item.children))
  }
  return out
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export function countAll(items: TreeItem[]): { folders: number; files: number } {
  let folders = 0, files = 0
  for (const item of items) {
    if (item.is_file) files++; else folders++
    const sub = countAll(item.children)
    folders += sub.folders; files += sub.files
  }
  return { folders, files }
}

// ─── Expand / collapse all ─────────────────────────────────────────────────────

export function setAllExpanded(items: TreeItem[], expanded: boolean) {
  for (const item of items) {
    if (!item.is_file) item.expanded = expanded
    setAllExpanded(item.children, expanded)
  }
}

/** Deepest depth present in the forest (0 for a flat/empty tree). */
export function maxDepth(items: TreeItem[]): number {
  let m = 0
  for (const item of items) {
    m = Math.max(m, item.depth, maxDepth(item.children))
  }
  return m
}

/** Expands folders whose depth is below `level`, collapsing the rest.
 *  level 0 = everything collapsed; level N = first N levels open. */
export function expandToLevel(items: TreeItem[], level: number) {
  for (const item of items) {
    if (!item.is_file) item.expanded = item.depth < level
    expandToLevel(item.children, level)
  }
}

// ─── ASCII tree rendering ───────────────────────────────────────────────────────

/** Renders the forest as a copy-friendly ASCII tree. */
export function toAsciiTree(items: TreeItem[], rootLabel?: string): string {
  const lines: string[] = []
  if (rootLabel) lines.push(`${rootLabel}/`)
  const walk = (nodes: TreeItem[], prefix: string) => {
    nodes.forEach((node, i) => {
      const last = i === nodes.length - 1
      const branch = last ? '└─ ' : '├─ '
      lines.push(prefix + branch + node.name + (node.is_file ? '' : '/'))
      if (!node.is_file && node.children.length) {
        walk(node.children, prefix + (last ? '   ' : '│  '))
      }
    })
  }
  walk(items, rootLabel ? '' : '')
  return lines.join('\n')
}

// ─── Color helpers ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Mixes a hex color toward white by `amount` (0 = unchanged, 1 = white). */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

/** The three depth shades derived from a primary color: dark, medium, light. */
export function depthShades(primary: string): [string, string, string] {
  return [primary, lighten(primary, 0.35), lighten(primary, 0.62)]
}
