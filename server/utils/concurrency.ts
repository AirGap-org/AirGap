/**
 * Exécute une fonction asynchrone sur chaque élément avec une limite de concurrence.
 * Préserve l'ordre des résultats.
 */
export const mapWithConcurrency = async <T, R>(
    items: readonly T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>
): Promise<R[]> => {
    const results = new Array<R>(items.length)
    let nextIndex = 0

    const worker = async () => {
        while (nextIndex < items.length) {
            const index = nextIndex++
            const item = items[index]

            if (item !== undefined) {
                results[index] = await fn(item, index)
            }
        }
    }

    const workerCount = Math.max(1, Math.min(limit, items.length))
    await Promise.all(Array.from({ length: workerCount }, worker))

    return results
}
