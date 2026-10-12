import { z } from 'zod';
import { searchAssets } from '#server/services/quotes.service';

const querySchema = z.object({
    q: z.string().trim().min(2).max(50),
});

export default defineEventHandler(async (event) => {
    await requireUserSession(event);

    const { q } = await getValidatedQuery(event, querySchema.parse);

    try {
        return await searchAssets(q);
    } catch (error) {
        console.error('[quotes/search] Yahoo Finance indisponible :', error);
        throw createError({ statusCode: 502, statusMessage: 'Service de recherche indisponible' });
    }
});