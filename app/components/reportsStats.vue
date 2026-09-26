<template>
  <div>

      <div class="flex justify-center mb-10 w-full">
        <div
            class="bg-gray-50 dark:bg-neutral-800/50 p-1.5 shadow-xl rounded-lg flex flex-wrap justify-center items-center gap-2 border border-gray-200 dark:border-neutral-750 backdrop-blur-sm z-20 w-full sm:w-auto">
          <Button
              v-for="p in ['month', 'quarter', 'year']"
              :key="p"
              class="cursor-pointer flex-1 sm:flex-none px-2 sm:px-6 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ease-out whitespace-nowrap"
              :class="period === p
                ? 'bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-md transform scale-105'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'"
              @click="changePeriod(p)"
          >
            {{ p === 'month' ? 'Mois' : p === 'quarter' ? 'Trimestre' : 'Année' }}
          </Button>
          <template v-for="type in activePeriodSelectors" :key="type.key">
            <div class="hidden sm:block h-4 w-px bg-gray-300 dark:bg-neutral-600 mx-1"/>
            <div class="relative w-full sm:w-auto mt-2 sm:mt-0">
              <Button
                  class="cursor-pointer flex items-center justify-between sm:justify-start w-full sm:w-auto gap-2 px-4 py-2 text-sm font-bold text-primary-600 dark:bg-neutral-750 rounded-lg shadow-md transition-all"
                  @click="type.toggleMenu()"
              >
                {{ type.label }}
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform"
                     :class="type.isOpen ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clip-rule="evenodd"/>
                </svg>
              </Button>
              <div v-if="type.isOpen"
                   class="absolute top-full mt-2 right-0 w-full sm:w-32 bg-white dark:bg-neutral-700 rounded-lg shadow-xl border border-gray-100 dark:border-neutral-750 overflow-hidden z-50">
                <Button
                    v-for="option in type.options"
                    :key="option.value"
                    class="cursor-pointer w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                    :class="type.isSelected(option.value) ? 'text-primary-600 font-bold bg-indigo-50 dark:bg-neutral-700/50' : 'text-neutral-600 dark:text-neutral-300'"
                    @click="type.select(option.value)"
                >
                  {{ option.label }}
                </Button>
              </div>
            </div>
          </template>
        </div>
      </div>

      <Card
          class="card mb-8 p-8 bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-gray-100 dark:border-neutral-750 duration-300">
        <CardHeader>
          <CardTitle class="text-neutral-900 dark:text-white">Cashflow</CardTitle>
          <CardDescription class="text-neutral-500 dark:text-neutral-400 mt-1">Visualisation des mouvements
            financiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientOnly>
            <div v-if="cleanTransactions.length === 0" class="flex items-center justify-center">
              <p>Aucune donnée.</p>
            </div>
            <div v-else class="flex flex-col h-full w-full dark:unovis-dark-mode">
              <div class="relative w-full h-[420px] sm:h-[480px] lg:h-[560px] overflow-x-auto overflow-y-hidden rounded-lg px-1 sm:px-0">
                <ChartContainer class="h-full w-[780px] min-w-[780px] sm:w-full sm:min-w-0 !aspect-auto" :config="chartConfig">
                  <VisSingleContainer :data="cashFlow" class="h-full w-full sankeyGraph">
                    <VisSankey
                        :node-id="(d) => d.id"
                        :node-label="(d) => d.label"
                        :source="(d) => d.source"
                        :target="(d) => d.target"
                        :value="(d) => d.value"
                        :node-color="(d) => ({
                                               income: THEME.colors.income,
                                               expense: THEME.colors.expense,
                                               budget: THEME.colors.balance
                        }[d.type])"
                        :node-width="20"
                        :node-padding="12"
                        :node-horizontal-spacing="170"
                        :label-fit="'wrap'"
                        :label-max-width="220"
                        :label-force-word-break="true"
                    />
                    <ChartTooltip/>
                  </VisSingleContainer>
                </ChartContainer>
              </div>
            </div>
          </ClientOnly>
        </CardContent>
      </Card>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card
            class="bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-gray-100 dark:border-neutral-750 transition-shadow duration-300">
          <CardHeader>
            <CardTitle class="text-neutral-900 dark:text-white tracking-tight">Revenus vs Dépenses</CardTitle>
            <CardDescription class="text-neutral-500 dark:text-neutral-400">Comparatif des volumes</CardDescription>
          </CardHeader>
          <CardContent>
            <ClientOnly>
              <div v-if="incomeVsExpensesData.length === 0" class="flex items-center justify-center">
                <p>Aucune donnée pour cette période.</p>
              </div>
              <div v-else class="flex flex-col h-full w-full dark:unovis-dark-mode">
                <ChartContainer class="h-[350px]" :config="chartConfig">
                  <VisXYContainer :data="incomeVsExpensesData">
                    <VisGroupedBar
                        :key="period"
                        :x="(d, i) => i"
                        :y="[(d) => d.income, (d) => d.expense]"
                        :color="(d, i) => (i === 0 ? d.income : d.expense) > 0 ? [THEME.colors.income, THEME.colors.expense][i] : 'transparent'"
                        :groupPadding="0"
                        :barPadding="0.4"
                        :barMaxWidth="40"
                    />
                    <VisAxis
                        type="x"
                        :tick-values="incomeVsExpensesData.map((_, i) => i).filter(i => period !== 'month' || i % 5 === 0 || i === incomeVsExpensesData.length - 1)"
                        :tick-format="(i) => incomeVsExpensesData[i]?.dateLabel"
                        :tick-line="false"
                        :domain-line="false"
                        :grid-line="false"
                    />
                    <VisAxis type="y" :num-ticks="3" :tick-line="false" :domain-line="false" :tick-format="formatEuro"/>
                    <ChartTooltip/>
                    <ChartCrosshair
                        :template="componentToString(chartConfig, ChartTooltipContent, { labelKey: 'dateLabel' })"
                        :color="(d, i) => [THEME.colors.income, THEME.colors.expense][i]"
                    />
                  </VisXYContainer>
                </ChartContainer>
              </div>
            </ClientOnly>
          </CardContent>
        </Card>

        <Card
            class="bg-white dark:bg-neutral-900 rounded-lg shadow-xl border border-gray-100 dark:border-neutral-750 transition-shadow duration-300">
          <CardHeader>
            <CardTitle class="text-neutral-900 dark:text-white tracking-tight">Solde du compte</CardTitle>
            <CardDescription class="text-neutral-500 dark:text-neutral-400">Évolution du solde réel</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer class="h-[350px]" :config="chartConfig">
              <VisXYContainer :data="currentYearBalanceData">
                <VisArea :x="(d, i) => i" :y="[(d) => d.balance]" :color="() => chartConfig.income.color"
                         :opacity="0.3"/>
                <VisLine :x="(d, i) => i" :y="[(d) => d.balance]" :color="() => chartConfig.income.color"
                         :line-width="2.5"/>
                <VisAxis type="x" :tick-line="false" :domain-line="false" :grid-line="false" :num-ticks="6"
                         :tick-format="(d, i) => currentYearBalanceData[i]?.dateLabel"/>
                <VisAxis type="y" :num-ticks="5" :tick-line="false" :domain-line="false" :tick-format="formatEuro"/>
                <ChartTooltip/>
                <ChartCrosshair
                    :template="componentToString(chartConfig, ChartTooltipContent, { labelKey: 'dateLabel' })"
                    :color="() => THEME.colors.income"
                />
              </VisXYContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
  </div>
