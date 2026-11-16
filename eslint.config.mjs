import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
    {
        // Composants générés par shadcn : les props optionnelles n'ont pas
        // vocation à être dupliquées avec une valeur par défaut.
        files: ['app/components/ui/**/*.vue'],
        rules: {
            'vue/require-default-prop': 'off',
        },
    },
    {
        // Les emits de ce projet utilisent le camelCase (ex. update:isOpen).
        rules: {
            'vue/v-on-event-hyphenation': 'off',
        },
    },
)
