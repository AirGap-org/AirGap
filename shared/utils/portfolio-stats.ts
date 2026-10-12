import type { Position } from '#shared/types/market.ts';

// =============================================================================
// 1. STATISTIQUES DU PORTEFEUILLE
// =============================================================================

export interface PricedPosition extends Position {
    price: number | null;
    currency: string;
}

export interface AllocationItem {
    symbol: string;
    value: number;
    weight: number;
}

export interface PortfolioStats {
    marketValue: number;
    invested: number;
    unrealizedGain: number;
    roi: number | null;
    allocation: AllocationItem[];
    unpriced: string[];
    otherCurrency: string[];
}

export const computePortfolioStats = (
    positions: PricedPosition[],
    baseCurrency = 'EUR',
): PortfolioStats => {
    const unpriced: string[] = [];
    const otherCurrency: string[] = [];
    const valued: { symbol: string; value: number; invested: number }[] = [];

    for (const p of positions) {
        if (p.currency !== baseCurrency) {
            otherCurrency.push(p.symbol);
        } else if (p.price === null) {
            unpriced.push(p.symbol);
        } else {
            valued.push({ symbol: p.symbol, value: p.price * p.quantity, invested: p.pru * p.quantity });
        }
    }

    const marketValue = valued.reduce((sum, v) => sum + v.value, 0);
    const invested = valued.reduce((sum, v) => sum + v.invested, 0);
    const unrealizedGain = marketValue - invested;

    return {
        marketValue,
        invested,
        unrealizedGain,
        roi: invested > 0 ? (unrealizedGain / invested) * 100 : null,
        allocation: valued
            .map((v) => ({ symbol: v.symbol, value: v.value, weight: marketValue > 0 ? v.value / marketValue : 0 }))
            .sort((a, b) => b.value - a.value),
        unpriced,
        otherCurrency,
    };
};

// =============================================================================
// 2a. MWR : taux de rendement interne pondéré par les flux (XIRR)
// =============================================================================

export interface CashFlow {
    date: Date;

    amount: number;
}

export const xirr = (flows: CashFlow[]): number | null => {
    if (!flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return null;

    const t0 = Math.min(...flows.map((f) => f.date.getTime()));
    const yearsFromStart = (d: Date) => (d.getTime() - t0) / (365 * 86_400_000);
    const npv = (rate: number) =>
        flows.reduce((sum, f) => sum + f.amount / (1 + rate) ** yearsFromStart(f.date), 0);

    let lo = -0.99;
    let hi = 10;
    let npvLo = npv(lo);
    if (npvLo * npv(hi) > 0) return null;

    for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        const npvMid = npv(mid);
        if (Math.abs(npvMid) < 1e-7) return mid;
        if (npvLo * npvMid < 0) {
            hi = mid;
        } else {
            lo = mid;
            npvLo = npvMid;
        }
    }
    return (lo + hi) / 2;
};

// =============================================================================
// 2b. TWR : rendement pondéré par le temps (neutralise l'effet des versements)
// =============================================================================

export interface ValuationPoint {
    date: Date;
    value: number;
    flow: number;
}

export const twr = (series: ValuationPoint[]): number | null => {
    let growth = 1;
    let periods = 0;

    for (let i = 1; i < series.length; i++) {
        const previous = series[i - 1]!;
        const current = series[i]!;
        if (previous.value <= 0) continue;

        growth *= (current.value - current.flow) / previous.value;
        periods++;
    }

    return periods > 0 ? (growth - 1) * 100 : null;
};

// =============================================================================
// 3. SIMULATION : RETRAITE ET INDÉPENDANCE FINANCIÈRE
// =============================================================================

export interface ProjectionInput {
    currentCapital: number;
    monthlyContribution: number;
    annualReturn: number;
    annualInflation: number;
    years: number;
}

export interface ProjectionPoint {
    year: number;
    nominal: number;
    real: number;
    contributed: number;
}

const monthlyRate = (annual: number) => (1 + annual) ** (1 / 12) - 1;

export const projectGrowth = (input: ProjectionInput): ProjectionPoint[] => {
    const { currentCapital, monthlyContribution, annualReturn, annualInflation, years } = input;
    const rate = monthlyRate(annualReturn);

    let balance = currentCapital;
    const points: ProjectionPoint[] = [
        { year: 0, nominal: balance, real: balance, contributed: currentCapital },
    ];

    for (let year = 1; year <= years; year++) {
        for (let month = 0; month < 12; month++) {
            balance = balance * (1 + rate) + monthlyContribution;
        }
        points.push({
            year,
            nominal: balance,
            real: balance / (1 + annualInflation) ** year,
            contributed: currentCapital + monthlyContribution * 12 * year,
        });
    }

    return points;
};

export const fireTarget = (annualExpenses: number, withdrawalRate = 0.04): number =>
    annualExpenses / withdrawalRate;

export const monthsToTarget = (
    input: Omit<ProjectionInput, 'years'>,
    realTarget: number,
    maxYears = 80,
): number | null => {
    const rate = monthlyRate(input.annualReturn);
    const inflation = monthlyRate(input.annualInflation);

    let balance = input.currentCapital;
    for (let month = 0; month <= maxYears * 12; month++) {
        if (balance / (1 + inflation) ** month >= realTarget) return month;
        balance = balance * (1 + rate) + input.monthlyContribution;
    }
    return null;
};