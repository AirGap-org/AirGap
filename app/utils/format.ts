export const formatCurrency = (val: number | null, currency = 'EUR', signed = false): string =>
    val === null
        ? '–'
        : new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency,
            signDisplay: signed ? 'exceptZero' : 'auto',
        }).format(val);

export const formatPercent = (val: number | null): string =>
    val === null
        ? '–'
        : new Intl.NumberFormat('fr-FR', {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            signDisplay: 'exceptZero',
        }).format(val / 100);

type Trend = 'none' | 'up' | 'down';

const getTrend = (val: number | null): Trend => {
    if (val === null) return 'none';
    return val >= 0 ? 'up' : 'down';
};

const TREND_TEXT_CLASSES: Record<Trend, string> = {
    none: 'text-neutral-500',
    up: 'text-green-600 dark:text-green-500',
    down: 'text-red-500',
};

const TREND_BG_CLASSES: Record<Trend, string> = {
    none: 'bg-neutral-100 dark:bg-neutral-800',
    up: 'bg-green-50 dark:bg-green-900/10',
    down: 'bg-red-50 dark:bg-red-900/10',
};

export const trendTextClass = (val: number | null): string => TREND_TEXT_CLASSES[getTrend(val)];

export const trendBgClass = (val: number | null): string => TREND_BG_CLASSES[getTrend(val)];