<script setup>
// Interruptor de dos estados.
//
// El texto que se le pasa dentro es su rotulo. Antes el componente no tenia
// slot y lo descartaba, asi que los interruptores de Locales ("Excluir
// domingos de la hora punta", "Opera fuera del horario comercial") salian sin
// decir que hacian, y un lector de pantalla los anunciaba como un boton sin
// nombre. Envolverlo en un label hace que pulsar el texto tambien lo cambie.
defineProps({ modelValue: { type: Boolean, required: true } });
defineEmits(["update:modelValue"]);
</script>

<template>
  <label class="inline-flex cursor-pointer items-center gap-3">
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :class="[
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        modelValue ? 'bg-blue-600' : 'bg-slate-300 dark:bg-navy-700',
      ]"
      @click="$emit('update:modelValue', !modelValue)"
    >
      <span
        :class="[
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          modelValue ? 'translate-x-5' : 'translate-x-0.5',
        ]"
      />
    </button>
    <span
      v-if="$slots.default"
      class="text-sm text-slate-700 dark:text-slate-300"
    >
      <slot />
    </span>
  </label>
</template>
