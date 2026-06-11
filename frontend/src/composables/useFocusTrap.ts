import { watch, onUnmounted, type Ref } from 'vue'

// Stack condiviso da TUTTE le istanze (il modulo è un singleton). Solo il trap in cima
// allo stack gestisce i tasti: così, con dialog annidati (es. confirmClose sopra
// Impostazioni), il trap interno ha la precedenza e quello esterno non strappa il focus.
const trapStack: object[] = []

/**
 * Confina la navigazione da tastiera dentro `container` mentre `active` è true.
 *
 * Implementazione robusta al timing del Teleport:
 * - Il listener è agganciato a `document` in fase di CAPTURE, così precede gli
 *   handler @keydown in bubbling (es. quello dell'albero) e non dipende dal fatto
 *   che il pannello teleportato sia già montato al momento dell'attach (gli
 *   elementi focusabili si leggono a event-time).
 * - All'attivazione il focus entra nel pannello dopo il paint (requestAnimationFrame).
 * - Se il focus sfugge fuori dal pannello, viene recuperato e il tasto bloccato,
 *   così nemmeno la prima freccia raggiunge l'albero sottostante.
 *
 * Anello di focus visibile: WKWebView (WebKit/Safari, usato da Wails su macOS) NON
 * applica `:focus-visible` agli elementi messi a fuoco programmaticamente via
 * `.focus()`. Per questo il trap applica una classe esplicita `kbd-focus`
 * all'elemento che mette a fuoco (e la toglie dal precedente). Un click del mouse
 * (`pointerdown`) la rimuove, così l'anello compare solo durante la navigazione da
 * tastiera, mai col mouse.
 *
 * Al termine ripristina il focus all'elemento che lo aveva in precedenza.
 */
export function useFocusTrap(
  container: Ref<HTMLElement | null>,
  active: Ref<boolean>,
  // Elemento da mettere a fuoco all'apertura (es. l'input di un dialog). Se assente
  // si usa il primo focusabile. Getter per evitare problemi di varianza dei Ref.
  initialFocus?: () => HTMLElement | null | undefined,
) {
  let prev: HTMLElement | null = null
  let marked: HTMLElement | null = null
  // Token identità di questa istanza nello stack dei trap.
  const self = {}
  // Rende activate/deactivate idempotenti (immediate watch + onUnmounted possono
  // chiamare deactivate a vuoto).
  let activated = false

  const focusable = () =>
    Array.from(
      container.value?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter((el) => !el.hasAttribute('disabled'))

  function clearMark() {
    marked?.classList.remove('kbd-focus')
    marked = null
  }

  function focusWithMark(el: HTMLElement) {
    clearMark()
    el.focus()
    // Campi di testo/select hanno il ring nativo :focus (funziona anche col focus
    // programmatico): niente kbd-focus, così si evita il doppio anello. Checkbox e radio
    // invece in WKWebView NON ricevono ring nativo col .focus() programmatico, quindi
    // devono ottenere la classe kbd-focus per restare visibili durante la navigazione.
    if (!el.matches('input:not([type=checkbox]):not([type=radio]), textarea, select')) {
      el.classList.add('kbd-focus')
      marked = el
    }
  }

  function onKeydown(e: KeyboardEvent) {
    if (!active.value || !container.value) return
    // Solo il trap in cima allo stack gestisce i tasti: il trap esterno non interferisce
    // (né strappa il focus) finché un trap annidato è aperto sopra di esso.
    if (trapStack[trapStack.length - 1] !== self) return
    const cur = document.activeElement as HTMLElement
    // Focus sfuggito fuori dal modal (es. sull'albero): riportalo dentro e blocca il tasto.
    if (!container.value.contains(cur)) {
      e.preventDefault()
      const first = focusable()[0]
      if (first) focusWithMark(first)
      return
    }
    if (e.key !== 'Tab') return
    const els = focusable()
    if (!els.length) return
    // Controllo totale del Tab dentro il modal: niente traversal nativo del browser.
    e.preventDefault()
    const idx = els.indexOf(cur) // -1 se il focus è sul pannello stesso o su un punto neutro
    if (idx === -1) {
      focusWithMark(els[e.shiftKey ? els.length - 1 : 0])
      return
    }
    focusWithMark(els[(idx + (e.shiftKey ? -1 : 1) + els.length) % els.length])
  }

  // Interazione col mouse: rimuove l'anello da tastiera.
  function onPointerdown() {
    clearMark()
  }

  function activate() {
    if (activated) return
    activated = true
    prev = document.activeElement as HTMLElement
    trapStack.push(self)
    document.addEventListener('keydown', onKeydown, true)
    document.addEventListener('pointerdown', onPointerdown, true)
    requestAnimationFrame(() => {
      const target = initialFocus?.() ?? focusable()[0]
      if (target) focusWithMark(target)
    })
  }

  function deactivate() {
    if (!activated) return
    activated = false
    document.removeEventListener('keydown', onKeydown, true)
    document.removeEventListener('pointerdown', onPointerdown, true)
    // Rimozione robusta dallo stack (non si assume di essere in cima).
    const i = trapStack.indexOf(self)
    if (i >= 0) trapStack.splice(i, 1)
    clearMark()
    prev?.focus()
    prev = null
  }

  // immediate: consente di passare un `active` sempre-true (dialog montati via v-if, che
  // si attivano subito al mount). Per i flag inizialmente false esegue deactivate() a
  // vuoto → no-op grazie all'idempotenza.
  watch(active, (on) => (on ? activate() : deactivate()), { immediate: true })
  // Cleanup affidabile quando il componente viene smontato (v-if) mentre il trap è
  // ancora attivo: il watch non scatterebbe e i listener resterebbero orfani.
  onUnmounted(deactivate)
}
