<template>
  <div class="modal-overlay" @click.self="attemptClose">
    <div ref="settingsPanel" tabindex="-1" class="glass-strong rounded-2xl shadow-glass w-[400px] animate-fade-in overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
        <h2 class="text-base font-semibold">Impostazioni</h2>
        <div class="flex items-center gap-1.5">
          <!-- Theme toggle: single icon button -->
          <button
            class="btn-surface !p-1.5 rounded-lg"
            :title="(local.theme || 'dark') === 'dark' ? 'Passa a modalità chiara' : 'Passa a modalità scura'"
            @click="local.theme = (local.theme || 'dark') === 'dark' ? 'light' : 'dark'"
          >
            <!-- Moon = currently dark -->
            <svg v-if="(local.theme || 'dark') === 'dark'" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
            </svg>
            <!-- Sun = currently light -->
            <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd"/>
            </svg>
          </button>
          <button class="btn-ghost !p-1.5" @click="attemptClose">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="px-6 py-4 space-y-5">
        <!-- App tint -->
        <div>
          <label class="settings-label">Tinta dell'app</label>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <button
              v-for="p in ACCENT_PRESETS"
              :key="p.hex"
              :title="p.name"
              class="w-7 h-7 rounded-full transition-all duration-150"
              :style="{ background: p.hex, boxShadow: local.accent === p.hex ? `0 0 0 2px ${p.hex}` : 'none' }"
              :class="local.accent === p.hex ? 'scale-110' : 'opacity-70 hover:opacity-100'"
              @click="local.accent = p.hex"
            />
            <div class="w-px h-6 bg-white/10 mx-0.5"/>
            <!-- custom tints -->
            <label
              v-for="(c, i) in (local.accent_custom || [])"
              :key="'c' + i"
              :title="c"
              class="relative w-7 h-7 rounded-full cursor-pointer transition-all duration-150"
              :style="{ background: c, boxShadow: local.accent === c ? `0 0 0 2px ${c}` : 'none' }"
              :class="local.accent === c ? 'scale-110' : 'opacity-70 hover:opacity-100'"
              @click="local.accent = c"
            >
              <input type="color" :value="c" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                @input="updateCustom(i, ($event.target as HTMLInputElement).value)"/>
            </label>
            <!-- add custom (max 4) -->
            <button v-if="(local.accent_custom?.length ?? 0) < 4"
              class="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white transition"
              style="background: rgba(255,255,255,0.06); border: 1px dashed rgba(255,255,255,0.25)"
              title="Aggiungi colore casuale" @click="addCustom">+</button>
          </div>
          <p class="text-[11px] text-white/30 mt-1.5">Usata per selezioni, hover dei menu e dettagli dell'interfaccia. Max 4 colori personalizzati.</p>
        </div>

        <!-- Folder colors -->
        <div>
          <label class="settings-label">Colore cartelle</label>
          <div class="flex rounded-lg overflow-hidden border border-white/10 mt-2 mb-3">
            <button v-for="m in colorModes" :key="m.value"
              class="flex-1 py-1.5 text-xs transition-colors"
              :class="local.color_mode === m.value ? 'seg-active font-medium' : 'text-white/40 hover:text-white/70'"
              @click="local.color_mode = m.value">{{ m.label }}</button>
          </div>

          <!-- Palette mode -->
          <div v-if="local.color_mode === 'palette'" class="flex items-center gap-2">
            <label v-for="(c, i) in local.palette" :key="i"
              class="relative w-8 h-8 rounded-lg cursor-pointer ring-1 ring-white/15" :style="{ background: c }">
              <input type="color" v-model="local.palette![i]" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"/>
            </label>
            <button class="btn-surface !px-2.5 ml-1" title="Colori casuali" @click="randomizePalette">🎲</button>
          </div>

          <!-- Depth-gradient mode -->
          <div v-else-if="local.color_mode === 'depth'" class="space-y-2">
            <div class="flex items-center gap-2">
              <span class="text-xs text-white/50">Colore primario</span>
              <label class="relative w-8 h-8 rounded-lg cursor-pointer ring-1 ring-white/15" :style="{ background: local.depth_primary }">
                <input type="color" v-model="local.depth_primary" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"/>
              </label>
              <button class="btn-surface !px-2.5" title="Colore casuale" @click="local.depth_primary = randomHex()">🎲</button>
            </div>
            <div class="flex items-center gap-1 mt-1">
              <span v-for="(p, i) in depthPreview" :key="i" class="w-5 h-5 flex items-center justify-center">
                <svg class="w-4 h-4" viewBox="0 0 20 20" :fill="p.fill" :stroke="p.stroke || 'none'" :stroke-width="p.stroke ? 1.5 : 0">
                  <path d="M2 6a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
                </svg>
              </span>
              <span class="text-[10px] text-white/30 ml-1">L0 → L5+</span>
            </div>
          </div>

          <!-- Single-color mode -->
          <div v-else class="flex items-center gap-2">
            <span class="text-xs text-white/50">Colore</span>
            <label class="relative w-8 h-8 rounded-lg cursor-pointer ring-1 ring-white/15" :style="{ background: local.single_color }">
              <input type="color" v-model="local.single_color" class="opacity-0 absolute inset-0 w-full h-full cursor-pointer"/>
            </label>
          </div>
        </div>

        <!-- Font size -->
        <div>
          <label class="settings-label">Dimensione testo: {{ local.font_size }}px</label>
          <input type="range" min="10" max="16" :value="local.font_size" @input="local.font_size = Number(($event.target as HTMLInputElement).value)" class="w-full mt-2 accent-[var(--accent)]"/>
        </div>

        <!-- Default output path -->
        <div>
          <label class="settings-label">Percorso output predefinito</label>
          <div class="flex gap-1 mt-1.5">
            <input v-model="local.default_output" class="input-base py-1.5 text-sm flex-1" placeholder="Lascia vuoto per chiedere ogni volta"/>
            <button class="btn-surface !px-2.5" @click="browse">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Scan settings -->
        <div class="space-y-3">
          <label class="settings-label">Scansione cartelle</label>
          <div class="flex items-center justify-between">
            <span class="text-sm text-white/60">Includi cartelle nascoste</span>
            <button
              class="w-10 h-5 rounded-full transition-colors duration-200 relative"
              :class="local.scan_hidden ? 'bg-accent' : 'bg-white/20'"
              @click="local.scan_hidden = !local.scan_hidden"
            >
              <span class="absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                :class="local.scan_hidden ? 'translate-x-[22px]' : 'translate-x-0.5'"/>
            </button>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm text-white/60">Profondità massima</span>
            <div class="flex items-center gap-2">
              <button class="btn-ghost !px-2 !py-1" @click="local.scan_max_depth = Math.max(1, local.scan_max_depth - 1)">−</button>
              <span class="text-sm w-6 text-center">{{ local.scan_max_depth }}</span>
              <button class="btn-ghost !px-2 !py-1" @click="local.scan_max_depth = Math.min(50, local.scan_max_depth + 1)">+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end gap-2 px-6 py-4 border-t border-white/10">
        <button class="btn-ghost" @click="attemptClose">Annulla</button>
        <button class="btn-accent" @click="save">Salva</button>
      </div>
    </div>

    <!-- Unsaved-changes guard -->
    <div v-if="confirmClose" class="modal-overlay" @click.self="confirmClose = false">
      <div ref="confirmPanel" tabindex="-1" class="glass-strong rounded-2xl shadow-glass p-6 w-80 animate-fade-in">
        <h3 class="text-sm font-semibold mb-2">Impostazioni non salvate</h3>
        <p class="text-xs text-white/60 mb-4">Hai modifiche non salvate. Vuoi salvarle?</p>
        <div class="flex flex-col gap-2">
          <button class="btn-accent justify-center" @click="save">Salva</button>
          <button class="btn-danger justify-center" @click="discardAndClose">Scarta modifiche</button>
          <button class="btn-ghost justify-center" @click="confirmClose = false">Continua a modificare</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, watch, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'
