import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { type TreeItem, type DragState } from '@/types'
import {
  deepCloneItems, recalcDepths, countAll, findById, newId,
  reassignIds, topLevelSelected, insertAfter, insertInto, detach, isAncestor,
  maxDepth, expandToLevel as applyExpandToLevel,
} from '@/composables/useTree'

const MAX_UNDO = 50

export const useEditorStore = defineStore('editor', () => {
  const tree = ref<TreeItem[]>([])
  const selectedId = ref<string | null>(null)      // anchor / last selected
  const selectedIds = ref<string[]>([])             // full multi-selection
  const clipboard = ref<TreeItem[]>([])
  const undoStack = ref<TreeItem[][]>([])
  const redoStack = ref<TreeItem[][]>([])
  const drag = ref<DragState>({ sourceId: null, targetId: null, position: 'into' })
  const isDirty = ref(false)
  const expandLevel = ref(2)   // how many levels are currently expanded

  const stats = computed(() => countAll(tree.value))
  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const canPaste = computed(() => clipboard.value.length > 0)
  const hasSelection = computed(() => selectedIds.value.length > 0)

  function setTree(items: TreeItem[]) {
    recalcDepths(items)
    tree.value = items
    undoStack.value = []
    redoStack.value = []
    selectedId.value = null
    selectedIds.value = []
    isDirty.value = false
    expandLevel.value = 2
  }

  // ─── Selection ────────────────────────────────────────────────────────────
  function isSelected(id: string) {
    return selectedIds.value.includes(id)
  }

  function selectOnly(id: string | null) {
    selectedId.value = id
    selectedIds.value = id ? [id] : []
  }

  function toggleSelect(id: string) {
    const idx = selectedIds.value.indexOf(id)
    if (idx >= 0) {
      selectedIds.value.splice(idx, 1)
      selectedId.value = selectedIds.value[selectedIds.value.length - 1] ?? null
    } else {
      selectedIds.value.push(id)
      selectedId.value = id
    }
  }

  function selectRange(ids: string[]) {
    selectedIds.value = ids
    selectedId.value = ids[ids.length - 1] ?? null
  }

  function clearSelection() {
    selectedId.value = null
    selectedIds.value = []
  }

  // ─── Expand / collapse (all + per-level) ────────────────────────────────────
  function expandToLevel(level: number) {
    const clamped = Math.max(0, level)
    expandLevel.value = clamped
    applyExpandToLevel(tree.value, clamped)
  }
  function expandAll() { expandToLevel(maxDepth(tree.value) + 1) }
  function collapseAll() { expandToLevel(0) }
  function expandMore() { expandToLevel(expandLevel.value + 1) }
  function collapseLess() { expandToLevel(expandLevel.value - 1) }

  // ─── Undo / redo ────────────────────────────────────────────────────────────
  function pushUndo() {
    undoStack.value.push(deepCloneItems(tree.value))
    if (undoStack.value.length > MAX_UNDO) undoStack.value.shift()
    redoStack.value = []
    isDirty.value = true
  }

  function undo() {
    const prev = undoStack.value.pop()
    if (!prev) return
    redoStack.value.push(deepCloneItems(tree.value))
    tree.value = prev
    recalcDepths(tree.value)
    pruneSelection()
  }

  function redo() {
    const next = redoStack.value.pop()
    if (!next) return
    undoStack.value.push(deepCloneItems(tree.value))
    tree.value = next
    recalcDepths(tree.value)
    pruneSelection()
  }

  /** Drop selection ids that no longer exist in the tree (e.g. after undo). */
  function pruneSelection() {
    selectedIds.value = selectedIds.value.filter(id => findById(tree.value, id))
    if (selectedId.value && !findById(tree.value, selectedId.value)) {
      selectedId.value = selectedIds.value[selectedIds.value.length - 1] ?? null
    }
  }

  function markClean() {
    isDirty.value = false
  }

  // ─── Mutations (shared by toolbar, context menu, keyboard) ──────────────────

  /** Adds a new node. mode 'child' nests into the anchor folder; 'sibling'
   *  inserts after the anchor. Falls back to root when there is no anchor. */
  function addNode(opts: { name: string; isFile: boolean; mode: 'child' | 'sibling'; anchorId?: string | null }): string {
    pushUndo()
    const node: TreeItem = {
      id: newId(), name: opts.name, is_file: opts.isFile,
      children: [], depth: 0, parentId: null, expanded: false,
    }
    const anchor = opts.anchorId ?? selectedId.value
    if (opts.mode === 'sibling' && anchor) {
      insertAfter(tree.value, anchor, node)
    } else if (anchor) {
      const sel = findById(tree.value, anchor)
      if (sel && !sel.is_file) { sel.children.push(node); sel.expanded = true }
      else if (sel) insertAfter(tree.value, anchor, node)
      else tree.value.push(node)
    } else {
      tree.value.push(node)
    }
    recalcDepths(tree.value)
    selectOnly(node.id)
    return node.id
  }

  function renameNode(id: string, name: string) {
    const node = findById(tree.value, id)
    if (!node) return
    pushUndo()
    node.name = name
  }

  function setColor(id: string, color: string | null) {
    const node = findById(tree.value, id)
    if (!node) return
    pushUndo()
    if (color) node.color = color
    else delete node.color
  }

  /** Resolves the selection (or a single id) to its top-level roots. */
  function selectionRoots(fallbackId?: string): string[] {
    const ids = selectedIds.value.length ? selectedIds.value : (fallbackId ? [fallbackId] : [])
    return topLevelSelected(tree.value, ids)
  }

  function copySelection(fallbackId?: string) {
    const ids = selectionRoots(fallbackId)
    clipboard.value = ids
      .map(id => findById(tree.value, id))
      .filter((n): n is TreeItem => !!n)
      .map(n => deepCloneItems([n])[0])
  }

  function paste() {
    if (!clipboard.value.length) return
    pushUndo()
    const anchor = selectedId.value ? findById(tree.value, selectedId.value) : null
    const pastedIds: string[] = []
    for (const clip of clipboard.value) {
      const clone = deepCloneItems([clip])[0]
      reassignIds(clone)
      pastedIds.push(clone.id)
      if (anchor && !anchor.is_file) { anchor.children.push(clone); anchor.expanded = true }
      else if (anchor) insertAfter(tree.value, anchor.id, clone)
      else tree.value.push(clone)
    }
    recalcDepths(tree.value)
    selectRange(pastedIds)
  }

  function duplicateSelection(fallbackId?: string) {
    const ids = selectionRoots(fallbackId)
    if (!ids.length) return
    pushUndo()
    const newIds: string[] = []
    for (const id of ids) {
      const src = findById(tree.value, id)
      if (!src) continue
      const clone = deepCloneItems([src])[0]
      reassignIds(clone)
      newIds.push(clone.id)
      insertAfter(tree.value, id, clone)
    }
    recalcDepths(tree.value)
    selectRange(newIds)
  }

  function removeSelection(fallbackId?: string) {
    const ids = selectionRoots(fallbackId)
    if (!ids.length) return
    pushUndo()
    for (const id of ids) detach(tree.value, id)
    clearSelection()
  }

  /** Moves the current selection into `targetId`, or to the root when null
   *  (used by "Sposta in…"). */
  function moveSelectionInto(targetId: string | null, fallbackId?: string) {
    const ids = selectionRoots(fallbackId)
      .filter(id => id !== targetId && (targetId === null || !isAncestor(tree.value, id, targetId)))
    if (!ids.length) return
    pushUndo()
    const nodes = ids.map(id => detach(tree.value, id)).filter((n): n is TreeItem => !!n)
    for (const n of nodes) {
      if (targetId === null) tree.value.push(n)
      else insertInto(tree.value, targetId, n)
    }
    recalcDepths(tree.value)
    selectRange(nodes.map(n => n.id))
  }

  return {
    tree, selectedId, selectedIds, clipboard, undoStack, redoStack, drag, isDirty,
    stats, canUndo, canRedo, canPaste, hasSelection,
    setTree, isSelected, selectOnly, toggleSelect, selectRange, clearSelection,
    expandAll, collapseAll, expandMore, collapseLess, pushUndo, undo, redo, markClean,
    addNode, renameNode, setColor, copySelection, paste, duplicateSelection,
    removeSelection, moveSelectionInto, selectionRoots,
  }
})
