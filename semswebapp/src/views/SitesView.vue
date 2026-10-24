<script setup>
import { ref, computed } from "vue";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { Building2, Store, Plus, Pencil, Trash2, Save, Check, LayoutGrid, LoaderCircle } from "lucide-vue-next";
import UiCard from "@/components/ui/UiCard.vue";
import UiCardTitle from "@/components/ui/UiCardTitle.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiField from "@/components/ui/UiField.vue";
import UiToggle from "@/components/ui/UiToggle.vue";
import UiLoading from "@/components/ui/UiLoading.vue";
import UiErrorState from "@/components/ui/UiErrorState.vue";
import SiteModal from "@/components/SiteModal.vue";
import {
  getMyOrganization, createOrganization, updateOrganization,
  listSites, createSite, updateSite, archiveSite,
  listZones, createZone, archiveZone,
} from "@/services/organizations.service";
import { useAuthStore } from "@/stores/auth";
import { useLangStore } from "@/stores/lang";

const qc = useQueryClient();
const { user } = storeToRefs(useAuthStore());
const { t } = useLangStore();

const uid = computed(() => user.value?.id ?? "");
const enabled = computed(() => Boolean(user.value));

// Un local no existe sin su organizacion, asi que la pantalla se divide en dos
// momentos: si no hay organizacion se pide darla de alta, y solo despues
// aparecen los locales. Mantenerlo en una sola pantalla evita que el usuario
// tenga que adivinar que lo primero es registrar la empresa.
const {
  data: org, isLoading: loadingOrg, isError: errorOrg, refetch: refetchOrg,
} = useQuery({
  queryKey: computed(() => ["organization", uid.value]),
  queryFn: () => getMyOrganization(uid.value),
  enabled,
});

const BUSINESS_TYPES = [
  ["SUPERMARKET", t("Supermercado", "Supermarket")],
  ["CONVENIENCE_STORE", t("Tienda de conveniencia", "Convenience store")],
  ["DEPARTMENT_STORE", t("Tienda por departamentos", "Department store")],
  ["RESTAURANT", t("Restaurante", "Restaurant")],
  ["WAREHOUSE", t("Almacén", "Warehouse")],
  ["OTHER", t("Otro", "Other")],
];

const ZONE_TYPES = [
  ["SALES_FLOOR", t("Sala de ventas", "Sales floor")],
  ["COLD_STORAGE", t("Cámaras de frío", "Cold storage")],
  ["WAREHOUSE", t("Almacén", "Warehouse")],
  ["KITCHEN", t("Cocina", "Kitchen")],
  ["OFFICES", t("Oficinas", "Offices")],
  ["HVAC", t("Climatización", "HVAC")],
  ["PARKING", t("Estacionamiento", "Parking")],
  ["OTHER", t("Otra", "Other")],
];

const etiqueta = (pares, valor) => pares.find(([v]) => v === valor)?.[1] ?? valor;

// ----------------------------------------------------------- organizacion
const orgForm = ref({ legalName: "", tradeName: "", taxId: "", businessType: "SUPERMARKET" });
const orgSaved = ref(false);

// El RUC peruano son once digitos. Se valida aqui para no gastar un viaje al
// servidor, pero el backend tambien lo comprueba.
const rucValido = computed(() => /^\d{11}$/.test(orgForm.value.taxId.trim()));

const crearOrg = useMutation({
  mutationFn: () => createOrganization({ ...orgForm.value, ownerUserId: uid.value }),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["organization"] });
    refetchOrg();
  },
});

const editandoOrg = ref(false);
const editOrgForm = ref({ legalName: "", tradeName: "", businessType: "SUPERMARKET" });

function abrirEdicionOrg() {
  editOrgForm.value = {
    legalName: org.value.legalName,
    tradeName: org.value.tradeName,
    businessType: org.value.businessType,
  };
  editandoOrg.value = true;
}

const guardarOrg = useMutation({
  mutationFn: () => updateOrganization(org.value.organizationId, editOrgForm.value),
  onSuccess: () => {
    editandoOrg.value = false;
    orgSaved.value = true;
    setTimeout(() => (orgSaved.value = false), 2000);
    qc.invalidateQueries({ queryKey: ["organization"] });
    refetchOrg();
  },
});

// ------------------------------------------------------------------ locales
const orgId = computed(() => org.value?.organizationId ?? null);

const { data: sites, isLoading: loadingSites, isError: errorSites } = useQuery({
  queryKey: computed(() => ["sites", orgId.value]),
  queryFn: () => listSites(orgId.value),
  enabled: computed(() => Boolean(orgId.value)),
});

const modalAbierto = ref(false);
const editandoLocal = ref(null);

const crearLocal = useMutation({
  mutationFn: (datos) => createSite(orgId.value, datos),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["sites"] });
    modalAbierto.value = false;
  },
});

