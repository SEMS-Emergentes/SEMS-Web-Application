<script setup>
import { computed, ref, watch } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { Activity } from "lucide-vue-next";
import UiCard from "./ui/UiCard.vue";
import UiCardTitle from "./ui/UiCardTitle.vue";
import UiBadge from "./ui/UiBadge.vue";
import UiLoading from "./ui/UiLoading.vue";
import UiErrorState from "./ui/UiErrorState.vue";
import UiEmptyState from "./ui/UiEmptyState.vue";
import { getLatestMeterReading, getMeters } from "@/services/energy.service";
import { getMyOrganization, listSites } from "@/services/organizations.service";
import { useLangStore } from "@/stores/lang";
import { soles, kwh as fmtKwh, pct as fmtPct } from "@/lib/format";

/**
 * Consumo actual del local segun la ultima lectura de un medidor (US24).
 *
 * Todo lo demas en Monitoreo esta agregado por dia, asi que no responde a la
 * pregunta de que esta pasando ahora mismo: para saber si el local va camino de
 * pasarse de potencia hay que mirar la lectura viva, no el total de ayer. Por
 * eso la potencia se muestra siempre contra la potencia contratada del local:
 * sola no dice nada, y el cargo por potencia del recibo no lo fija la energia
 * consumida sino el pico mas alto del mes, que se paga aunque dure un minuto.
 */
const props = defineProps({ userId: { type: String, required: true } });

const { t } = useLangStore();

const meterId = ref("");

// Misma clave que MetersManager: los medidores ya estan en cache y elegir aqui
// no dispara otra peticion.
const { data: medidores, isLoading: cargandoMedidores, isError: errorMedidores } = useQuery({
  queryKey: computed(() => ["meters", props.userId]),
  queryFn: () => getMeters(props.userId),
});

const { data: organizacion } = useQuery({
  queryKey: computed(() => ["org", props.userId]),
  queryFn: () => getMyOrganization(props.userId),
});

const { data: locales } = useQuery({
  queryKey: computed(() => ["sites", organizacion.value?.organizationId]),
  queryFn: () => listSites(organizacion.value.organizationId),
  enabled: computed(() => Boolean(organizacion.value?.organizationId)),
});

watch(medidores, (lista) => {
  if (!meterId.value && lista?.length) meterId.value = lista[0].meterId;
});

const medidorElegido = computed(
  () => (medidores.value ?? []).find((m) => m.meterId === meterId.value) ?? null
);

/**
 * El medidor elegido ya no esta entre los dados de alta.
 *
 * Pasa de verdad: desvincular un medidor en la tarjeta de arriba deja aqui un
 * identificador que el backend ya no reconoce. El endpoint devuelve el mismo
 * 404 que un medidor sin lecturas, asi que los dos casos solo se distinguen
 * desde esta lista, y confundirlos diria "registra lecturas" de un medidor que
 * no existe.
 */
const medidorInexistente = computed(
  () => Boolean(meterId.value) && medidores.value !== undefined && !medidorElegido.value
);

const { data: lectura, isLoading, isError } = useQuery({
  queryKey: computed(() => ["meter-latest", meterId.value]),
  queryFn: () => getLatestMeterReading(meterId.value),
  enabled: computed(() => Boolean(meterId.value)),
});

const kwMedidos = computed(() => (lectura.value?.powerWatts ?? 0) / 1000);

// La potencia contratada es del suministro, es decir del local, no del medidor.
const local = computed(
  () => (locales.value ?? []).find((s) => s.siteId === medidorElegido.value?.siteId) ?? null
);
const potenciaContratadaKw = computed(() => local.value?.contractedPowerKw || null);

const porcentajeContratada = computed(() => {
  if (!potenciaContratadaKw.value) return null;
  return (kwMedidos.value / potenciaContratadaKw.value) * 100;
});

// Pasarse de la potencia contratada no es un detalle: el kW de exceso se cobra
// a una tarifa bastante mas cara que el contratado.
const nivel = computed(() => {
  const p = porcentajeContratada.value;
  if (p === null) return "slate";
  if (p >= 100) return "rose";
  if (p >= 85) return "amber";
  return "green";
});

const BARRA = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

const mensajeNivel = computed(() => {
  const p = porcentajeContratada.value;
  if (p === null) return "";
  if (p >= 100) {
    return t(
      "Por encima de la potencia contratada: el exceso se cobra más caro.",
      "Above the contracted power: the excess is billed at a higher rate.",
    );
  }
  if (p >= 85) {
    return t("Cerca del límite contratado.", "Close to the contracted limit.");
  }
  return t("Dentro de la potencia contratada.", "Within the contracted power.");
});

const marcaDeTiempo = computed(() => {
  if (!lectura.value?.timestamp) return "";
  const d = new Date(lectura.value.timestamp);
  if (isNaN(d.getTime())) return lectura.value.timestamp;
  return d.toLocaleString(t("es-PE", "en-US"), { dateStyle: "medium", timeStyle: "short" });
});
</script>

