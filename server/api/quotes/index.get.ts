import { z } from 'zod';
import { getQuotes } from '#server/services/quotes.service';

const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.=^-]{0,14}$/;

const querySchema = z.object({
    symbols: z
        .string()
        .transform((s) => [...new Set(s.split(',').map((x) => x.trim().toUpperCase()))])
        .pipe(z.array(z.string().regex(SYMBOL_PATTERN)).min(1).max(20)),
});

export default defineEventHandler(async (event) => {
    await requireUserSession(event);

    const { symbols } = await getValidatedQuery(event, querySchema.parse);

    try {
        return await getQuotes(symbols);
    } catch (error) {
        console.error('[quotes] Yahoo Finance indisponible :', error);
        throw createError({ statusCode: 502, statusMessage: 'Service de cotations indisponible' });
    }
});