</template>

<script setup>
import {ref, computed} from 'vue';
import {VisArea, VisAxis, VisLine, VisXYContainer, VisSankey, VisSingleContainer, VisGroupedBar} from "@unovis/vue";
import {ChartContainer, ChartCrosshair, ChartTooltip, ChartTooltipContent} from "@/components/ui/chart";
import {componentToString} from "@/components/ui/chart/utils";

const formatEuro = (value) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2
}).format(value);

const THEME = {colors: {balance: '#94a3b8', income: '#00a63e', expense: '#fb2c36'}};

const chartConfig = {
  balance: {
    label: "Solde",
    color: THEME.colors.income,
    valueFormatter: formatEuro
  },
  income: { label: "Revenus", color: THEME.colors.income, valueFormatter: formatEuro },
  expense: { label: "Dépenses", color: THEME.colors.expense, valueFormatter: formatEuro },
};

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const CURRENT_QUARTER = Math.floor(new Date().getMonth() / 3) + 1;

const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const quarterLabels = {1: "Jan. - Mars", 2: "Avr. - Juin", 3: "Juil. - Sept.", 4: "Oct. - Déc."};

const period = ref('month');
const selectedYear = ref(CURRENT_YEAR);
const selectedMonth = ref(CURRENT_MONTH);
const selectedQuarter = ref(CURRENT_QUARTER);