<template>
  <UiCard>
    <UiCardTitle>
      {{ t("Consumo actual", "Current usage") }}
      <template #action>
        <Activity class="h-4 w-4 text-slate-400" />
      </template>
    </UiCardTitle>

    <label
      v-if="(medidores?.length ?? 0) > 1"
      class="mb-4 block text-xs font-semibold uppercase tracking-wide text-slate-400"
    >
      {{ t("Medidor", "Meter") }}
      <select
        v-model="meterId"
        class="input-field mt-1 normal-case"
      >
        <option
          v-for="m in medidores"
          :key="m.meterId"
          :value="m.meterId"
        >
          {{ m.serial || m.name }}
        </option>
      </select>
    </label>

    <UiLoading v-if="cargandoMedidores" />
    <UiErrorState v-else-if="errorMedidores" />

    <!-- Sin medidores no hay nada que consultar, y lo util es decir por donde
         se empieza. -->
    <UiEmptyState
      v-else-if="(medidores?.length ?? 0) === 0"
      :message="t('Aún no tienes medidores vinculados.', 'No meters linked yet.')"
      :hint="t(
        'Vincula tu medidor EOS en «Medidores EOS», aquí arriba, y su lectura aparecerá en esta tarjeta.',
        'Link your EOS meter under “EOS meters”, above, and its reading will show up on this card.',
      )"
    />

    <!-- Criterio 3: el medidor no existe, la consulta se rechaza. -->
    <UiErrorState
      v-else-if="medidorInexistente"
      :message="t(
        'No se encontró el medidor: ya no está vinculado a tu cuenta. Elige otro de la lista.',
        'Meter not found: it is no longer linked to your account. Pick another one from the list.',
      )"
    />

    <UiLoading v-else-if="isLoading" />
    <UiErrorState v-else-if="isError" />

    <!-- Criterio 2: el medidor esta registrado pero todavia no reporto nada. -->
    <UiEmptyState
      v-else-if="lectura === null"
      :message="t(
        'Este medidor todavía no tiene lecturas registradas.',
        'This meter has no readings recorded yet.',
      )"
      :hint="t(
        'Comprueba que esté encendido y conectado a la red del local: en cuanto envíe su primera lectura, aparecerá aquí.',
        'Check that it is powered on and connected to the site network: as soon as it sends its first reading, it will show up here.',
      )"
    />

    <!-- Criterio 1: ultima lectura registrada, con su marca de tiempo. -->
    <template v-else-if="lectura">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ t("Potencia medida ahora", "Power measured now") }}
          </p>
          <p class="font-display text-3xl font-extrabold text-slate-900 dark:text-white">
            {{ kwMedidos.toFixed(2) }} kW
          </p>
        </div>
        <div
          v-if="potenciaContratadaKw"
          class="text-right"
        >
          <p class="text-sm text-slate-500 dark:text-slate-400">
            {{ t("Potencia contratada", "Contracted power") }}
          </p>
          <p class="font-display text-xl font-extrabold text-slate-500 dark:text-slate-400">
            {{ potenciaContratadaKw.toFixed(2) }} kW
          </p>
        </div>
      </div>

      <!-- La relacion entre lo medido y lo contratado es el dato de producto:
           el cargo por potencia del mes lo fija el pico, no el consumo. -->
      <div
        v-if="porcentajeContratada !== null"
        class="mt-4"
      >
        <div class="mb-1 flex items-center justify-between gap-2 text-sm">
          <span class="text-slate-700 dark:text-slate-200">
            {{ t("De la potencia contratada", "Of contracted power") }}
          </span>
          <UiBadge :color="nivel">
            {{ fmtPct(porcentajeContratada) }}
          </UiBadge>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-navy-800">
          <div
            class="h-full rounded-full"
            :class="BARRA[nivel]"
            :style="{ width: `${Math.min(porcentajeContratada, 100)}%` }"
          />
        </div>
        <p class="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {{ mensajeNivel }}
        </p>
      </div>

      <!-- Sin local no hay con que comparar, y conviene decir que falta. -->
      <p
        v-else
        class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
      >
        {{ t(
          "Este medidor no tiene un local con potencia contratada, así que la potencia medida no se puede poner en contexto.",
          "This meter has no site with contracted power, so the measured power cannot be put in context.",
        ) }}
      </p>

      <dl class="mt-4 grid gap-3 border-t border-slate-100 pt-3 text-sm dark:border-navy-800 sm:grid-cols-3">
        <div>
          <dt class="text-xs text-slate-400">
            {{ t("Energía de la lectura", "Reading energy") }}
          </dt>
          <dd class="font-semibold text-slate-700 dark:text-slate-200">
            {{ fmtKwh(lectura.energyKwh) }}
          </dd>
        </div>
        <div v-if="lectura.estimatedCost !== null">
          <dt class="text-xs text-slate-400">
            {{ t("Costo estimado", "Estimated cost") }}
          </dt>
          <dd class="font-semibold text-slate-700 dark:text-slate-200">
            {{ soles(lectura.estimatedCost) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs text-slate-400">
            {{ t("Tensión", "Voltage") }}
          </dt>
          <dd class="font-semibold text-slate-700 dark:text-slate-200">
            {{ lectura.voltage.toFixed(1) }} V
          </dd>
        </div>
      </dl>

      <p class="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {{ t("Última lectura registrada", "Last recorded reading") }}:
        <span class="font-semibold text-slate-700 dark:text-slate-200">{{ marcaDeTiempo }}</span>
        <template v-if="local">
          · {{ local.name }}
        </template>
      </p>
    </template>
  </UiCard>
</template>
