import crypto from 'node:crypto';
import { isWeakSecret } from './secrets';

const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';
const IV_LENGTH = 12;
const V2_PREFIX = 'v2';
const KEY = process.env.ENCRYPTION_KEY || '';

if (isWeakSecret(KEY)) {
    throw new Error(
        "🚨 Erreur Critique : ENCRYPTION_KEY est manquante ou trop faible (32 caractères minimum). " +
        "Générez-la avec `openssl rand -base64 32`."
    );
}

/**
 * Clé dédiée au format v2, dérivée de ENCRYPTION_KEY via HKDF.
 * L'ancien format (v1) utilisait directement les 32 premiers octets de la clé.
 */
const V2_KEY = Buffer.from(crypto.hkdfSync(
    'sha256',
    Buffer.from(KEY, 'utf8'),
    Buffer.from('airgap-encryption', 'utf8'),
    Buffer.from('v2', 'utf8'),
    32,
));

const encrypt = (text: string, key: Buffer): string => {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', ENCODING);
    encrypted += cipher.final(ENCODING);

    const tag = cipher.getAuthTag().toString(ENCODING);

    return `${iv.toString(ENCODING)}:${tag}:${encrypted}`;
};

const decrypt = (payload: string, key: Buffer): string => {
    const parts = payload.split(':');

    if (parts.length !== 3) {
        throw new Error('Format de données chiffrées invalide');
    }

    const [ivPart, tagPart, encryptedText] = parts;

    if (!ivPart || !tagPart || !encryptedText) {
        throw new Error('Données chiffrées incomplètes');
    }

    const iv = Buffer.from(ivPart, ENCODING);
    const tag = Buffer.from(tagPart, ENCODING);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedText, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

/**
 * Chiffre un texte avec le format v2 (clé dérivée + Auth Tag).
 */
export const encryptText = (text: string): string => {
    if (!text) return '';

    return `${V2_PREFIX}:${encrypt(text, V2_KEY)}`;
};

/**
 * Déchiffre un texte v2 ou l'ancien format v1 (compatibilité ascendante).
 */
export const decryptText = (text: string): string => {
    if (!text?.includes(':')) return text;

    try {
        if (text.startsWith(`${V2_PREFIX}:`)) {
            return decrypt(text.slice(V2_PREFIX.length + 1), V2_KEY);
        }

        // Ancien format : la clé brute devait faire exactement 32 octets.
        const legacyKey = Buffer.from(KEY, 'utf8');
        if (legacyKey.length !== 32) {
            throw new Error('ENCRYPTION_KEY ne permet pas de déchiffrer les données v1 (32 octets requis)');
        }

        return decrypt(text, legacyKey);
    } catch (error) {
        console.error('Erreur de déchiffrement réelle :', error);
        return 'Donnée protégée';
    }
};
