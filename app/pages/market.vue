<template>
  <div class="py-8">
    <div class="w-full">
      <div>
        <h1 class="text-4xl font-black tracking-tighter mb-10">Marchés & PEA</h1>
      </div>

      <!-- Barre de recherche avec auto-complétion -->
      <div class="mb-6 flex flex-col gap-4">
        <div ref="searchRoot" class="relative w-full md:w-2/3 lg:w-1/2">
          <Input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher un actif (ex: LVMH, Nasdaq, CW8)..."
              class="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-750 rounded-lg px-4 py-4 text-neutral-900 dark:text-neutral-100 shadow-sm focus:outline-none focus:border-primary-550 transition"
              @input="handleSearchInput"
              @focus="showSuggestions = true"
              @keydown.esc="showSuggestions = false"
              aria-label="Rechercher un actif pour l'ajouter à votre portefeuille"
          />

          <!-- Menu déroulant des suggestions -->
          <div
              v-if="showSuggestions && suggestions.length > 0"
              class="absolute z-20 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-750 rounded-lg shadow-2xl overflow-hidden"
          >
            <ul class="max-h-64 overflow-y-auto">
              <li
                  v-for="item in suggestions"
                  :key="item.symbol"
                  class="border-b border-neutral-100 dark:border-neutral-800 last:border-0"
              >
                <Button
                    type="button"
                    class="w-full text-left px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
                    @click="prepareAddAsset(item)"
                >
                  <div class="flex justify-between items-center">
                    <div>
                      <span class="font-bold text-neutral-900 dark:text-white">{{ item.symbol }}</span>
                      <span class="ml-2 text-sm text-neutral-500 truncate max-w-[200px] inline-block align-bottom">{{ item.shortName }}</span>
                    </div>
                    <div class="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded text-neutral-500">
                      {{ item.exchange }} • {{ item.type }}
                    </div>
                  </div>
                </Button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Formulaire d'ajout de position (apparaît après sélection) -->
        <div v-if="selectedForAdd" class="w-full md:w-2/3 lg:w-1/2 p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-lg shadow-sm flex flex-col md:flex-row gap-4 items-end">
          <div class="flex-1 w-full">
            <Label class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              <div class="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-white font-medium">
                {{ selectedForAdd.symbol }}
              </div>
              Actif
            </Label>
          </div>
          <div class="w-full md:w-24">
            <Label class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
            <Input v-model.number="formQuantity" type="number" min="0.01" step="0.01" class="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-primary-500" />
              Quantité
            </Label>
          </div>
          <div class="w-full md:w-32">
            <Label class="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              <Input id="formPru" v-model.number="formPru" type="number" min="0" step="0.01" class="w-full bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md px-3 py-2 text-neutral-900 dark:text-white focus:outline-none focus:border-primary-500" />
              PRU (Prix d'achat)
            </Label>
          </div>
          <div class="flex gap-2 w-full md:w-auto">
            <Button type="button" class="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded-md transition" @click="cancelAdd">Annuler</Button>
            <Button
                type="button"
                :disabled="!isFormValid"
                class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-md transition whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                @click="confirmAddPosition"
            >
              Ajouter
            </Button>
          </div>
        </div>
      </div>

      <p v-if="actionError" role="alert" class="mb-4 text-sm text-red-500">{{ actionError }}</p>

      <portfolioOverview v-if="quotes.length" :positions="enrichedPositions" />

      <!-- Spinner : uniquement au premier chargement -->
      <div v-if="status === 'pending' && !quotes.length" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"/>
      </div>

      <!-- Erreur : message générique -->
      <div v-else-if="error" class="p-4 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg shadow-sm border border-red-200 dark:border-red-800 mb-8">
        Impossible de charger les cours pour le moment. Réessaie dans un instant.
      </div>

      <!-- État vide -->
      <p v-else-if="!enrichedPositions.length" class="text-neutral-500">
        Aucune position. Recherche un actif pour commencer.
      </p>

      <!-- Grille du portefeuille -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div
            v-for="pos in enrichedPositions"
            :key="pos.symbol"
            class="card p-5 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-750 relative group transition-transform hover:-translate-y-1"
        >
          <!-- Bouton de suppression : visible au clavier et sur mobile -->
          <button
              type="button"
              aria-label="Supprimer la position"
              class="absolute top-4 right-4 text-neutral-400 hover:text-red-500 focus:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"
              @click="removePosition(pos.symbol)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
          </button>

          <!-- En-tête -->
          <div class="mb-4">
            <span class="text-xs font-semibold px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {{ pos.symbol }}
            </span>
            <h3 class="text-lg font-medium text-neutral-800 dark:text-neutral-200 mt-2 truncate" :title="pos.shortName">
              {{ pos.shortName }}
            </h3>
          </div>

          <!-- Valeur totale -->
          <p class="text-3xl font-bold text-neutral-900 dark:text-white">
            {{ formatCurrency(pos.totalValue, pos.currency) }}
          </p>
          <p v-if="pos.price === null" class="mt-1 text-sm text-amber-600">Cours indisponible</p>

          <!-- Gains / pertes globaux -->
          <div class="mt-2 text-sm">
            <span :class="[trendTextClass(pos.gainValue), trendBgClass(pos.gainValue)]" class="font-semibold px-2 py-1 rounded">
              {{ formatCurrency(pos.gainValue, pos.currency, true) }} ({{ formatPercent(pos.gainPercent) }})
            </span>
          </div>

          <!-- Détails (Qté, PRU, cours, variation du jour) -->
          <div class="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p class="text-neutral-500 dark:text-neutral-400 text-xs">Quantité</p>
              <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ pos.quantity }}</p>
            </div>
            <div>
              <p class="text-neutral-500 dark:text-neutral-400 text-xs">PRU</p>
              <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ formatCurrency(pos.pru, pos.currency) }}</p>
            </div>
            <div>
              <p class="text-neutral-500 dark:text-neutral-400 text-xs">Cours actuel</p>
              <p class="font-medium text-neutral-800 dark:text-neutral-200">{{ formatCurrency(pos.price, pos.currency) }}</p>
            </div>
            <div>
              <p class="text-neutral-500 dark:text-neutral-400 text-xs">Aujourd'hui</p>
              <p :class="trendTextClass(pos.changePercent)" class="font-medium">
                {{ formatPercent(pos.changePercent) }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AssetSearchResult, EnrichedPosition, MarketQuote, Position } from '#shared/types/market';