const isYearMenuOpen = ref(false);
const isMonthMenuOpen = ref(false);
const isQuarterMenuOpen = ref(false);

const {data: anneesData} = await useFetch('/api/calendar/years');
const {data: trimestresData} = await useFetch('/api/calendar/quarters');
const {data: moisData} = await useFetch('/api/calendar/months');

const {data: transactionsData} = await useFetch('/api/calendar/', {
  key: 'dynamic-transactions',
  query: {
    year: selectedYear,
    month: computed(() => period.value === 'month' ? selectedMonth.value : undefined),
    quarter: computed(() => period.value === 'quarter' ? selectedQuarter.value : undefined),
  }
});

const {data: transactionsFixed2026Data} = await useFetch('/api/calendar/', {
  key: 'fixed-balance',
  query: {year: CURRENT_YEAR},
});

const activePeriodSelectors = computed(() => {
  if (period.value === 'year') return [{
    key: 'year', label: selectedYear.value, isOpen: isYearMenuOpen.value,
    toggleMenu: () => isYearMenuOpen.value = !isYearMenuOpen.value,
    options: (anneesData.value?.years || []).map(y => ({value: y, label: y})),
    isSelected: (v) => Number(selectedYear.value) === Number(v),
    select: (v) => {
      selectedYear.value = v;
      isYearMenuOpen.value = false;
    },
  }];
  if (period.value === 'month') return [{
    key: 'month', label: monthNames[selectedMonth.value - 1], isOpen: isMonthMenuOpen.value,
    toggleMenu: () => isMonthMenuOpen.value = !isMonthMenuOpen.value,
    options: [...(moisData.value?.months || [])].sort((a, b) => a - b).map(m => ({value: m, label: monthNames[m - 1]})),
    isSelected: (v) => Number(selectedMonth.value) === Number(v),
    select: (v) => {
      selectedMonth.value = v;
      isMonthMenuOpen.value = false;
    },
  }];
  if (period.value === 'quarter') return [{
    key: 'quarter', label: quarterLabels[selectedQuarter.value], isOpen: isQuarterMenuOpen.value,
    toggleMenu: () => isQuarterMenuOpen.value = !isQuarterMenuOpen.value,
    options: (trimestresData.value?.quarters || []).map(q => ({value: q, label: quarterLabels[q]})),
    isSelected: (v) => Number(selectedQuarter.value) === Number(v),
    select: (v) => {
      selectedQuarter.value = v;
      isQuarterMenuOpen.value = false;
    },
  }];
  return [];
});

const changePeriod = (p) => {
  if (period.value === p) return;
  period.value = p;
  selectedYear.value = CURRENT_YEAR;
  selectedMonth.value = CURRENT_MONTH;
  selectedQuarter.value = CURRENT_QUARTER;
};

const cleanTransactions = computed(() =>
    (transactionsData.value?.transactions || [])
        .map(t => ({
          ...t,
          categoryName: t.category?.name || t.categoryName || 'Autre',
          dateObj: new Date(t.date),
          amount: Math.abs(Number(t.amount)),
          typeStr: t.typeStr || (Number(t.amount) >= 0 ? 'income' : 'expense'),
        }))
        .sort((a, b) => a.dateObj - b.dateObj)
);

