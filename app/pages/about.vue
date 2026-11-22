<template>
  <div class="py-8">
    <div class="w-full">
      <div>
        <h1 class="text-4xl font-black tracking-tighter mb-10">À propos</h1>
      </div>

      <div class="card mb-8 shadow-xl border border-neutral-750">
        <h2 class="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-50">L'Origine du projet</h2>
        <p class="text-neutral-700 dark:text-neutral-300 mb-4">
          AirGap est né d'une volonté simple : permettre une gestion de l'argent saine et inviolable. Grâce à une
          architecture chiffrée et locale, vous seul gardez le contrôle total sur vos finances.
        </p>
        <p class="text-neutral-700 dark:text-neutral-300">
          Je suis convaincu que la gestion de patrimoine doit être transparente et accessible à tous, sans compromis.
          C'est pourquoi j'ai conçu AirGap comme l'alternative Open Source aux solutions traditionnelles : pour vous
          libérer des abonnements coûteux et des regards indiscrets.
        </p>
      </div>

      <div class="card mb-8 shadow-xl border border-neutral-750">
        <h2 class="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-50">La Philosophie</h2>
        <p class="text-neutral-700 dark:text-neutral-300">
          Contrairement aux géants du secteur, AirGap n'a pas été conçu pour générer du profit à tout prix, mais pour
          résoudre un problème personnel. Derrière ce code, il n'y a qu'une seule personne : un développeur passionné
          qui refusait de choisir entre gérer ses finances et protéger sa vie privée.
        </p>
      </div>

      <div class="card shadow-xl border border-neutral-750">
        <h2 class="text-2xl font-semibold mb-4 text-neutral-900 dark:text-neutral-50">Rejoindre la communauté</h2>
        <p class="text-neutral-700 dark:text-neutral-300 mb-6">
          AirGap est un projet vivant. Vous avez repéré un bug ? Vous voulez proposer une amélioration ? Le code est
          ouvert, la discussion aussi. Rejoignez-moi sur GitLab pour ouvrir une issue ou proposer une merge request.
        </p>
        <div class="flex flex-col sm:flex-row gap-4">
          <Button
              class="cursor-pointer btn btn-primary text-primary-50 bg-primary-500 hover:bg-primary-600 focus:ring-primary-300 transition-colors">
            <NuxtLink to="https://gitlab.com/Akahira/AirGap">GitLab</NuxtLink>
          </Button>
          <Button
              class="cursor-pointer btn btn-outline text-primary-50 bg-primary-500 hover:bg-primary-600 focus:ring-primary-300 transition-colors">
            <NuxtLink to="https://discord.gg/XD3B7bUUPC">Discord</NuxtLink>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
useHead({
  title: 'AirGap | À propos',
})
</script>
