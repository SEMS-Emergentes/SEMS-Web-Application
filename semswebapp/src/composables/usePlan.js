import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { storeToRefs } from "pinia";
import { getMySubscription, getPlans } from "@/services/subscriptions.service";
import { useAuthStore } from "@/stores/auth";
import { tierFromName } from "@/lib/plan";

/**
 * Nivel del plan del usuario (starter / business / enterprise).
 *
 * Comparte la misma clave de cache que la pagina de Suscripcion, asi que aunque
 * lo usen el menu lateral y tres paginas a la vez solo se hace una peticion.
 *
 * @returns {import("vue").ComputedRef<import("@/lib/plan").PlanTier>}
 */
export function usePlanTier() {
  const { user } = storeToRefs(useAuthStore());

  const { data } = useQuery({
    queryKey: computed(() => ["subscription", user.value?.id]),
    queryFn: () => getMySubscription(user.value.id),
    enabled: computed(() => Boolean(user.value)),
  });

  return computed(() => tierFromName(data.value?.planName));
}

/**
 * Cuantos dispositivos admite cada local con el plan del usuario.
 *
 * Sale de la caracteristica DEVICES_PER_SITE_LIMIT del plan, la misma que la
 * pagina de planes anuncia. Antes era una tabla fija en la web (3, 10,
 * ilimitado) que no coincidia con el plan: Starter prometia 10 por local y la
 * pantalla bloqueaba al tercer equipo. Sin suscripcion rige el plan gratuito.
 * Si el plan no declara el limite, no se inventa uno.
 *
 * @returns {import("vue").ComputedRef<number>}
 */
export function usePlanDeviceLimit() {
  const { user } = storeToRefs(useAuthStore());

  const { data: sub } = useQuery({
    queryKey: computed(() => ["subscription", user.value?.id]),
    queryFn: () => getMySubscription(user.value.id),
    enabled: computed(() => Boolean(user.value)),
  });
  const { data: plans } = useQuery({ queryKey: ["plans"], queryFn: getPlans });

  return computed(() => {
    const lista = plans.value ?? [];
    const plan = lista.find((p) => p.id === sub.value?.planId) ?? lista.find((p) => p.price === 0);
    const valor = plan?.features?.find((f) => f.code === "DEVICES_PER_SITE_LIMIT")?.value;
    const n = Number.parseInt(valor, 10);
    return Number.isFinite(n) && n > 0 ? n : Number.POSITIVE_INFINITY;
  });
}
