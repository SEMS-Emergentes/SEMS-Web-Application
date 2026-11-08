<script setup>
import { ref, computed, watch } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { ClipboardPen, LoaderCircle, Plus } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiField from "./ui/UiField.vue";
import UiButton from "./ui/UiButton.vue";
import { getMeters, createReading } from "@/services/energy.service";
import { listDevices } from "@/services/devices.service";
import { useLangStore } from "@/stores/lang";

// Registro manual de lecturas. El producto no recibe nada de los medidores por
// su cuenta, asi que esta es la unica forma de que entre consumo: sin ella el
// panel, el desglose por equipo y las alertas de demanda no tienen datos.
const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();
const qc = useQueryClient();

/** Fecha y hora local en el formato que acepta datetime-local. */
function ahoraLocal() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

const meterId = ref("");
const deviceId = ref("");
const energyKwh = ref("");
const powerWatts = ref("");
const momento = ref(ahoraLocal());
const error = ref("");
const ok = ref(false);

const { data: meters } = useQuery({
  queryKey: computed(() => ["meters", props.userId]),
  queryFn: () => getMeters(props.userId),
});

const { data: devices } = useQuery({
  queryKey: computed(() => ["devices", props.userId]),
  queryFn: () => listDevices(props.userId),
});

// Con un solo medidor no tiene sentido obligar a abrir el selector.
watch(meters, (lista) => {
  if (!meterId.value && lista?.length) meterId.value = lista[0].meterId;
});

const medidor = computed(
  () => (meters.value ?? []).find((m) => m.meterId === meterId.value) ?? null
);

// Solo se ofrecen los equipos del local del medidor: atribuir la lectura a un
// equipo de otro local daria un desglose por equipo que no cuadra con el
// consumo del suministro.
const equipos = computed(() => {
  const site = medidor.value?.siteId;
  const lista = devices.value ?? [];
  return site ? lista.filter((d) => d.siteId === site) : lista;
});

// Al cambiar de medidor, el equipo elegido puede ser de otro local.
watch(meterId, () => {
  deviceId.value = "";
});

const registrar = useMutation({
  mutationFn: (payload) => createReading(props.userId, payload),
  onSuccess: () => {
    error.value = "";
    ok.value = true;
    energyKwh.value = "";
    powerWatts.value = "";
    momento.value = ahoraLocal();
    // Todo lo que se calcula encima de las lecturas queda obsoleto con una
    // lectura nueva, incluidas las alertas: la evaluacion de demanda corre en
    // el propio registro y puede haber levantado una.
    for (const key of [
      ["readings-raw", props.userId],
      ["consumption", props.userId],
      ["summary-period", props.userId],
      ["billPrediction", props.userId],
      ["rankings", props.userId],
      ["anomalies", props.userId],
      ["alerts", props.userId],
      ["alerts-unread", props.userId],
      ["meters", props.userId],
      ["meter-latest"],
      ["zone-consumption"],
      ["site-comparison"],
    ]) {
      qc.invalidateQueries({ queryKey: key });
    }
  },
  onError: (e) => {
    ok.value = false;
    // El backend explica por que rechaza la lectura (medidor de otra persona,
    // kWh negativos, fecha futura) y ese detalle es mas util que un mensaje
    // generico.
    error.value =
      e?.response?.data?.message ||
      t("No se pudo registrar la lectura.", "Couldn't record the reading.");
  },
});

function onSubmit() {
  ok.value = false;
  if (!meterId.value) {
    error.value = t("Elige el medidor que tomó la lectura.", "Pick the meter the reading comes from.");
    return;
  }
  const kwh = Number(energyKwh.value);
  if (!energyKwh.value || isNaN(kwh) || kwh < 0) {
    error.value = t("La energía tiene que ser un número de kWh no negativo.", "Energy must be a non-negative number of kWh.");
    return;
  }
  const cuando = new Date(momento.value);
  if (isNaN(cuando.getTime())) {
    error.value = t("Revisa la fecha y hora de la lectura.", "Check the reading's date and time.");
    return;
  }
  // El backend rechaza marcas de tiempo futuras, asi que se avisa aqui en vez
  // de gastar la peticion.
  if (cuando.getTime() > Date.now()) {
    error.value = t("La lectura no puede ser del futuro.", "The reading can't be in the future.");
    return;
  }
  error.value = "";
  const vatios = Number(powerWatts.value);
  registrar.mutate({
    meterId: meterId.value,
    deviceId: deviceId.value || null,
    energyKwh: kwh,
    powerWatts: !powerWatts.value || isNaN(vatios) ? 0 : vatios,
    timestamp: cuando.toISOString(),
  });
}
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Registrar lectura", "Record a reading") }}
      <template #action>
        <ClipboardPen class="h-4 w-4 text-slate-400" />
      </template>
    </UiCardTitle>

    <p
      v-if="(meters?.length ?? 0) === 0"
      class="py-3 text-sm text-slate-400"
    >
      {{ t(
        "Vincula un medidor antes de registrar lecturas: toda lectura sale de un medidor.",
        "Link a meter before recording readings: every reading comes from a meter."
      ) }}
    </p>

    <form
      v-else
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <UiField :label="t('Medidor', 'Meter')">
          <select
            v-model="meterId"
            required
            class="input-field"
          >
            <option
              v-for="m in meters"
              :key="m.meterId"
              :value="m.meterId"
            >
              {{ m.name }}
            </option>
          </select>
        </UiField>

        <UiField :label="t('Equipo (opcional)', 'Device (optional)')">
          <select
            v-model="deviceId"
            class="input-field"
          >
            <option value="">
              {{ t("Sin atribuir", "Unattributed") }}
            </option>
            <option
              v-for="d in equipos"
              :key="d.deviceId"
              :value="d.deviceId"
            >
              {{ d.deviceName }}
            </option>
          </select>
        </UiField>

        <UiField :label="t('Energía (kWh)', 'Energy (kWh)')">
          <input
            v-model="energyKwh"
            required
            type="number"
            min="0"
            step="0.01"
            placeholder="12.5"
            class="input-field"
          >
        </UiField>

        <UiField :label="t('Potencia (W, opcional)', 'Power (W, optional)')">
          <input
            v-model="powerWatts"
            type="number"
            min="0"
            step="1"
            placeholder="3200"
            class="input-field"
          >
        </UiField>

        <UiField :label="t('Fecha y hora', 'Date and time')">
          <input
            v-model="momento"
            required
            type="datetime-local"
            class="input-field"
          >
        </UiField>
      </div>

      <div class="flex items-center justify-between gap-3">
        <p class="text-xs text-slate-400">
          {{ t(
            "El coste se calcula con la tarifa del local y la franja horaria de la lectura.",
            "The cost is computed from the site's tariff and the reading's time of day."
          ) }}
        </p>
        <UiButton
          type="submit"
          :disabled="registrar.isPending.value"
        >
          <LoaderCircle
            v-if="registrar.isPending.value"
            class="h-4 w-4 animate-spin"
          />
          <Plus
            v-else
            class="h-4 w-4"
          />
          {{ t("Registrar", "Record") }}
        </UiButton>
      </div>
    </form>

    <p
      v-if="error"
      class="mt-2 text-xs text-rose-600 dark:text-rose-400"
    >
      {{ error }}
    </p>
    <p
      v-else-if="ok"
      class="mt-2 text-xs text-emerald-600 dark:text-emerald-400"
    >
      {{ t("Lectura registrada.", "Reading recorded.") }}
    </p>
  </UiCard>
</template>