import { formatCurrency, formatPercent, trendBgClass, trendTextClass } from '~/utils/format';

useHead({ title: 'AirGap | Marchés' });
definePageMeta({ middleware: ['authenticated'] });

const { data: positions, refresh: refreshPositions } = await useFetch<Position[]>('/api/portfolio', {
  default: () => [],
});

const symbols = computed(() => positions.value.map((p) => p.symbol).join(','));

const { data: quotes, status, error } = useAsyncData(
    'market-quotes',
    () => symbols.value
        ? $fetch<MarketQuote[]>('/api/quotes', { query: { symbols: symbols.value } })
        : Promise.resolve([]),
    { watch: [symbols], server: false, default: () => [] },
);

const enrichedPositions = computed<EnrichedPosition[]>(() =>
    positions.value.map((pos) => {
      const quote = quotes.value.find((q) => q.symbol === pos.symbol);
      const price = quote?.price ?? null;
      const totalInvested = pos.pru * pos.quantity;
      const totalValue = price === null ? null : price * pos.quantity;
      const gainValue = totalValue === null ? null : totalValue - totalInvested;
      const gainPercent = gainValue !== null && totalInvested > 0
          ? (gainValue / totalInvested) * 100
          : null;

      return {
        ...pos,
        shortName: quote?.shortName ?? pos.symbol,
        currency: quote?.currency ?? 'EUR',
        price,
        changePercent: quote?.changePercent ?? null,
        totalValue,
        gainValue,
        gainPercent,
      };
    }),
);

// --- FORMULAIRE D'AJOUT ---
const selectedForAdd = ref<AssetSearchResult | null>(null);
const formQuantity = ref<number>(1);
const formPru = ref<number>(0);

const isFormValid = computed(() =>
    Number.isFinite(formQuantity.value) && formQuantity.value > 0
    && Number.isFinite(formPru.value) && formPru.value >= 0,
);

const prepareAddAsset = (item: AssetSearchResult) => {
  selectedForAdd.value = item;
  formQuantity.value = 1;
  formPru.value = 0;
  searchQuery.value = '';
  suggestions.value = [];
  showSuggestions.value = false;
};

const cancelAdd = () => {
  selectedForAdd.value = null;
};

const actionError = ref<string | null>(null);

const confirmAddPosition = async () => {
  if (!selectedForAdd.value || !isFormValid.value) return;

  actionError.value = null;
  try {
    await $fetch('/api/portfolio', {
      method: 'POST',
      body: { symbol: selectedForAdd.value.symbol, quantity: formQuantity.value, pru: formPru.value },
    });
    selectedForAdd.value = null;
    await refreshPositions();
  } catch {
    actionError.value = "Impossible d'ajouter la position. Réessaie dans un instant.";
  }
};

const removePosition = async (symbol: string) => {
  actionError.value = null;
  try {
    await $fetch(`/api/portfolio/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
    await refreshPositions();
  } catch {
    actionError.value = 'Impossible de supprimer la position. Réessaie dans un instant.';
  }
};

// --- RECHERCHE (AUTOCOMPLÉTION) ---
const searchRoot = ref<HTMLElement | null>(null);
const searchQuery = ref('');
const suggestions = ref<AssetSearchResult[]>([]);
const showSuggestions = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let abortController: AbortController | undefined;

const handleSearchInput = () => {
  clearTimeout(debounceTimer);
  abortController?.abort();

  const q = searchQuery.value.trim();
  if (q.length < 2) {
    suggestions.value = [];
    return;
  }

  debounceTimer = setTimeout(async () => {
    const controller = new AbortController();
    abortController = controller;
    try {
      suggestions.value = await $fetch<AssetSearchResult[]>('/api/quotes/search', {
        query: { q },
        signal: controller.signal,
      });
      showSuggestions.value = true;
    } catch (e) {
      if (!controller.signal.aborted) console.error('Erreur de recherche', e);
    }
  }, 300);
};

const closeOnOutsideClick = (e: MouseEvent) => {
  if (!searchRoot.value?.contains(e.target as Node)) showSuggestions.value = false;
};

onMounted(() => document.addEventListener('click', closeOnOutsideClick));
onBeforeUnmount(() => {
  document.removeEventListener('click', closeOnOutsideClick);
  clearTimeout(debounceTimer);
  abortController?.abort();
});
</script>