const guardarLocal = useMutation({
  mutationFn: ({ siteId, datos }) => updateSite(siteId, datos),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["sites"] });
    editandoLocal.value = null;
  },
});

const archivarLocal = useMutation({
  mutationFn: (siteId) => archiveSite(siteId),
  // Archivar un local deja sus dispositivos sin sede visible, asi que se
  // refresca tambien esa parte de la aplicacion.
  onSuccess: () => ["sites", "devices", "zones"].forEach((key) =>
    qc.invalidateQueries({ queryKey: [key] })),
});

function confirmarArchivado(site) {
  const aviso = t(
    `¿Archivar el local "${site.name}"? Dejará de aparecer, y sus dispositivos quedarán sin sede.`,
    `Archive site "${site.name}"? It will no longer be listed, and its devices will be left without a site.`
  );
  if (window.confirm(aviso)) archivarLocal.mutate(site.siteId);
}

function onGuardarModal(datos) {
  if (editandoLocal.value) {
    guardarLocal.mutate({ siteId: editandoLocal.value.siteId, datos });
  } else {
    crearLocal.mutate(datos);
  }
}

// -------------------------------------------------------------------- zonas
// Las zonas se cargan solo del local que el usuario abre: son muchas por
// organizacion y casi nunca se mira mas de una sede a la vez.
const localAbierto = ref(null);

const { data: zones, isLoading: loadingZones } = useQuery({
  queryKey: computed(() => ["zones", localAbierto.value]),
  queryFn: () => listZones(localAbierto.value),
  enabled: computed(() => Boolean(localAbierto.value)),
});

function alternarZonas(siteId) {
  localAbierto.value = localAbierto.value === siteId ? null : siteId;
}

const zonaForm = ref({ name: "", zoneType: "SALES_FLOOR", operatesOffHours: false });

const crearZona = useMutation({
  mutationFn: () => createZone(localAbierto.value, zonaForm.value),
  onSuccess: () => {
    zonaForm.value = { name: "", zoneType: "SALES_FLOOR", operatesOffHours: false };
    qc.invalidateQueries({ queryKey: ["zones"] });
  },
});

