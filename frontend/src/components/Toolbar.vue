<template>
  <div class="flex items-center gap-1 px-3 py-2 border-b border-white/[0.07] shrink-0 flex-wrap">

    <!-- Save -->
    <button class="btn-surface" :disabled="!selectedName" title="Salva (⌘S)" @click="save">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 14a3 3 0 110-6 3 3 0 010 6zm3-10H5"/>
      </svg>
      Salva
      <span v-if="isDirty" class="w-1.5 h-1.5 rounded-full bg-accent shrink-0"/>
    </button>

    <!-- Scan -->
    <button class="btn-ghost" title="Scansiona cartella (⌘O)" @click="emit('scan')">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      Scan
    </button>

    <div class="w-px h-5 bg-white/10 mx-1"/>

    <!-- Add -->
    <button class="btn-ghost" :disabled="!selectedName && !selectedId" title="Aggiungi elemento (⌘N)"
      @click="emit('add', { mode: 'child', isFile: false, anchorId: selectedId })">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16M4 12h16"/>
      </svg>
      Aggiungi
    </button>

    <!-- Rename -->
    <button class="btn-ghost" :disabled="!selectedId" title="Rinomina (F2)" @click="selectedId && emit('rename', selectedId)">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
      </svg>
      Rinomina
    </button>

    <!-- Remove -->
    <button class="btn-danger" :disabled="!hasSelection" title="Elimina (Del)" @click="emit('delete', editorStore.selectionRoots())">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
      Rimuovi
    </button>

    <div class="w-px h-5 bg-white/10 mx-1"/>

    <!-- Move up/down -->
    <button class="btn-ghost !px-2" :disabled="!selectedId" title="Sposta su (Alt+↑)" @click="emit('move-up')">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/>
      </svg>
    </button>
    <button class="btn-ghost !px-2" :disabled="!selectedId" title="Sposta giù (Alt+↓)" @click="emit('move-down')">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
    <button class="btn-ghost !px-2" :disabled="!selectedId" title="Promuovi (Alt+←)" @click="emit('promote')">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
      </svg>
    </button>
    <button class="btn-ghost !px-2" :disabled="!selectedId" title="Depromuovi (Alt+→)" @click="emit('demote')">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
      </svg>
    </button>

    <div class="w-px h-5 bg-white/10 mx-1"/>

    <!-- Copy / Paste -->
    <button class="btn-ghost" :disabled="!hasSelection" title="Copia (⌘C)" @click="editorStore.copySelection()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <rect x="9" y="9" width="13" height="13" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
      </svg>
      Copia
    </button>
    <button class="btn-ghost" :disabled="!canPaste" title="Incolla (⌘V)" @click="editorStore.paste()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
      Incolla
    </button>

    <div class="w-px h-5 bg-white/10 mx-1"/>

    <!-- Collapse all / collapse one level / expand one level / expand all -->
    <button class="btn-ghost !px-2" title="Comprimi tutto" @click="editorStore.collapseAll()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 9l7-5 7 5M5 15l7 5 7-5"/>
      </svg>
    </button>
    <button class="btn-ghost !px-2" title="Comprimi un livello" @click="editorStore.collapseLess()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18 15l-6-6-6 6"/>
      </svg>
    </button>
    <button class="btn-ghost !px-2" title="Espandi un livello" @click="editorStore.expandMore()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 9l6 6 6-6"/>
      </svg>
    </button>
    <button class="btn-ghost !px-2" title="Espandi tutto" @click="editorStore.expandAll()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l-5 5 5 5M15 5l5 5-5 5M4 10h16"/>
      </svg>
    </button>
    <!-- Preview -->
    <button class="btn-ghost !px-2" :disabled="!tree.length" title="Anteprima struttura" @click="emit('preview')">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h10M4 14h16M4 18h10"/>
      </svg>
    </button>

    <div class="w-px h-5 bg-white/10 mx-1"/>

    <!-- Undo / Redo -->
    <button class="btn-ghost !px-2" :disabled="!canUndo" title="Annulla (⌘Z)" @click="editorStore.undo()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a5 5 0 015 5v1a5 5 0 01-5 5H9M3 10l4-4m-4 4l4 4"/>
      </svg>
    </button>
    <button class="btn-ghost !px-2" :disabled="!canRedo" title="Ripeti (⌘Y)" @click="editorStore.redo()">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 10H11a5 5 0 00-5 5v1a5 5 0 005 5h4M21 10l-4-4m4 4l-4 4"/>
      </svg>
    </button>

  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useTemplatesStore } from '@/stores/templates'
import { itemsToNodes } from '@/composables/useTree'

const emit = defineEmits<{
  (e: 'scan'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
  (e: 'promote'): void
  (e: 'demote'): void
  (e: 'add', opts: { mode: 'child' | 'sibling'; isFile: boolean; anchorId: string | null }): void
  (e: 'rename', id: string): void
  (e: 'delete', ids: string[]): void
  (e: 'preview'): void
}>()

const editorStore = useEditorStore()
const tplStore = useTemplatesStore()
const { selectedId, isDirty, canUndo, canRedo, canPaste, hasSelection, tree } = storeToRefs(editorStore)
const { selectedName } = storeToRefs(tplStore)

async function save() {
  if (!selectedName.value) return
  await tplStore.save(selectedName.value, itemsToNodes(tree.value))
  editorStore.markClean()
}
</script>