const incomeVsExpensesData = computed(() => {
  const grouped = new Map();

  if (period.value === 'year') {
    for (let i = 0; i < 12; i++)
      grouped.set(new Date(selectedYear.value, i, 1).toLocaleString('fr-FR', {month: 'short'}), {
        income: 0,
        expense: 0
      });
  } else if (period.value === 'quarter') {
    const start = (selectedQuarter.value - 1) * 3;
    for (let i = 0; i < 3; i++)
      grouped.set(new Date(selectedYear.value, start + i, 1).toLocaleString('fr-FR', {month: 'short'}), {
        income: 0,
        expense: 0
      });
  } else {
    const days = new Date(selectedYear.value, selectedMonth.value, 0).getDate();
    for (let i = 1; i <= days; i++)
      grouped.set(new Date(selectedYear.value, selectedMonth.value - 1, i).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit'
      }), {income: 0, expense: 0});
  }

  cleanTransactions.value.forEach(t => {
    const key = period.value === 'month'
        ? t.dateObj.toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'})
        : t.dateObj.toLocaleString('fr-FR', {month: 'short'});

    if (grouped.has(key)) {
      const entry = grouped.get(key);
      if (t.typeStr === 'income' || t.typeTransactionsId === 1) entry.income += t.amount;
      else entry.expense += t.amount;
    }
  });

  return Array.from(grouped, ([dateLabel, values]) => ({dateLabel, ...values}))
      .filter(d => d.income > 0 || d.expense > 0);
});

const cashFlow = computed(() => {
  if (import.meta.server || !cleanTransactions.value.length) return {nodes: [], links: []};

  const nodes = [{id: 'center_budget', label: 'Mon Budget', type: 'budget'}];
  const links = [];
  const expenseCats = {};
  const incomeCats = {};

  cleanTransactions.value.forEach(t => {
    const cat = t.categoryName === 'Budget' ? 'Budget (Cat)' : t.categoryName;

    if (t.typeStr === 'income' || t.typeTransactionsId === 1) {
      incomeCats[cat] = (incomeCats[cat] || 0) + t.amount;
    } else {
      expenseCats[cat] = (expenseCats[cat] || 0) + t.amount;
    }
  });

  Object.entries(incomeCats).forEach(([name, value]) => {
    const id = `${name}_in`;
    nodes.push({id, label: name, type: 'income'});
    links.push({source: id, target: 'center_budget', value});
  });

  Object.entries(expenseCats).forEach(([name, value]) => {
    const id = `${name}_out`;
    nodes.push({id, label: name, type: 'expense'});
    links.push({source: 'center_budget', target: id, value});
  });

  return {nodes, links};
});

const currentYearBalanceData = computed(() => {
  const source = transactionsFixed2026Data.value?.transactions || [];
  const initial = transactionsFixed2026Data.value?.initialBalance || 0;
  if (!source.length && initial === 0) return [];

  let running = initial;
  const map = new Map();
  map.set(new Date(selectedYear.value, 0, 1).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'}), initial);

  const sortedSource = [...source].sort((a, b) => new Date(a.date) - new Date(b.date));

  sortedSource.forEach(t => {
    const amount = Math.abs(Number(t.amount));

    if (t.typeTransaction === 'depense' || t.typeStr === 'expense') {
      running -= amount;
    } else {
      running += amount;
    }

    if (new Date(t.date).getFullYear() === selectedYear.value)
      map.set(new Date(t.date).toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'}), running);
  });

  return Array.from(map, ([dateLabel, balance]) => ({dateLabel, balance}));
});
</script>
<style>
.sankeyGraph {
  height: 100%;
  width: 100%;
  min-height: 100%;
}

.sankeyGraph svg {
  overflow: visible;
}

.sankeyGraph g rect {
  transition: opacity 0.2s ease;
}

.sankeyGraph path {
  opacity: 0.45;
  transition: opacity 0.3s ease;
}

html.dark .sankeyGraph path {
  opacity: 0.15 !important;
}

html.dark .sankeyGraph text {
  fill: #ffffff !important;
}

.sankeyGraph text {
  font-size: 10px;
  letter-spacing: 0.01em;
}

rect[height="0"],
rect[height^="0."],
rect:not([height]) {
  display: none !important;
}

g[class*="bar"] rect {
  stroke-width: 0 !important;
  rx: 4px;
}

@media (min-width: 640px) {
  .sankeyGraph text {
    font-size: 12px;
  }
}

html.dark {
  --vis-axis-grid-color: rgba(255, 255, 255, 0.05);
  --vis-axis-textColor: rgba(255, 255, 255, 0.5);
}
</style>
