<script setup>
import { ref, computed } from "vue";
import { useMutation } from "@tanstack/vue-query";
import { CreditCard, FlaskConical, LoaderCircle } from "lucide-vue-next";
import UiModal from "./ui/UiModal.vue";
import UiField from "./ui/UiField.vue";
import UiButton from "./ui/UiButton.vue";
import { purchasePlan } from "@/services/subscriptions.service";
import { soles } from "@/lib/format";
import { useLangStore } from "@/stores/lang";

// Pago de un plan con el procesador simulado del backend. No hay pasarela: la
// tarjeta se valida y se "cobra" en el servidor, que es tambien quien decide el
// importe y activa el plan solo si el cobro se aprueba.
const props = defineProps({
  userId: { type: String, required: true },
  plan: { type: Object, required: true },
});
const emit = defineEmits(["close", "paid"]);

const { t } = useLangStore();

const numero = ref("");
const vencimiento = ref("");
const cvc = ref("");
const error = ref("");

// Agrupa de cuatro en cuatro mientras se escribe, como en una tarjeta.
function onNumero(e) {
  const digitos = e.target.value.replace(/\D/g, "").slice(0, 19);
  numero.value = digitos.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function onVencimiento(e) {
  const d = e.target.value.replace(/\D/g, "").slice(0, 4);
  vencimiento.value = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

const mesAnio = computed(() => {
  const [mm, aa] = vencimiento.value.split("/");
  return { mes: Number(mm), anio: aa?.length === 2 ? 2000 + Number(aa) : NaN };
});

const MOTIVOS = {
  card_declined: ["La tarjeta fue rechazada.", "The card was declined."],
  insufficient_funds: ["Fondos insuficientes.", "Insufficient funds."],
};

const pagar = useMutation({
  mutationFn: () => purchasePlan({
    userId: props.userId,
    planId: props.plan.id,
    card: {
      number: numero.value.replace(/\s/g, ""),
      expMonth: mesAnio.value.mes,
      expYear: mesAnio.value.anio,
      cvc: cvc.value,
    },
  }),
  onSuccess: () => emit("paid", props.plan),
  onError: (e) => {
    const data = e?.response?.data;
    if (e?.response?.status === 402) {
      const m = MOTIVOS[data?.message];
      error.value = m ? t(...m) : t("El pago fue rechazado.", "The payment was declined.");
    } else {
      error.value = data?.message || t("No se pudo procesar el pago.", "Couldn't process the payment.");
    }
  },
});

function onSubmit() {
  const digitos = numero.value.replace(/\s/g, "");
  if (digitos.length < 13) {
    error.value = t("Escribe el número completo de la tarjeta.", "Enter the full card number.");
    return;
  }
  const { mes, anio } = mesAnio.value;
  if (!(mes >= 1 && mes <= 12) || isNaN(anio)) {
    error.value = t("El vencimiento va como MM/AA.", "Expiry must be MM/YY.");
    return;
  }
  if (!/^\d{3,4}$/.test(cvc.value)) {
    error.value = t("El CVC tiene 3 o 4 dígitos.", "The CVC has 3 or 4 digits.");
    return;
  }
  error.value = "";
  pagar.mutate();
}
</script>

<template>
  <UiModal
    :title="`${t('Contratar', 'Subscribe to')} ${plan.name}`"
    max-width="max-w-md"
    @close="emit('close')"
  >
    <form
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <!-- Se dice claro que es una simulacion: sin esto, alguien podria
           escribir aqui su tarjeta real creyendo que se le cobra. -->
      <div class="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <FlaskConical class="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p class="font-semibold">
            {{ t("Pago simulado: no se cobra dinero real.", "Simulated payment: no real money is charged.") }}
          </p>
          <p class="mt-1">
            {{ t("No uses una tarjeta real. Para probar:", "Don't use a real card. To test:") }}
            <span class="font-mono">4242 4242 4242 4242</span> {{ t("se aprueba", "is approved") }},
            <span class="font-mono">4000 0000 0000 0002</span> {{ t("se rechaza", "is declined") }}.
            {{ t("Cualquier vencimiento futuro y CVC.", "Any future expiry and CVC.") }}
          </p>
        </div>
      </div>

      <div class="flex items-baseline justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-navy-800">
        <span class="text-sm text-slate-600 dark:text-slate-300">{{ t("Total", "Total") }}</span>
        <span class="font-display text-xl font-extrabold text-slate-900 dark:text-white">
          {{ soles(plan.price) }} <span class="text-sm font-normal text-slate-400">/ {{ plan.period }}</span>
        </span>
      </div>

      <UiField :label="t('Número de tarjeta', 'Card number')">
        <div class="relative">
          <CreditCard class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            :value="numero"
            inputmode="numeric"
            autocomplete="off"
            placeholder="4242 4242 4242 4242"
            class="input-field !pl-9 font-mono"
            @input="onNumero"
          >
        </div>
      </UiField>
      <div class="grid grid-cols-2 gap-3">
        <UiField :label="t('Vencimiento', 'Expiry')">
          <input
            :value="vencimiento"
            inputmode="numeric"
            autocomplete="off"
            placeholder="MM/AA"
            class="input-field font-mono"
            @input="onVencimiento"
          >
        </UiField>
        <UiField label="CVC">
          <input
            v-model="cvc"
            inputmode="numeric"
            autocomplete="off"
            maxlength="4"
            placeholder="123"
            class="input-field font-mono"
          >
        </UiField>
      </div>

      <p
        v-if="error"
        class="text-sm text-rose-600 dark:text-rose-400"
      >
        {{ error }}
      </p>

      <div class="flex justify-end gap-2">
        <UiButton
          type="button"
          variant="outline"
          @click="emit('close')"
        >
          {{ t("Cancelar", "Cancel") }}
        </UiButton>
        <UiButton
          type="submit"
          :disabled="pagar.isPending.value"
        >
          <LoaderCircle
            v-if="pagar.isPending.value"
            class="h-4 w-4 animate-spin"
          />
          {{ t("Pagar", "Pay") }} {{ soles(plan.price) }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
