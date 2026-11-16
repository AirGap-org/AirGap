import {getAllCategories} from "#server/services/categories.service";

export default defineEventHandler(async (event) => {
    const user = await requireAuth(event);
    const query = getQuery(event);
    const typeValue = Array.isArray(query.type) ? query.type[0] : query.type;
    const typeEnum = typeValue === 'depense' || typeValue === 'revenu' || typeValue === 'non_categorise'
        ? typeValue
        : undefined;

    try {
        const data = await getAllCategories(user.id, typeEnum);

        return {
            success: true,
            categories: data
        };
    } catch (error) {
        console.error("Erreur récupération catégories:", error);
        throw createError({statusCode: 500, message: "Erreur serveur"});
    }
});