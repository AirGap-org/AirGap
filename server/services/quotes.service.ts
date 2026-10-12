import YahooFinance from 'yahoo-finance2';
import type { AssetSearchResult, MarketQuote } from '#shared/types/market';

const yahooFinance = new YahooFinance();

const ASSET_TYPE_LABELS = new Map<string, string>([
    ['EQUITY', 'Action'],
    ['ETF', 'ETF'],
    ['MUTUALFUND', 'Fonds'],
    ['INDEX', 'Indice'],
]);

export const getQuotes = defineCachedFunction(
    async (symbols: string[]): Promise<MarketQuote[]> => {
        const quotes = await yahooFinance.quote(symbols, { return: 'array' });

        return quotes.map((q) => ({
            symbol: q.symbol,
            shortName: q.shortName ?? q.longName ?? q.symbol,
            price: q.regularMarketPrice ?? null,
            currency: q.currency ?? null,
            changePercent: q.regularMarketChangePercent ?? null,
        }));
    },
    {
        name: 'quotes',
        maxAge: 60,
        getKey: (symbols: string[]) => [...symbols].sort((a, b) => a.localeCompare(b)).join(','),
    },
);

export const searchAssets = defineCachedFunction(
    async (query: string): Promise<AssetSearchResult[]> => {
        const { quotes } = await yahooFinance.search(query, { newsCount: 0, quotesCount: 20 });

        return quotes
            .flatMap((q) => {
                // Les résultats non-Yahoo (ex: Google Finance) n'ont pas les mêmes champs
                if (!('isYahooFinance' in q) || !q.isYahooFinance) return [];

                const type = ASSET_TYPE_LABELS.get(q.quoteType);
                if (!type) return [];

                return [{
                    symbol: q.symbol,
                    shortName: q.shortname ?? q.longname ?? q.symbol,
                    exchange: q.exchDisp ?? q.exchange ?? 'Marché inconnu',
                    type,
                }];
            })
            .slice(0, 8);
    },
    {
        name: 'asset-search',
        maxAge: 60 * 60,
        getKey: (query: string) => query.toLowerCase(),
    },
);