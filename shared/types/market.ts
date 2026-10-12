export interface MarketQuote {
    symbol: string;
    shortName: string;
    price: number | null;
    currency: string | null;
    changePercent: number | null;
}

export interface AssetSearchResult {
    symbol: string;
    shortName: string;
    exchange: string;
    type: string;
}

export interface Position {
    symbol: string;
    quantity: number;
    pru: number;
}

export interface EnrichedPosition extends Position {
    shortName: string;
    currency: string;
    price: number | null;
    changePercent: number | null;
    totalValue: number | null;
    gainValue: number | null;
    gainPercent: number | null;
}