import {z} from 'zod';
import {createCategory} from "#server/services/categories.service";
import {getErrorCode} from "#server/utils/errors";

const createCategorySchema = z.object({
    name: z.string({message: "Le nom est requis"})
        .min(1, "Le nom ne peut pas être vide"),

    typeTransaction: z.enum(["depense", "revenu", "non_categorise"], {
        message: "Le type de transaction est requis"
    }),

    isDefault: z.boolean().optional().default(false)
});

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);

    const body = await readValidatedBody(event, (b) => createCategorySchema.safeParse(b));

    if (!body.success) {
        throw createError({statusCode: 400, message: body.error.issues[0]?.message});
    }

    try {
        const newCategory = await createCategory({
            ...body.data,
            userId: user.id
        });

        return {
            success: true,
            category: newCategory
        };

    } catch (error) {
        if (getErrorCode(error) === '23505') {
            throw createError({statusCode: 409, message: `La catégorie "${body.data.name}" existe déjà.`});
        }
        if (getErrorCode(error) === '23503') {
            throw createError({statusCode: 400, message: "Type de catégorie invalide."});
        }

        console.error('Erreur création catégorie:', error);
        throw createError({statusCode: 500, message: 'Erreur serveur lors de la création'});
    }
});