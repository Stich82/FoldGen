<template>
  <div class="shrink-0 border-t border-white/[0.07] px-4 py-3 flex items-end gap-3">
    <!-- Project name -->
    <div class="flex-1 min-w-0">
      <label class="block text-[10px] text-white/30 font-medium mb-1 uppercase tracking-wider">Nome progetto</label>
      <input v-model="projectName" class="input-base !h-9 text-sm" placeholder="MyProject"/>
    </div>

    <!-- Output path -->
    <div class="flex-[2] min-w-0">
      <label class="block text-[10px] text-white/30 font-medium mb-1 uppercase tracking-wider">Percorso di output</label>
      <div class="flex gap-1">
        <input v-model="outputPath" class="input-base !h-9 text-sm flex-1" placeholder="C:\Users\..."/>
        <button class="btn-surface !h-9 !px-2.5" title="Sfoglia" @click="browse">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="shrink-0 flex gap-2">
      <button class="btn-surface !h-9" :disabled="!canGenerate" @click="emit('create-folders', projectName, outputPath)">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
        </svg>
        Crea cartelle
      </button>
      <button class="btn-ghost !h-9" :disabled="!canGenerate" title="Script Windows (.bat)" @click="emit('generate-bat', projectName, outputPath)">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        Genera .bat
      </button>
      <button class="btn-ghost !h-9" :disabled="!canGenerate" title="Script macOS/Linux (.sh)" @click="emit('generate-sh', projectName, outputPath)">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9l-6-6zM9 3v6h6"/>
        </svg>
        Genera .sh
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { OpenFolderDialog } from '../../wailsjs/go/main/App'
import { useSettingsStore } from '@/stores/settings'
import { storeToRefs } from 'pinia'

const emit = defineEmits<{
  (e: 'create-folders', name: string, path: string): void
  (e: 'generate-bat', name: string, path: string): void
  (e: 'generate-sh', name: string, path: string): void
}>()

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const projectName = ref('MyProject')
const outputPath = ref(settings.value.default_output || '')

watch(() => settings.value.default_output, (val) => {
  if (val && !outputPath.value) outputPath.value = val
})

const canGenerate = computed(() => projectName.value.trim().length > 0 && outputPath.value.trim().length > 0)

async function browse() {
  try {
    const path = await OpenFolderDialog()
    if (path) outputPath.value = path
  } catch {}
}
</script>
