import { useRuntimeConfig } from '#imports'

/**
 * Validation des secrets et de la configuration critique au démarrage du serveur.
 *
 * - Refuse de démarrer si un secret est manquant ou trop faible, évitant qu'un
 *   déploiement oublie de surcharger les valeurs par défaut (ex. NUXT_APP_SECRET
 *   composé de zéros dans .env.example).
 * - Avertit en production si TRUST_PROXY_HEADERS n'est pas explicitement défini,
 *   car dans ce cas getClientIP() renvoie l'IP socket — derrière un reverse proxy
 *   (nginx/Traefik, fréquent en conteneur), tous les utilisateurs partagent la
 *   même IP apparente → le rate-limit login verrouille tout le monde après
 *   5 tentatives cumulées (DoS auto-infligé silencieux).
 */
const isProduction = process.env.NODE_ENV === 'production'

export default defineNitroPlugin(() => {
    const config = useRuntimeConfig()

    // --- Secret de session ---
    const appSecret = config.appSecret as string | undefined

    if (!appSecret || appSecret.length < 32) {
        throw new Error(
            '🚨 ERREUR CRITIQUE : NUXT_APP_SECRET doit faire au moins 32 caractères. ' +
            'Générez une valeur aléatoire forte (ex. `openssl rand -base64 32`).'
        )
    }

    // Valeur par défaut documentée dans .env.example : refus explicite.
    if (/^0+$/.test(appSecret)) {
        throw new Error(
            '🚨 ERREUR CRITIQUE : NUXT_APP_SECRET contient la valeur par défaut. ' +
            'Générez une valeur aléatoire forte avant de déployer.'
        )
    }

    // --- Configuration du proxy / IP client ---
    // process.env est lu ici car la variable peut ne pas être mappée dans runtimeConfig
    // si l'opérateur oublie de la déclarer — c'est justement le cas à détecter.
    const trustProxyRaw = process.env.TRUST_PROXY_HEADERS

    if (isProduction && trustProxyRaw === undefined) {
        console.warn(
            '⚠️  SÉCURITÉ / RATE-LIMIT : TRUST_PROXY_HEADERS n\'est pas défini.\n' +
            '    Si l\'app est derrière un reverse proxy (nginx/Traefik) en production,\n' +
            '    tous les utilisateurs partageront la même IP apparente → le rate-limit\n' +
            '    login agrègera tout le monde sous une seule clé et verrouillera l\'app\n' +
            '    après 5 tentatives échouées cumulées (DoS auto-infligé).\n' +
            '    Définissez TRUST_PROXY_HEADERS=true UNIQUEMENT si votre proxy strip\n' +
            '    le X-Forwarded-For entrant. Sinon laissez false (IP socket, non spoofable).'
        )
    }
})
