<template>
  <aside class="flex flex-col h-full glass border-r border-white/10 w-[220px] shrink-0">
    <!-- Logo -->
    <div class="titlebar-drag px-4 pt-[52px] pb-3 shrink-0">
      <div class="titlebar-no-drag flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style="background: linear-gradient(160deg, #2A2A2C, #0E0E0C); box-shadow: 0 2px 8px rgba(0,0,0,0.45)">
          <svg class="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="#E37C50">
            <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
          </svg>
        </div>
        <div>
          <div class="text-sm font-semibold text-white leading-tight">FoldGen</div>
          <div class="text-[10px] text-white/40 leading-tight">Generatore strutture</div>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="px-3 pb-2 shrink-0">
      <input v-model="search" class="input-base py-1.5 text-xs" placeholder="Cerca template..."/>
    </div>

    <!-- Header row -->
    <div class="flex items-center justify-between px-3 pb-1 shrink-0">
      <span class="text-[10px] font-semibold uppercase tracking-widest text-white/30">Template</span>
      <button class="btn-ghost rounded-md p-1 text-white/40 hover:text-accent" title="Nuovo template" @click="openNewDialog">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
        </svg>
      </button>
    </div>

    <!-- Template list -->
    <div class="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
      <div
        v-for="tpl in filtered"
        :key="tpl.template_name"
        :class="['tpl-item', tpl.template_name === selectedName ? 'active' : '']"
        @click="select(tpl.template_name)"
        @contextmenu.prevent="openCtx($event, tpl.template_name)"
      >
        <svg class="w-3.5 h-3.5 shrink-0 opacity-60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
        </svg>
        <span class="flex-1 truncate text-xs">{{ tpl.template_name }}</span>
      </div>

      <div v-if="filtered.length === 0" class="px-3 py-6 text-center text-xs text-white/30">
        {{ search ? 'Nessun risultato' : 'Nessun template' }}
      </div>
    </div>

    <!-- Bottom actions -->
    <div class="shrink-0 border-t border-white/10 p-2 space-y-1">
      <div class="grid grid-cols-2 gap-1">
        <button class="btn-surface text-xs justify-center py-1.5" @click="emit('import')">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Import
        </button>
        <button class="btn-surface text-xs justify-center py-1.5" :disabled="!selectedName" @click="emit('export')">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 8l5-5 5 5M12 3v12"/>
          </svg>
          Export
        </button>
      </div>
      <div class="grid grid-cols-2 gap-1">
        <button class="btn-ghost text-xs justify-center py-1.5" @click="emit('settings')">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          Impost.
        </button>
        <button class="btn-ghost text-xs justify-center py-1.5" @click="emit('help')">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path stroke-linecap="round" stroke-linejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/>
          </svg>
          Aiuto
        </button>
      </div>
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div v-if="ctx.visible" class="fixed inset-0 z-40" @click="ctx.visible = false" @contextmenu.prevent="ctx.visible = false"/>
      <div v-if="ctx.visible" class="fixed z-50 glass-strong rounded-xl shadow-glass overflow-hidden py-1 w-44 text-sm animate-fade-in"
        :style="{ top: ctx.y + 'px', left: ctx.x + 'px' }"
      >
        <button class="ctx-row w-full text-left px-4 py-2 transition" @click="ctxRename">Rinomina</button>
        <button class="ctx-row w-full text-left px-4 py-2 transition" @click="ctxDuplicate">Duplica</button>
        <div class="h-px bg-white/10 mx-2 my-1"></div>
        <button class="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 transition" @click="ctxDelete">Elimina</button>
      </div>
    </Teleport>

    <!-- New template dialog -->
    <Teleport to="body">
      <div v-if="newDialog.visible" class="modal-overlay" @click.self="newDialog.visible = false">
        <div ref="newPanel" tabindex="-1" @keydown.esc="newDialog.visible = false"
          class="glass-strong rounded-2xl shadow-glass p-6 w-80 animate-fade-in">
          <h3 class="text-sm font-semibold mb-1">Nuovo template</h3>
          <p class="text-xs text-white/40 mb-3">Scegli un nome per il nuovo template</p>
          <input v-model="newDialog.value" class="input-base" placeholder="es. Progetto Web"
            @keydown.enter="confirmNew" @keydown.esc="newDialog.visible = false" ref="newInput"/>
          <p v-if="newError" class="text-xs text-red-400 mt-2">{{ newError }}</p>
          <div class="flex gap-2 justify-end mt-4">
            <button class="btn-ghost" @click="newDialog.visible = false">Annulla</button>
            <button class="btn-accent" :disabled="!newDialog.value.trim() || !!newError" @click="confirmNew">Crea</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Rename dialog -->
    <Teleport to="body">
      <div v-if="renameDialog.visible" class="modal-overlay" @click.self="renameDialog.visible = false">
        <div ref="renamePanel" tabindex="-1" @keydown.esc="renameDialog.visible = false"
          class="glass-strong rounded-2xl shadow-glass p-6 w-80 animate-fade-in">
          <h3 class="text-sm font-semibold mb-3">Rinomina template</h3>
          <input v-model="renameDialog.value" class="input-base" @keydown.enter="confirmRename" @keydown.esc="renameDialog.visible = false" ref="renameInput"/>
          <p v-if="renameError" class="text-xs text-red-400 mt-2">{{ renameError }}</p>
          <div class="flex gap-2 justify-end mt-4">
            <button class="btn-ghost" @click="renameDialog.visible = false">Annulla</button>
            <button class="btn-accent" :disabled="!renameDialog.value.trim() || !!renameError" @click="confirmRename">Salva</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete confirmation dialog -->
    <Teleport to="body">
      <div v-if="deleteDialog.visible" class="modal-overlay" @click.self="deleteDialog.visible = false">
        <div ref="deletePanel" tabindex="-1" @keydown.esc="deleteDialog.visible = false"
          class="glass-strong rounded-2xl shadow-glass p-6 w-80 animate-fade-in">
          <h3 class="text-sm font-semibold mb-2">Elimina template</h3>
          <p class="text-xs text-white/60 mb-4">Eliminare <span class="text-white font-medium">{{ deleteDialog.name }}</span>? L'azione non può essere annullata.</p>
          <div class="flex gap-2 justify-end">
            <button class="btn-ghost" @click="deleteDialog.visible = false">Annulla</button>
            <button class="btn-danger" @click="confirmDelete">Elimina</button>
          </div>
        </div>
      </div>
    </Teleport>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { useTemplatesStore } from '@/stores/templates'
import { templateNameKey } from '@/utils/sanitize'
import { storeToRefs } from 'pinia'

const emit = defineEmits<{
  (e: 'import'): void
  (e: 'export'): void
  (e: 'settings'): void
  (e: 'help'): void
  (e: 'new-template', name: string): void
  (e: 'select-template', name: string): void
  (e: 'duplicate-template', name: string): void
  (e: 'notify', msg: string, icon: string): void
}>()

const tplStore = useTemplatesStore()
const { list, selectedName } = storeToRefs(tplStore)

const search = ref('')
const filtered = computed(() =>
  list.value.filter(t => t.template_name.toLowerCase().includes(search.value.toLowerCase()))
)

function select(name: string) {
  emit('select-template', name)
}

// ─── New template dialog ─────────────────────────────────────────────────────

const newDialog = ref({ visible: false, value: '' })
const newInput = ref<HTMLInputElement | null>(null)
const newPanel = ref<HTMLElement | null>(null)
useFocusTrap(newPanel, computed(() => newDialog.value.visible), () => newInput.value)

const newError = computed(() => {
  const name = newDialog.value.value.trim()
  if (!name) return ''                       // empty → button stays disabled, no message
  const key = templateNameKey(name)
  return list.value.some(t => templateNameKey(t.template_name) === key)
    ? 'Esiste già un template con questo nome' : ''
})

function openNewDialog() {
  newDialog.value = { visible: true, value: '' }
  nextTick(() => newInput.value?.focus())
}

function confirmNew() {
  if (newError.value) return
  const name = newDialog.value.value.trim()
  if (!name) return
  newDialog.value.visible = false
  emit('new-template', name)
}

// ─── Context menu ─────────────────────────────────────────────────────────────

const ctx = ref({ visible: false, x: 0, y: 0, name: '' })
const renameDialog = ref({ visible: false, value: '', oldName: '' })
const deleteDialog = ref({ visible: false, name: '' })
const deletePanel = ref<HTMLElement | null>(null)
useFocusTrap(deletePanel, computed(() => deleteDialog.value.visible))
const renameInput = ref<HTMLInputElement | null>(null)
const renamePanel = ref<HTMLElement | null>(null)
useFocusTrap(renamePanel, computed(() => renameDialog.value.visible), () => renameInput.value)

function openCtx(e: MouseEvent, name: string) {
  ctx.value = { visible: true, x: e.clientX, y: e.clientY, name }
}

const renameError = computed(() => {
  const name = renameDialog.value.value.trim()
  if (!name) return ''
  const { oldName } = renameDialog.value
  const key = templateNameKey(name)
  // Exclude the template being renamed so case-only self-renames stay allowed.
  return list.value.some(t => t.template_name !== oldName && templateNameKey(t.template_name) === key)
    ? 'Esiste già un template con questo nome' : ''
})

function ctxRename() {
  renameDialog.value = { visible: true, value: ctx.value.name, oldName: ctx.value.name }
  ctx.value.visible = false
  nextTick(() => renameInput.value?.select())
}

async function confirmRename() {
  if (renameError.value) return
  const { oldName, value } = renameDialog.value
  if (!value.trim() || value === oldName) { renameDialog.value.visible = false; return }
  try {
    await tplStore.rename(oldName, value.trim())
    emit('notify', `Template rinominato in "${value.trim()}"`, '✅')
  } catch (e: any) {
    emit('notify', e?.message ?? String(e), '❌')
  }
  renameDialog.value.visible = false
}

function ctxDuplicate() {
  const name = ctx.value.name
  ctx.value.visible = false
  emit('duplicate-template', name)
}

function ctxDelete() {
  deleteDialog.value = { visible: true, name: ctx.value.name }
  ctx.value.visible = false
}

async function confirmDelete() {
  const name = deleteDialog.value.name
  deleteDialog.value.visible = false
  try {
    await tplStore.remove(name)
    emit('notify', `Template "${name}" eliminato`, '🗑️')
  } catch (e: any) {
    emit('notify', e?.message ?? String(e), '❌')
  }
}
</script>

<style scoped>
.ctx-row:hover { background: color-mix(in srgb, var(--accent) 22%, transparent); }
</style>
