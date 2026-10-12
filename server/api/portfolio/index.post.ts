import { z } from 'zod';
import { addPosition } from '#server/services/portfolio.service';

const SYMBOL_PATTERN = /^[A-Z0-9^][A-Z0-9.=^-]{0,14}$/;

const bodySchema = z.object({
    symbol: z.string().trim().toUpperCase().regex(SYMBOL_PATTERN),
    quantity: z.number().positive().max(100_000_000),
    pru: z.number().nonnegative().max(100_000_000),
});

export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event);
    const body = await readValidatedBody(event, bodySchema.parse);  

    await addPosition(user.id, body);
    setResponseStatus(event, 201);
});