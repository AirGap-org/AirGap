import {z} from 'zod';
import {updateCategory} from "#server/services/categories.service";
import {getErrorCode, rethrowIfHttpError} from "#server/utils/errors";

const paramsSchema = z.object({
    id: z.string().uuid({message: "ID de catégorie invalide"})
});

const updateCategorySchema = z.object({
    name: z.string().trim().min(1).max(255).optional(),
    typeTransaction: z.enum(["depense", "revenu", "non_categorise"]).optional()
});

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const params = await getValidatedRouterParams(event, (p) => paramsSchema.safeParse(p));
    if (!params.success) throw createError({statusCode: 400, message: params.error.issues[0]?.message});

    const body = await readValidatedBody(event, (b) => updateCategorySchema.safeParse(b));
    if (!body.success) throw createError({statusCode: 400, message: body.error.issues[0]?.message});

    if (Object.keys(body.data).length === 0) {
        return {success: true, message: "Aucune modification demandée"};
    }

    try {
        const updatedCategory = await updateCategory(params.data.id, user.id, body.data);

        if (!updatedCategory) {
            throw createError({statusCode: 404, message: 'Catégorie introuvable'});
        }
        return {success: true, category: updatedCategory};
    } catch (error) {
        rethrowIfHttpError(error)
        if (getErrorCode(error) === '23505') {
            throw createError({statusCode: 409, message: "Ce nom de catégorie existe déjà."});
        }
        console.error('Erreur mise à jour:', error);
        throw createError({statusCode: 500, message: 'Impossible de modifier la catégorie'});
    }
});