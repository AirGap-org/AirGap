import { z } from 'zod';
import { removePosition } from '#server/services/portfolio.service';

const paramsSchema = z.object({
    symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9^][A-Z0-9.=^-]{0,14}$/),
});

export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event);
    const { symbol } = await getValidatedRouterParams(event, paramsSchema.parse);

    if (!(await removePosition(user.id, symbol))) {
        throw createError({ statusCode: 404, statusMessage: 'Position introuvable' });
    }
    setResponseStatus(event, 204);
});