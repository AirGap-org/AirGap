import {drizzle} from 'drizzle-orm/node-postgres';
import {Pool} from 'pg';
import * as schema from '../drizzle/schema/index';
import {useRuntimeConfig} from '#imports';


const config = useRuntimeConfig();
const connectionString = config.databaseUrl;

if (!connectionString) {
    throw new Error("❌ ERREUR : La variable databaseUrl est VIDE. Vérifiez NUXT_DATABASE_URL dans les variables d'environment.");
}

const pool = new Pool({
    connectionString: connectionString,
    max: Number(process.env.DB_POOL_MAX) || 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
    query_timeout: 10_000,
    application_name: 'airgap',
});

pool.on('error', (err) => {
    // Un client idle peut être coupé par le serveur DB : on ne tue pas le process,
    // la pool recréera une connexion à la prochaine requête.
    console.error('❌ Erreur inattendue sur un client de la pool DB :', err);
});

export const db = drizzle(pool, {schema});

const RETRY_DELAY_MS = 5000;
const MAX_RETRY_DELAY_MS = 30_000;
let retryDelay = RETRY_DELAY_MS;

async function connectWithRetry() {
    let client;
    try {
        client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        retryDelay = RETRY_DELAY_MS;
        console.log("🔌 Connexion DB OK !");
    } catch (err) {
        if (client) client.release();
        console.error(`❌ Échec de la connexion DB (nouvel essai dans ${retryDelay / 1000}s) :`, err);
        setTimeout(connectWithRetry, retryDelay);
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
    }
}

connectWithRetry();

let isShuttingDown = false;

const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`Arrêt reçu (${signal}), fermeture de la pool DB...`);

    try {
        await pool.end();
    } catch (error) {
        console.error('Erreur lors de la fermeture de la pool DB :', error);
    } finally {
        process.exit(0);
    }
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
