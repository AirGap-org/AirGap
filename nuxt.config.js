export default defineNuxtConfig({
    compatibilityDate: "2026-03-05",
    devtools: {enabled: process.env.NODE_ENV !== "production"},
    css: ["~/assets/css/styles.css"],
    modules: ["@nuxt/ui", "nuxt-auth-utils", "@nuxt/eslint", "shadcn-nuxt", "@vite-pwa/nuxt"],

    shadcn: {
        prefix: '',
        componentDir: './app/components/ui'
    },

    runtimeConfig: {
        appSecret: process.env.NUXT_APP_SECRET || '',
        databaseUrl: '',
        // N'activer QUE derrière un reverse proxy de confiance (nginx/Traefik)
        // qui strip le X-Forwarded-For entrant. Sinon l'IP client reste lue
        // depuis le socket (non spoofable).
        trustProxyHeaders: process.env.TRUST_PROXY_HEADERS === 'true',
        rateLimit: {
            maxAttempts: Number(process.env.RATE_LIMIT_MAX_ATTEMPTS) || 5,
            lockoutMinutes: Number(process.env.RATE_LIMIT_LOCKOUT_MINUTES) || 15,
        },
        session: {
            maxAge: 60 * 60 * 24 * 30,
            cookie: {
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/',
            },
        },
        ai: {
            enabled: process.env.AI_ENABLED !== 'false',
            predictUrl: process.env.AIRGAP_AI_PREDICT_URL || 'https://airgap-ai.aldwin-weber.fr/predire',
        },
        oauth: {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
            github: {
                clientId: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
            }
        }
    },

    vite: {
        resolve: {
            alias: {
                crypto: "node:crypto",
            },
        },
    },

    app: {
        head: {
            bodyAttrs: {
                class: "font-sans",
            },
             link: [
                 { rel: "manifest", href: "/manifest.webmanifest" },
                 { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192x192.png" },
                 { rel: "icon", type: "image/png", sizes: "512x512", href: "/icons/icon-512x512.png" },
             ]
        }
    },

    pwa: {
        injectRegister: 'auto',
        registerType: 'autoUpdate',
         client: {
            installPrompt: true,
         },
         manifest: {
            "name": "AirGap",
            "short_name": "AirGap",
            "description": "AirGap was born from a simple desire: to enable sound and tamper-proof money management. Thanks to a local and encrypted architecture, you alone retain total control over your finances.",
            "lang": "fr",
            "start_url": "/",
            "display": "standalone",
            "icons": [
                {
                "src": "icons/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png"
                },
                {
                "src": "icons/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png"
                }
            ],
                "background_color": "#0f172b",
                "theme_color": "#16a34a"
         },
         generateSW: {
            navigateFallback: '/',
         },
         devOptions: {
            enabled: false,
                type: 'module',
            }
         },

    nitro: {
        replace: {
            'typeof window': '`undefined`',
        }
    }
});