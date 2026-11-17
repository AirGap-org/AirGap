import {defineEventHandler} from 'h3';
import {z} from 'zod';
import {eq, isNull, or} from 'drizzle-orm';
import {db} from "#server/db";
import {categories} from "~~/drizzle/schema";
import {requireAuth} from "#server/utils/auth";
import {assertCategoriesOwnership} from "#server/utils/categories";
import {enforceRateLimit} from "#server/utils/rateLimit";
import {mapWithConcurrency} from "#server/utils/concurrency";
import { useRuntimeConfig } from '#imports';

const getAiPredictUrl = () => {
    const config = useRuntimeConfig();
    return config.ai?.predictUrl || process.env.AIRGAP_AI_PREDICT_URL || 'https://airgap-ai.aldwin-weber.fr/predire';
};

const classifySchema = z.object({
    transactions: z.array(z.object({
        description: z.string().trim().max(1000).optional(),
        amount: z.union([z.number().finite(), z.string().max(64)]).optional(),
        selectedCategoryId: z.string().uuid().nullable().optional(),
        typeTransaction: z.enum(["depense", "revenu", "non_categorise"]).optional()
    }).passthrough()).min(1).max(500, "Trop de transactions à classer")
});

const normalizeCategoryName = (value = '') => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' et ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const findBestCategoryMatch = (prediction: string, candidates: Array<{ id: string, name: string, typeTransaction: string }>) => {
    const normalizedPrediction = normalizeCategoryName(prediction);
    const predictionTokens = normalizedPrediction.split(/\s+/).filter(Boolean);

    return candidates
        .map((category) => {
            const normalizedCategory = normalizeCategoryName(category.name);
            const categoryTokens = normalizedCategory.split(/\s+/).filter(Boolean);

            let score = 0;
            if (normalizedCategory === normalizedPrediction) score += 100;

            predictionTokens.forEach((token) => {
                if (categoryTokens.includes(token)) score += 10;
            });

            categoryTokens.forEach((token) => {
                if (predictionTokens.includes(token)) score += 5;
            });

            if (normalizedPrediction.includes(normalizedCategory) || normalizedCategory.includes(normalizedPrediction)) {
                score += 25;
            }

            return { category, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)[0]?.category;
};

const resolvePredictedCategoryId = async (userId: string, categoryName: string, typeTransaction: 'depense' | 'revenu' | 'non_categorise') => {
    const availableCategories = await db.select({
        id: categories.id,
        name: categories.name,
        typeTransaction: categories.typeTransaction
    })
        .from(categories)
        .where(or(eq(categories.userId, userId), isNull(categories.userId)));

    const exactMatch = availableCategories.find((category) =>
        normalizeCategoryName(category.name) === normalizeCategoryName(categoryName)
    );

    if (exactMatch) return exactMatch.id;

    const sameTypeCategories = availableCategories.filter((category) => category.typeTransaction === typeTransaction);
    const bestMatch = findBestCategoryMatch(categoryName, sameTypeCategories);
    if (bestMatch) return bestMatch.id;

    const fallback = availableCategories.find((category) => {
        const normalized = normalizeCategoryName(category.name);
        if (typeTransaction === 'non_categorise') {
            return normalized.includes('non categorise') || normalized.includes('virement');
        }
        return false;
    });

    if (fallback) return fallback.id;

    return null;
};

type TransactionToClassify = {
    description?: string
    amount?: number | string
    typeTransaction?: 'depense' | 'revenu' | 'non_categorise'
}

const predictCategoryForTransaction = async (transaction: TransactionToClassify, userId: string) => {
    const description = String(transaction.description || '').trim();
    const amount = Number(transaction.amount ?? 0);
    const typeTransaction = transaction.typeTransaction || (amount >= 0 ? 'revenu' : 'depense');

    if (!description) return null;

    try {
        const response = await fetch(getAiPredictUrl(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                libelle: description,
                montant: amount
            }),
            signal: AbortSignal.timeout(5_000)
        });

        const text = await response.text();

        if (text.length > 20_000) {
            console.warn('Réponse IA trop volumineuse pour la transaction CSV');
            return null;
        }

        if (!response.ok) {
            console.warn('Erreur IA pour la transaction CSV:', response.status);
            return null;
        }

        const payload = text ? JSON.parse(text) : {};
        const predictedCategory = payload?.categorie || payload?.category || payload?.categoryName || payload?.nomCategorie;
        if (!predictedCategory) return null;

        return await resolvePredictedCategoryId(
            userId,
            String(predictedCategory),
            typeTransaction
        );
    } catch (error) {
        console.warn('Prédiction IA indisponible pour la transaction CSV:', error);
        return null;
    }
};

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);

    await enforceRateLimit('classify', user.id, 30)

    const result = await readValidatedBody(event, (body) => classifySchema.safeParse(body));

    if (!result.success) {
        throw createError({statusCode: 400, message: 'Données invalides'});
    }

    const {transactions} = result.data;

    await assertCategoriesOwnership(
        transactions
            .map(transaction => transaction.selectedCategoryId)
            .filter((categoryId): categoryId is string => Boolean(categoryId)),
        user.id
    )

    const config = useRuntimeConfig()
    const aiEnabled = config.ai?.enabled !== false

    const fallback = (tx: typeof transactions[number]) => ({
        ...tx,
        typeTransaction: tx.typeTransaction || (Number(tx.amount ?? 0) >= 0 ? 'revenu' : 'depense'),
        selectedCategoryId: tx.selectedCategoryId ?? null,
        status: 'ready' as const
    })

    if (!aiEnabled) {
        return {
            transactions: transactions.map(fallback),
            aiEnabled: false
        }
    }

    const enrichedTransactions = await mapWithConcurrency(transactions, 3, async (tx) => {
        if (tx.selectedCategoryId) {
            return { ...tx, status: 'ready' as const };
        }

        const predictedCategoryId = await predictCategoryForTransaction(tx, user.id);
        if (predictedCategoryId) {
            return { ...tx, selectedCategoryId: predictedCategoryId, status: 'ready' as const };
        }

        return fallback(tx)
    });

    return { transactions: enrichedTransactions, aiEnabled: true };
});