<script setup>
import { ref } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { Check, Copy, KeyRound, LoaderCircle, TriangleAlert } from "lucide-vue-next";
import UiModal from "./ui/UiModal.vue";
import UiButton from "./ui/UiButton.vue";
import { issueMeterCredential } from "@/services/energy.service";
import { useLangStore } from "@/stores/lang";

// Clave con la que el medidor envia sus lecturas por su cuenta. Es lo que
// convierte el alta de un medidor en una ingesta de verdad: hasta tenerla, el
// aparato no tiene forma de identificarse ante la API.
const props = defineProps({
  meterId: { type: String, required: true },
  meterName: { type: String, default: "" },
  // Fecha de la credencial vigente, si el medidor ya tiene una. Emitir otra la
  // invalida, y conviene avisarlo antes y no despues.
  issuedAt: { type: String, default: null },
});

defineEmits(["close"]);

const { t } = useLangStore();

const clave = ref("");
const copiada = ref(false);
const fallóCopiar = ref(false);
const error = ref("");

const emitir = useMutation({
  mutationFn: () => issueMeterCredential(props.meterId),
  onSuccess: (credencial) => {
    error.value = "";
    clave.value = credencial.apiKey;
  },
  onError: (e) => {
    error.value =
      e?.response?.data?.message ||
      t("No se pudo emitir la clave.", "Couldn't issue the key.");
  },
});

async function copiar() {
  fallóCopiar.value = false;
  try {
    await window.navigator.clipboard.writeText(clave.value);
    copiada.value = true;
    setTimeout(() => (copiada.value = false), 2000);
  } catch {
    // El portapapeles no esta disponible en conexiones sin cifrar ni cuando el
    // navegador lo deniega. La clave sigue a la vista y se puede seleccionar.
    fallóCopiar.value = true;
  }
}
</script>

<template>
  <UiModal
    :title="t('Clave del medidor', 'Meter key')"
    max-width="max-w-lg"
    @close="$emit('close')"
  >
    <div class="space-y-4">
      <p class="text-sm text-slate-600 dark:text-slate-300">
        {{ t(
          "Con esta clave el medidor envía sus lecturas por su cuenta, sin que nadie las registre a mano. Se carga una vez en el aparato.",
          "With this key the meter sends its readings on its own, with nobody typing them in. You load it into the device once."
        ) }}
      </p>
      <p
        v-if="meterName"
        class="text-sm font-semibold text-slate-900 dark:text-white"
      >
        {{ meterName }}
      </p>

      <!-- Antes de emitir -->
      <template v-if="!clave">
        <div
          v-if="issuedAt"
          class="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        >
          <TriangleAlert class="h-4 w-4 shrink-0" />
          <span>
            {{ t(
              "Este medidor ya tiene una clave. Emitir otra deja la anterior sin valor y el aparato dejará de enviar hasta que cargues la nueva.",
              "This meter already has a key. Issuing another voids the old one, and the device will stop sending until you load the new one."
            ) }}
          </span>
        </div>
        <div class="flex justify-end gap-2">
          <UiButton
            variant="outline"
            @click="$emit('close')"
          >
            {{ t("Cancelar", "Cancel") }}
          </UiButton>
          <UiButton
            :disabled="emitir.isPending.value"
            @click="emitir.mutate()"
          >
            <LoaderCircle
              v-if="emitir.isPending.value"
              class="h-4 w-4 animate-spin"
            />
            <KeyRound
              v-else
              class="h-4 w-4"
            />
            {{ issuedAt ? t("Emitir una nueva", "Issue a new one") : t("Emitir clave", "Issue key") }}
          </UiButton>
        </div>
      </template>

      <!-- Despues de emitir: la clave solo se ve aqui -->
      <template v-else>
        <div class="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <TriangleAlert class="h-4 w-4 shrink-0" />
          <span>
            {{ t(
              "Cópiala ahora: no se vuelve a mostrar. El sistema solo guarda su huella, así que si la pierdes hay que emitir otra.",
              "Copy it now: it is not shown again. The system only keeps its fingerprint, so if you lose it you have to issue another."
            ) }}
          </span>
        </div>

        <div class="flex items-center gap-2">
          <code
            class="flex-1 select-all break-all rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 dark:border-navy-700 dark:bg-navy-950 dark:text-slate-100"
          >{{ clave }}</code>
          <UiButton
            variant="outline"
            @click="copiar"
          >
            <Check
              v-if="copiada"
              class="h-4 w-4 text-emerald-600"
            />
            <Copy
              v-else
              class="h-4 w-4"
            />
            {{ copiada ? t("Copiada", "Copied") : t("Copiar", "Copy") }}
          </UiButton>
        </div>
        <p
          v-if="fallóCopiar"
          class="text-xs text-amber-600 dark:text-amber-400"
        >
          {{ t(
            "El navegador no dejó copiar. Selecciona la clave y cópiala a mano.",
            "The browser wouldn't copy. Select the key and copy it by hand."
          ) }}
        </p>

        <div class="flex justify-end">
          <UiButton @click="$emit('close')">
            {{ t("Listo", "Done") }}
          </UiButton>
        </div>
      </template>

      <p
        v-if="error"
        class="text-xs text-rose-600 dark:text-rose-400"
      >
        {{ error }}
      </p>
    </div>
  </UiModal>
</template>
