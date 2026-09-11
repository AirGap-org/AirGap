<template>
  <div v-if="loggedIn">
    <header class="fixed inset-x-0 top-0 mx-auto w-full max-w-6xl z-50 bg-white dark:bg-neutral-900 border border-t-0 border-neutral-200 dark:border-neutral-750 rounded-b-lg shadow-xl transition-colors duration-300">
      <div class="px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">

          <div class="flex items-center">
            <Button class="text-xl font-semibold text-primary-600 dark:text-primary-600">
              <NuxtLink to="/">AirGap</NuxtLink>
            </Button>
          </div>

          <nav aria-label="naviguation bar for desktop AirGap" class="hidden lg:flex items-center space-x-20">
            <Button class="nav-link" active-class="nav-link-active">
              <NuxtLink to="/" >Tableau de bord</NuxtLink>
            </Button>
            <Button class="nav-link" active-class="nav-link-active">
              <NuxtLink to="/transactions">Transactions</NuxtLink>
            </Button>
            <Button class="nav-link" active-class="nav-link-active">
              <NuxtLink to="/budget">Budgets</NuxtLink>
            </Button>
            <Button class="nav-link" active-class="nav-link-active">
              <NuxtLink to="/settings">Paramètres</NuxtLink>
            </Button>
          </nav>

          <div class="flex items-center space-x-2">

            <Button
                class="cursor-pointer p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                @click="toggleTheme">
              <Sun v-if="isDarkTheme" />
              <Moon v-else />
            </Button>

            <div class="hidden lg:flex items-center space-x-2">
              <template v-if="loggedIn">
                <div class="relative">
                  <Button
                      class="cursor-pointer flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      @click="toggleDropdown">
                    <span class="text-sm text-neutral-700 dark:text-neutral-300 hover:text-primary-500">{{
                        user?.name || 'Utilisateur'
                      }}</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 text-neutral-700 dark:text-neutral-300 transition-transform"
                        :class="{ 'rotate-180': isDropdownOpen }" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </Button>
                  <div v-if="isDropdownOpen"
                      class="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 rounded-md overflow-hidden shadow-xl border border-neutral-200 dark:border-neutral-750">
                    <Button class="w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-primary-500 dark:hover:bg-neutral-800 transition-colors">
                    <NuxtLink
                        to="/profile"
                        @click="isDropdownOpen = false">Mon profil
                    </NuxtLink>
                    </Button>
                    <Button class="w-full px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:text-primary-500 dark:hover:bg-neutral-800 transition-colors">
                    <NuxtLink
                        to="/about"
                        @click="isDropdownOpen = false">À propos
                    </NuxtLink>
                    </Button>
                    <Button
                        class="cursor-pointer w-full px-4 py-2 text-sm text-primary-550 hover:text-primary-500 dark:hover:bg-neutral-800 transition-colors"
                        @click="logout">Déconnexion
                    </Button>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </header>

    <nav
        aria-label="naviguation menu for mobile version of AirGap"
        class="lg:hidden fixed bottom-0 left-0 w-full z-50 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
      <div class="flex justify-around items-center h-16 pb-2">
        <NuxtLink
            to="/"
            class="flex flex-col items-center justify-center w-full h-full text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            active-class="text-primary-600 dark:text-primary-400 font-medium"
        >
          <Home class="w-5 h-5 mb-1"/>
          <span class="text-[10px] uppercase tracking-wider">Accueil</span>
        </NuxtLink>
        <NuxtLink
            to="/transactions"
            class="flex flex-col items-center justify-center w-full h-full text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            active-class="text-primary-600 dark:text-primary-400 font-medium"
        >
          <ArrowRightLeft class="w-5 h-5 mb-1"/>
          <span class="text-[10px] uppercase tracking-wider">Transactions</span>
        </NuxtLink>
        <NuxtLink
            to="/budget"
            class="flex flex-col items-center justify-center w-full h-full text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            active-class="text-primary-600 dark:text-primary-400 font-medium"
        >
          <PieChart class="w-5 h-5 mb-1"/>
          <span class="text-[10px] uppercase tracking-wider">Budgets</span>
        </NuxtLink>
        <NuxtLink
            to="/profile"
            class="flex flex-col items-center justify-center w-full h-full text-neutral-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            active-class="text-primary-600 dark:text-primary-400 font-medium"
        >
          <User class="w-5 h-5 mb-1"/>
          <span class="text-[10px] uppercase tracking-wider">Profil</span>
        </NuxtLink>
      </div>
    </nav>
  </div>
</template>

<script setup>
import {ref, watch, onMounted, onUnmounted} from 'vue';
import {Home, ArrowRightLeft, PieChart, User, Sun, Moon} from 'lucide-vue-next'
import { Button } from '~/components/ui/button';

const {loggedIn, user, clear: clearSession} = useUserSession();
const isDarkTheme = ref(false);
const isDropdownOpen = ref(false);

const closeDropdown = (event) => {
  if (isDropdownOpen.value && !event.target.closest('.relative')) {
    isDropdownOpen.value = false;
  }
};

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

async function logout() {
  await clearSession()
  await navigateTo('/login')
}

onMounted(() => {
  isDarkTheme.value = document.documentElement.classList.contains('dark');
  document.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown);
});

function toggleTheme() {
  const html = document.documentElement;
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    isDarkTheme.value = false;
    localStorage.setItem('theme', 'light');
  } else {
    html.classList.add('dark');
    isDarkTheme.value = true;
    localStorage.setItem('theme', 'dark');
  }
}

watch(() => globalThis.location?.href, () => {
  isDropdownOpen.value = false;
});
</script>

<style scoped>
@reference "@/assets/css/styles.css";

.nav-link {
  @apply px-3 py-2 text-sm rounded-md text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 dark:hover:bg-neutral-800 transition-colors;
}

.nav-link-active {
  @apply text-primary-600 dark:text-primary-400 font-medium;
}

.mobile-nav-link {
  @apply block px-3 py-3 text-base rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors;
}

.mobile-nav-link-active {
  @apply bg-neutral-100 dark:bg-neutral-800 text-primary-600 dark:text-primary-400 font-medium;
}
</style>