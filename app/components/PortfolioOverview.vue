<template>
  <section v-if="positions.length" class="mb-8">
    <!-- Chiffres clés -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div
          v-for="card in cards"
          :key="card.label"
          class="p-5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-750"
      >
        <p class="text-xs text-neutral-500 dark:text-neutral-400">{{ card.label }}</p>
        <p
            class="text-2xl font-bold"
            :class="card.colored ? trendTextClass(card.trend) : 'text-neutral-900 dark:text-white'"
        >
          {{ card.value }}
        </p>
      </div>
    </div>

    <!-- Positions exclues des totaux -->
    <p v-if="stats.unpriced.length || stats.otherCurrency.length" class="mb-6 text-sm text-amber-600">
      Exclus des totaux :
      <span v-if="stats.unpriced.length">cours indisponible ({{ stats.unpriced.join(', ') }})</span>
      <span v-if="stats.unpriced.length && stats.otherCurrency.length"> ; </span>
      <span v-if="stats.otherCurrency.length">autre devise ({{ stats.otherCurrency.join(', ') }})</span>
    </p>

    <!-- Graphiques -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Répartition -->
      <div class="p-5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-750">
        <h2 class="text-lg font-medium text-neutral-800 dark:text-neutral-200 mb-4">Répartition</h2>
        <ClientOnly>
          <p v-if="!allocationData.length" class="text-sm text-neutral-500">Aucune donnée.</p>
          <div v-else class="dark:unovis-dark-mode">
            <div class="h-[260px]">
              <VisSingleContainer :data="allocationData" class="h-full w-full">
                <VisDonut
                    :value="(d: AllocationDatum) => d.value"
                    :color="(_: AllocationDatum, i: number) => colorAt(i)"
                    :arc-width="60"
                    :pad-angle="0.02"
                />
                <VisTooltip :triggers="donutTriggers" />
              </VisSingleContainer>
            </div>

            <ul class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <li
                  v-for="(item, i) in allocationData"
                  :key="item.name"
                  class="flex items-center justify-between gap-2"
              >
                <span class="flex items-center gap-2 min-w-0">
                  <span class="h-2.5 w-2.5 rounded-full shrink-0" :style="{ backgroundColor: colorAt(i) }" />
                  <span class="truncate text-neutral-700 dark:text-neutral-300">{{ item.name }}</span>
                </span>
                <span class="text-neutral-500 dark:text-neutral-400">{{ formatWeight(item.weight) }}</span>
              </li>
            </ul>
          </div>
        </ClientOnly>
      </div>

      <!-- +/- values par position -->
      <div class="p-5 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-750">
        <h2 class="text-lg font-medium text-neutral-800 dark:text-neutral-200 mb-4">+/- values par position</h2>
        <ClientOnly>
          <p v-if="!gainByPosition.length" class="text-sm text-neutral-500">Aucune donnée.</p>
          <div v-else class="dark:unovis-dark-mode">
            <ChartContainer class="h-[300px] !aspect-auto" :config="chartConfig">
              <VisXYContainer :data="gainByPosition">
                <VisGroupedBar
                    :x="(_: GainDatum, i: number) => i"
                    :y="[(d: GainDatum) => d.gain]"
                    :color="(d: GainDatum) => gainColor(d.gain)"
                    :bar-padding="0.4"
                    :bar-max-width="48"
                />
                <VisAxis
                    type="x"
                    :tick-values="gainByPosition.map((_, i) => i)"
                    :tick-format="(i: number) => gainByPosition[i]?.name"
                    :tick-line="false"
                    :domain-line="false"
                    :grid-line="false"
                />
                <VisAxis
                    type="y"
                    :num-ticks="4"
                    :tick-line="false"
                    :domain-line="false"
                    :tick-format="(v: number) => formatCurrency(v, currency)"
                />
                <ChartCrosshair
                    :template="componentToString(chartConfig, ChartTooltipContent, { labelKey: 'name' })"
                    :color="(d: GainDatum) => gainColor(d.gain)"
                />
              </VisXYContainer>
            </ChartContainer>
          </div>
        </ClientOnly>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { VisAxis, VisDonut, VisGroupedBar, VisSingleContainer, VisTooltip, VisXYContainer } from '@unovis/vue';
import { Donut } from '@unovis/ts';
import { ChartContainer, ChartCrosshair, ChartTooltipContent } from '@/components/ui/chart';
import { componentToString } from '@/components/ui/chart/utils';
import type { EnrichedPosition } from '#shared/types/market';

interface AllocationDatum {
  name: string;
  value: number;
  weight: number;
}

interface GainDatum {
  name: string;
  gain: number;
}

const props = withDefaults(defineProps<{
  positions: EnrichedPosition[];
  currency?: string;
}>(), {
  currency: 'EUR',
});

const stats = computed(() => computePortfolioStats(props.positions, props.currency));

// --- Chiffres clés ---
const cards = computed(() => [
  {
    label: 'Évaluation titres',
    value: formatCurrency(stats.value.marketValue, props.currency),
    colored: false,
    trend: null,
  },
  {
    label: 'Capital investi',
    value: formatCurrency(stats.value.invested, props.currency),
    colored: false,
    trend: null,
  },
  {
    label: '+/- values latentes',
    value: formatCurrency(stats.value.unrealizedGain, props.currency, true),
    colored: true,
    trend: stats.value.unrealizedGain,
  },
  {
    label: 'ROI (Retour sur Investissement)',
    value: formatPercent(stats.value.roi),
    colored: true,
    trend: stats.value.roi,
  },
]);

// --- Couleurs ---
const PALETTE = ['#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#06b6d4', '#ef4444', '#64748b', '#ec4899'];
const GAIN_UP = '#00a63e';
const GAIN_DOWN = '#fb2c36';

const colorAt = (i: number) => PALETTE[i % PALETTE.length]!;
const gainColor = (gain: number) => (gain >= 0 ? GAIN_UP : GAIN_DOWN);

// --- Répartition ---
const allocationData = computed<AllocationDatum[]>(() =>
    stats.value.allocation.map((a) => ({ name: a.symbol, value: a.value, weight: a.weight })),
);

const formatWeight = (w: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 }).format(w);

const donutTriggers = {
  [Donut.selectors.segment]: (d: { data: AllocationDatum }) =>
      `${d.data.name} : ${formatCurrency(d.data.value, props.currency)} (${formatWeight(d.data.weight)})`,
};

// --- +/- values par position ---
const round2 = (n: number) => Math.round(n * 100) / 100;

const gainByPosition = computed<GainDatum[]>(() =>
    props.positions
        .filter((p) => p.gainValue !== null && p.currency === props.currency)
        .map((p) => ({ name: p.symbol, gain: round2(p.gainValue!) })),
);

const chartConfig = {
  gain: {
    label: '+/- value',
    color: GAIN_UP,
    valueFormatter: (v: number) => formatCurrency(v, props.currency),
  },
};
</script>