import { ACCENT_PRESETS, type ColorMode, type Settings } from '@/types'
import { depthShades } from '@/composables/useTree'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { OpenFolderDialog } from '../../wailsjs/go/main/App'

const emit = defineEmits<{ (e: 'close'): void }>()

// Focus trap esterno (pannello Impostazioni): attivo per tutta la vita del componente
// (montato via v-if in App.vue), cleanup garantito da onUnmounted nel composable.
const settingsPanel = ref<HTMLElement | null>(null)
const settingsActive = ref(true)
useFocusTrap(settingsPanel, settingsActive)

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const clone = (s: Settings): Settings => JSON.parse(JSON.stringify(s))

// Snapshot to revert to if the user closes without saving (point 2).
const original = clone(settings.value)
const local = reactive<Settings>(clone({
  ...settings.value,
  color_mode: settings.value.color_mode ?? 'depth',
  palette: settings.value.palette ?? ['#4F8EF7', '#A78BFA', '#34D399', '#FB923C'],
  depth_primary: settings.value.depth_primary ?? '#2563EB',
  single_color: settings.value.single_color ?? '#4F8EF7',
  accent_custom: settings.value.accent_custom ?? [],
}))

// Live preview: mirror every edit onto the live store so the whole app updates.
watch(local, () => { Object.assign(settings.value, clone(local)) }, { deep: true })

const dirty = computed(() => JSON.stringify(local) !== JSON.stringify(original))

const colorModes: { value: ColorMode; label: string }[] = [
  { value: 'depth', label: 'Profondità' },
  { value: 'palette', label: 'Palette' },
  { value: 'single', label: 'Singolo' },
]

function randomHex() { return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0') }
function randomizePalette() { local.palette = Array.from({ length: 4 }, randomHex) }

function updateCustom(i: number, val: string) {
  if (!local.accent_custom) local.accent_custom = []
  local.accent_custom[i] = val
  local.accent = val
}
function addCustom() {
  if (!local.accent_custom) local.accent_custom = []
  if (local.accent_custom.length >= 4) return
  const c = randomHex()
  local.accent_custom.push(c)
  local.accent = c
}

const depthPreview = computed(() => {
  const shades = depthShades(local.depth_primary || '#2563EB')
  return [0, 1, 2, 3, 4, 5].map(d =>
    d <= 2 ? { fill: shades[d], stroke: '' } : { fill: '#FFFFFF', stroke: shades[Math.min(d - 3, 2)] }
  )
})

async function browse() {
  const path = await OpenFolderDialog()
  if (path) local.default_output = path
}

// ─── Save / close with unsaved-changes guard ─────────────────────────────────
const confirmClose = ref(false)

// Focus trap interno (conferma chiusura): annidato sopra Impostazioni. Lo stack nel
// composable garantisce che finché è aperto abbia la precedenza e che il trap esterno
// non strappi il focus.
const confirmPanel = ref<HTMLElement | null>(null)
useFocusTrap(confirmPanel, computed(() => confirmClose.value))

async function save() {
  await settingsStore.save()   // settings.value is already live-synced to local
  emit('close')
}

function attemptClose() {
  if (dirty.value) confirmClose.value = true
  else emit('close')
}

function discardAndClose() {
  Object.assign(settings.value, clone(original))
  settingsStore.applyTheme()
  confirmClose.value = false
  emit('close')
}
</script>

<style scoped>
.settings-label { @apply block text-[11px] font-semibold uppercase tracking-widest text-white/40; }
</style>
