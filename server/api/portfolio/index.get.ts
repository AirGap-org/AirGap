import { listPositions } from '#server/services/portfolio.service';

export default defineEventHandler(async (event) => {
    const { user } = await requireUserSession(event);
    return await listPositions(user.id);
});