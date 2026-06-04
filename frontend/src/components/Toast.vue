<template>
  <Teleport to="body">
    <Transition
      enter-active-class="animate-toast-in"
      leave-active-class="animate-toast-out"
    >
      <div
        v-if="visible"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 glass-strong rounded-2xl px-5 py-3 shadow-glass pointer-events-none"
      >
        <span class="text-lg leading-none">{{ icon }}</span>
        <span class="text-sm font-medium text-white/90">{{ message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const visible = ref(false)
const message = ref('')
const icon = ref('✅')
let timer: ReturnType<typeof setTimeout> | null = null

function show(msg: string, ico = '✅', duration = 2800) {
  if (timer) clearTimeout(timer)
  message.value = msg
  icon.value = ico
  visible.value = true
  timer = setTimeout(() => { visible.value = false }, duration)
}

defineExpose({ show })
</script>
