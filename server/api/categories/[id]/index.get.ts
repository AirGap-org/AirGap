import {z} from 'zod';
import {getCategoryById} from "#server/services/categories.service";
import {getErrorStatusCode} from "#server/utils/errors";

const paramsSchema = z.object({
    id: z.string().uuid({message: "ID de catégorie invalide"})
});

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);

    const params = await getValidatedRouterParams(event, (p) => paramsSchema.safeParse(p));
    if (!params.success) {
        throw createError({statusCode: 400, message: 'ID invalide'});
    }

    try {
        const category = await getCategoryById(params.data.id, user.id);

        if (!category) {
            throw createError({statusCode: 404, message: 'Catégorie introuvable'});
        }

        return {success: true, category};
    } catch (error) {
        if (getErrorStatusCode(error)) throw error;
        throw createError({statusCode: 500, message: 'Erreur serveur'});
    }
});