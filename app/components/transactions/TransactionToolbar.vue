<template>
  <div class="flex items-center gap-4">
    <Button
        class="cursor-pointer text-white border-neutral-200 dark:border-neutral-750 bg-primary-700 hover:bg-primary-500"
        :disabled="isPredicting || isParsing"
        title="Les libellés de transactions sont envoyés au service IA externe"
        aria-label="Catégorisation automatique par IA externe"
        @click="$emit('predict-all')"
    >
      <Sparkles class="h-4 w-4 stroke-[2]"/>
      <span class="hidden sm:inline">Catégorisation automatique</span>
    </Button>

    <div
        class="flex items-center bg-white dark:bg-neutral-800 rounded-xl px-4 py-1.5 border border-neutral-200 dark:border-neutral-750 shadow-xl focus-within:border-primary-500/50 transition-all duration-300">
      <Search class="h-4 w-4 text-neutral-400 mr-2 flex-shrink-0"/>
      <Input
          :model-value="searchQuery"
          type="text"
          placeholder="Rechercher..."
          aria-label="Rechercher des transactions"
          class="bg-transparent border-none text-sm outline-none placeholder:text-neutral-500 text-neutral-900 dark:text-neutral-100 transition-all duration-300 ease-in-out w-32 sm:w-48 focus:w-48 sm:focus:w-80"
          @update:model-value="$emit('update:searchQuery', $event)"
      />
    </div>

    <div class="h-6 w-[1px] bg-neutral-200 dark:bg-neutral-800 mx-1"/>

    <div class="hidden md:block min-w-[180px]">
      <Select :model-value="selectedAccountId" @update:model-value="$emit('update:selectedAccountId', $event)">
        <SelectTrigger class="w-full">
          <SelectValue placeholder="Compte d'import" />
        </SelectTrigger>
        <SelectContent class="bg-white dark:bg-neutral-900">
          <SelectItem
              v-for="account in accounts.filter((item) => !item.isArchived)"
              :key="account.id"
              :value="account.id"
              class="cursor-pointer"
          >
            {{ account.accountName }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <input
        ref="fileInput"
        type="file"
        accept=".csv"
        aria-label="Importer un fichier CSV"
        class="hidden"
        @change="onFileSelected"
    >
    <Button
        class="cursor-pointer text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-all duration-200 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center active:scale-90"
        :disabled="isParsing"
        title="Importer CSV"
        @click="fileInput?.click()"
    >
      <ArrowUpFromLine class="h-5 w-5 stroke-[2]"/>
    </Button>

    <Button
        class="cursor-pointer text-white border-neutral-200 dark:border-neutral-750 bg-primary-700 hover:bg-primary-500"
        @click="$emit('create')"
    >
      <PlusIcon class="h-4 w-4 stroke-[3]"/>
      <span class="hidden sm:inline">Nouvelle transaction</span>
    </Button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { ArrowUpFromLine, PlusIcon, Search, Sparkles } from 'lucide-vue-next'

defineProps({
  searchQuery: {
    type: String,
    default: ''
  },
  isParsing: {
    type: Boolean,
    default: false
  },
  isPredicting: {
    type: Boolean,
    default: false
  },
  accounts: {
    type: Array,
    default: () => []
  },
  selectedAccountId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:searchQuery', 'update:selectedAccountId', 'file-selected', 'create', 'predict-all'])
const fileInput = ref(null)

const onFileSelected = (event) => {
  const file = event.target.files?.[0]
  if (file) emit('file-selected', file)
}
</script>
