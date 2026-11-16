import {z} from 'zod';
import {deleteCategory} from "#server/services/categories.service";
import {getErrorCode, getErrorStatusCode} from "#server/utils/errors";

const paramsSchema = z.object({
    id: z.string().uuid({message: "ID de catégorie invalide"})
});

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);

    const params = await getValidatedRouterParams(event, (p) => paramsSchema.safeParse(p));
    if (!params.success) throw createError({statusCode: 400, message: 'ID invalide'});

    try {
        const deletedCategory = await deleteCategory(params.data.id, user.id);

        return {
            success: true,
            message: 'Catégorie supprimée avec succès',
            deletedId: deletedCategory?.id
        };

    } catch (error) {
        if (getErrorCode(error) === '23503') {
            throw createError({
                statusCode: 409,
                message: 'Impossible de supprimer cette catégorie car elle est utilisée dans des transactions ou budgets.'
            });
        }

        if (getErrorStatusCode(error)) throw error;

        console.error('Erreur suppression:', error);
        throw createError({statusCode: 500, message: 'Erreur serveur'});
    }
});