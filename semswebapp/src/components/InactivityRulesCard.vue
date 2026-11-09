<script setup>
import { ref, computed } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { AlarmClockOff, LoaderCircle, Plus } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiField from "./ui/UiField.vue";
import UiBadge from "./ui/UiBadge.vue";
import UiButton from "./ui/UiButton.vue";
import UiLoading from "./ui/UiLoading.vue";
import UiErrorState from "./ui/UiErrorState.vue";
import { listInactivityRules, createInactivityRule } from "@/services/alerts.service";
import { listDevices } from "@/services/devices.service";
import { useLangStore } from "@/stores/lang";

// Avisos por equipos que dejaron de reportar. A diferencia del resto de
// alertas, esta no la dispara un dato que llega sino uno que falta, asi que el
// backend la revisa cada pocos minutos.
const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();
const qc = useQueryClient();

const deviceId = ref("");
const minutos = ref("60");
const error = ref("");

const { data: reglas, isLoading, isError } = useQuery({
  queryKey: computed(() => ["inactivity-rules", props.userId]),
  queryFn: () => listInactivityRules(props.userId),
});

const { data: equipos } = useQuery({
  queryKey: computed(() => ["devices", props.userId]),
  queryFn: () => listDevices(props.userId),
});

const nombrePorEquipo = computed(() => {
  const mapa = new Map();
  for (const equipo of equipos.value ?? []) mapa.set(equipo.deviceId, equipo.deviceName);
  return mapa;
});

// Un equipo con regla no necesita otra: la segunda avisaria de lo mismo.
const sinRegla = computed(() => {
  const yaTienen = new Set((reglas.value ?? []).map((r) => r.deviceId));
  return (equipos.value ?? []).filter((e) => !yaTienen.has(e.deviceId));
});

const crear = useMutation({
  mutationFn: () => createInactivityRule({
    userId: props.userId,
    deviceId: deviceId.value,
    ruleName: t("Sin reportar", "Not reporting"),
    maxInactiveMinutes: Number(minutos.value),
  }),
  onSuccess: () => {
    error.value = "";
    deviceId.value = "";
    qc.invalidateQueries({ queryKey: ["inactivity-rules", props.userId] });
  },
  onError: (e) => {
    error.value =
      e?.response?.data?.message ||
      t("No se pudo crear la regla.", "Couldn't create the rule.");
  },
});

function onSubmit() {
  if (!deviceId.value) {
    error.value = t("Elige el equipo que quieres vigilar.", "Pick the device to watch.");
    return;
  }
  const limite = Number(minutos.value);
  if (isNaN(limite) || limite <= 0) {
    error.value = t(
      "El límite tiene que ser un número de minutos mayor que cero.",
      "The limit must be a number of minutes greater than zero."
    );
    return;
  }
  error.value = "";
  crear.mutate();
}
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Avisos por equipo sin reportar", "Alerts for devices not reporting") }}
      <template #action>
        <AlarmClockOff class="h-4 w-4 text-slate-400" />
      </template>
    </UiCardTitle>

    <p class="mb-3 text-xs text-slate-400">
      {{ t(
        "Si un equipo deja de enviar lecturas durante más tiempo del fijado, recibes un aviso. Mientras siga caído no se repite.",
        "If a device stops sending readings for longer than the limit, you get an alert. It is not repeated while it stays down."
      ) }}
    </p>

    <UiLoading v-if="isLoading" />
    <UiErrorState v-else-if="isError" />
    <p
      v-else-if="(reglas?.length ?? 0) === 0"
      class="py-3 text-sm text-slate-400"
    >
      {{ t("Todavía no vigilas ningún equipo.", "You aren't watching any device yet.") }}
    </p>
    <ul
      v-else
      class="space-y-2.5"
    >
      <li
        v-for="regla in reglas"
        :key="regla.ruleId"
        class="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 dark:border-navy-800"
      >
        <div class="min-w-0">
          <p class="truncate font-semibold text-slate-900 dark:text-white">
            {{ nombrePorEquipo.get(regla.deviceId) ?? t("Equipo retirado", "Removed device") }}
          </p>
          <p class="text-xs text-slate-400">
            {{ t("Avisa tras", "Warns after") }} {{ regla.maxInactiveMinutes }}
            {{ t("minutos sin reportar", "minutes without reporting") }}
          </p>
        </div>
        <UiBadge :color="regla.active ? 'green' : 'slate'">
          {{ regla.active ? t("Activa", "Active") : t("Inactiva", "Inactive") }}
        </UiBadge>
      </li>
    </ul>

    <p
      v-if="(equipos?.length ?? 0) === 0"
      class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    >
      {{ t(
        "Registra un equipo antes de vigilar su actividad.",
        "Register a device before watching its activity."
      ) }}
    </p>

    <form
      v-else
      class="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_auto_auto]"
      @submit.prevent="onSubmit"
    >
      <UiField :label="t('Equipo', 'Device')">
        <select
          v-model="deviceId"
          class="input-field"
        >
          <option value="">
            {{ t("Elige un equipo", "Pick a device") }}
          </option>
          <option
            v-for="equipo in sinRegla"
            :key="equipo.deviceId"
            :value="equipo.deviceId"
          >
            {{ equipo.deviceName }}
          </option>
        </select>
      </UiField>
      <UiField :label="t('Minutos', 'Minutes')">
        <input
          v-model="minutos"
          type="number"
          min="1"
          step="1"
          class="input-field sm:w-28"
        >
      </UiField>
      <UiButton
        type="submit"
        :disabled="crear.isPending.value || sinRegla.length === 0"
      >
        <LoaderCircle
          v-if="crear.isPending.value"
          class="h-4 w-4 animate-spin"
        />
        <Plus
          v-else
          class="h-4 w-4"
        />
        {{ t("Vigilar", "Watch") }}
      </UiButton>
    </form>

    <p
      v-if="error"
      class="mt-2 text-xs text-rose-600 dark:text-rose-400"
    >
      {{ error }}
    </p>
  </UiCard>
</template>