const archivarZona = useMutation({
  mutationFn: (zoneId) => archiveZone(zoneId),
  onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
});
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="font-display text-2xl font-bold text-slate-900 dark:text-white">
        {{ t("Mis locales", "My sites") }}
      </h1>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {{ t(
          "Tu organización, sus locales y las zonas de cada uno.",
          "Your organization, its sites and the zones in each one."
        ) }}
      </p>
    </div>

    <UiLoading v-if="loadingOrg" />
    <UiErrorState
      v-else-if="errorOrg"
      :message="t('No se pudo cargar tu organización.', `Couldn't load your organization.`)"
    />

    <!-- Sin organizacion: lo primero es darla de alta -->
    <UiCard v-else-if="!org">
      <UiCardTitle>
        <Building2 class="h-4 w-4 text-slate-400" />
        {{ t("Registra tu organización", "Register your organization") }}
      </UiCardTitle>
      <p class="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {{ t(
          "Los locales se agrupan bajo una organización. Regístrala una vez y después podrás añadir todas tus sedes.",
          "Sites are grouped under an organization. Register it once and then you can add all your locations."
        ) }}
      </p>
      <form
        class="space-y-4"
        @submit.prevent="crearOrg.mutate()"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UiField :label="t('Razón social', 'Legal name')">
            <input
              v-model="orgForm.legalName"
              required
              :placeholder="t('Ej: Comercial Los Andes S.A.C.', 'e.g. Los Andes Retail Inc.')"
              class="input-field"
            >
          </UiField>
          <UiField :label="t('Nombre comercial', 'Trade name')">
            <input
              v-model="orgForm.tradeName"
              :placeholder="t('Ej: Market Los Andes', 'e.g. Los Andes Market')"
              class="input-field"
            >
          </UiField>
          <UiField :label="t('RUC', 'Tax ID (RUC)')">
            <input
              v-model="orgForm.taxId"
              required
              inputmode="numeric"
              maxlength="11"
              placeholder="20512345678"
              class="input-field"
            >
            <p
              v-if="orgForm.taxId && !rucValido"
              class="mt-1 text-xs text-red-600 dark:text-red-400"
            >
              {{ t("El RUC son 11 dígitos.", "A RUC has 11 digits.") }}
            </p>
          </UiField>
          <UiField :label="t('Tipo de negocio', 'Business type')">
            <select
              v-model="orgForm.businessType"
              required
              class="input-field"
            >
              <option
                v-for="[value, label] in BUSINESS_TYPES"
                :key="value"
                :value="value"
              >
                {{ label }}
              </option>
            </select>
          </UiField>
        </div>
        <p
          v-if="crearOrg.isError.value"
          class="text-sm text-red-600 dark:text-red-400"
        >
          {{ t("No se pudo registrar. Revisa el RUC: puede estar ya en uso.", "Couldn't register. Check the RUC: it may already be in use.") }}
        </p>
        <UiButton
          type="submit"
          :disabled="!rucValido || crearOrg.isPending.value"
        >
          <LoaderCircle
            v-if="crearOrg.isPending.value"
            class="h-4 w-4 animate-spin"
          />
          {{ t("Registrar organización", "Register organization") }}
        </UiButton>
      </form>
    </UiCard>

    <!-- Con organizacion: ficha + locales -->
    <template v-else>
      <UiCard>
        <div class="flex flex-wrap items-start justify-between gap-3">
          <UiCardTitle>
            <Building2 class="h-4 w-4 text-slate-400" />
            {{ t("Organización", "Organization") }}
          </UiCardTitle>
          <div class="flex items-center gap-2">
            <UiBadge v-if="orgSaved">
              <Check class="h-3 w-3" /> {{ t("Guardado", "Saved") }}
            </UiBadge>
            <UiButton
              v-if="!editandoOrg"
              variant="outline"
              @click="abrirEdicionOrg()"
            >
              <Pencil class="h-4 w-4" /> {{ t("Editar", "Edit") }}
            </UiButton>
          </div>
        </div>

        <form
          v-if="editandoOrg"
          class="mt-4 space-y-4"
          @submit.prevent="guardarOrg.mutate()"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <UiField :label="t('Razón social', 'Legal name')">
              <input
                v-model="editOrgForm.legalName"
                required
                class="input-field"
              >
            </UiField>
            <UiField :label="t('Nombre comercial', 'Trade name')">
              <input
                v-model="editOrgForm.tradeName"
                class="input-field"
              >
            </UiField>
            <UiField :label="t('Tipo de negocio', 'Business type')">
              <select
                v-model="editOrgForm.businessType"
                required
                class="input-field"
              >
                <option
                  v-for="[value, label] in BUSINESS_TYPES"
                  :key="value"
                  :value="value"
                >
                  {{ label }}
                </option>
              </select>
            </UiField>
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400">
            {{ t("El RUC no se puede cambiar.", "The RUC cannot be changed.") }}
          </p>
          <div class="flex gap-2">
            <UiButton
              type="submit"
              :disabled="guardarOrg.isPending.value"
            >
              <Save class="h-4 w-4" /> {{ t("Guardar", "Save") }}
            </UiButton>
            <UiButton
              variant="outline"
              type="button"
              @click="editandoOrg = false"
            >
              {{ t("Cancelar", "Cancel") }}
            </UiButton>
          </div>
        </form>

        <dl
          v-else
          class="mt-4 grid gap-3 text-sm sm:grid-cols-2"
        >
          <div>
            <dt class="text-slate-500 dark:text-slate-400">
              {{ t("Razón social", "Legal name") }}
            </dt>
            <dd class="font-medium text-slate-900 dark:text-white">
              {{ org.legalName }}
            </dd>
          </div>
          <div>
            <dt class="text-slate-500 dark:text-slate-400">
              {{ t("Nombre comercial", "Trade name") }}
            </dt>
            <dd class="font-medium text-slate-900 dark:text-white">
              {{ org.tradeName || "—" }}
            </dd>
          </div>
          <div>
            <dt class="text-slate-500 dark:text-slate-400">
              {{ t("RUC", "Tax ID (RUC)") }}
            </dt>
            <dd class="font-medium text-slate-900 dark:text-white">
              {{ org.taxId }}
            </dd>
          </div>
          <div>
            <dt class="text-slate-500 dark:text-slate-400">
              {{ t("Tipo de negocio", "Business type") }}
            </dt>
            <dd class="font-medium text-slate-900 dark:text-white">
              {{ etiqueta(BUSINESS_TYPES, org.businessType) }}
            </dd>
          </div>
        </dl>
      </UiCard>

      <UiCard>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <UiCardTitle>
            <Store class="h-4 w-4 text-slate-400" />
            {{ t("Locales", "Sites") }}
          </UiCardTitle>
          <UiButton @click="modalAbierto = true">
            <Plus class="h-4 w-4" /> {{ t("Nuevo local", "New site") }}
          </UiButton>
        </div>

        <UiLoading v-if="loadingSites" />
        <UiErrorState
          v-else-if="errorSites"
          :message="t('No se pudieron cargar los locales.', `Couldn't load the sites.`)"
        />
        <p
          v-else-if="!sites || sites.length === 0"
          class="mt-4 text-sm text-slate-500 dark:text-slate-400"
        >
          {{ t(
            "Todavía no tienes locales. Registra el primero para poder dar de alta medidores y dispositivos.",
            "You have no sites yet. Register the first one so you can add meters and devices."
          ) }}
        </p>

        <ul
          v-else
          class="mt-4 space-y-3"
        >
          <li
            v-for="s in sites"
            :key="s.siteId"
            class="rounded-lg border border-slate-200 p-4 dark:border-navy-800"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-900 dark:text-white">
                  {{ s.name }}
                  <span class="ml-1 font-mono text-xs font-normal text-slate-400">{{ s.siteCode }}</span>
                </p>
                <p class="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {{ [s.address, s.district].filter(Boolean).join(" · ") || "—" }}
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-2">
                  <UiBadge>{{ s.tariffCategory }}</UiBadge>
                  <UiBadge>{{ s.contractedPowerKw }} kW</UiBadge>
                  <UiBadge v-if="s.chargesForDemand">
                    {{ t("Cobra por potencia", "Demand charge") }}
                  </UiBadge>
                  <UiBadge v-if="s.excludesSundaysFromPeak">
                    {{ t("Domingos sin hora punta", "Sundays off-peak") }}
                  </UiBadge>
                </div>
              </div>
              <div class="flex items-center gap-1">
                <UiButton
                  variant="ghost"
                  :title="t('Zonas', 'Zones')"
                  @click="alternarZonas(s.siteId)"
                >
                  <LayoutGrid class="h-4 w-4" />
                </UiButton>
                <UiButton
                  variant="ghost"
                  :title="t('Editar', 'Edit')"
                  @click="editandoLocal = s"
                >
                  <Pencil class="h-4 w-4" />
                </UiButton>
                <UiButton
                  variant="ghost"
                  :title="t('Archivar', 'Archive')"
                  :disabled="archivarLocal.isPending.value"
                  @click="confirmarArchivado(s)"
                >
                  <Trash2 class="h-4 w-4" />
                </UiButton>
              </div>
            </div>

            <!-- Zonas del local abierto -->
            <div
              v-if="localAbierto === s.siteId"
              class="mt-4 border-t border-slate-200 pt-4 dark:border-navy-800"
            >
              <p class="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
                {{ t("Zonas", "Zones") }}
              </p>

              <UiLoading v-if="loadingZones" />
              <p
                v-else-if="!zones || zones.length === 0"
                class="text-sm text-slate-500 dark:text-slate-400"
              >
                {{ t("Sin zonas. Divide el local para saber dónde se consume.", "No zones yet. Split the site to see where energy goes.") }}
              </p>
              <ul
                v-else
                class="space-y-2"
              >
                <li
                  v-for="z in zones"
                  :key="z.zoneId"
                  class="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-navy-800/60"
                >
                  <span class="text-slate-700 dark:text-slate-200">
                    {{ z.name }}
                    <span class="text-slate-400">· {{ etiqueta(ZONE_TYPES, z.zoneType) }}</span>
                    <UiBadge
                      v-if="z.operatesOffHours"
                      class="ml-2"
                    >
                      {{ t("Opera fuera de horario", "Runs off-hours") }}
                    </UiBadge>
                  </span>
                  <UiButton
                    variant="ghost"
                    :title="t('Archivar zona', 'Archive zone')"
                    @click="archivarZona.mutate(z.zoneId)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </UiButton>
                </li>
              </ul>

              <form
                class="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                @submit.prevent="crearZona.mutate()"
              >
                <UiField :label="t('Nueva zona', 'New zone')">
                  <input
                    v-model="zonaForm.name"
                    required
                    :placeholder="t('Ej: Cámaras de frío', 'e.g. Cold storage')"
                    class="input-field"
                  >
                </UiField>
                <UiField :label="t('Tipo', 'Type')">
                  <select
                    v-model="zonaForm.zoneType"
                    required
                    class="input-field"
                  >
                    <option
                      v-for="[value, label] in ZONE_TYPES"
                      :key="value"
                      :value="value"
                    >
                      {{ label }}
                    </option>
                  </select>
                </UiField>
                <UiButton
                  type="submit"
                  :disabled="crearZona.isPending.value"
                >
                  <Plus class="h-4 w-4" /> {{ t("Añadir", "Add") }}
                </UiButton>
                <div class="sm:col-span-3">
                  <UiToggle v-model="zonaForm.operatesOffHours">
                    {{ t("Opera fuera del horario comercial", "Runs outside business hours") }}
                  </UiToggle>
                </div>
              </form>
            </div>
          </li>
        </ul>
      </UiCard>
    </template>

    <SiteModal
      v-if="modalAbierto"
      :loading="crearLocal.isPending.value"
      @close="modalAbierto = false"
      @save="onGuardarModal"
    />
    <SiteModal
      v-if="editandoLocal"
      :site="editandoLocal"
      :loading="guardarLocal.isPending.value"
      @close="editandoLocal = null"
      @save="onGuardarModal"
    />
  </div>
</template>
