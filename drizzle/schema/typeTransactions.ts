import {pgEnum} from "drizzle-orm/pg-core";

export const typeTransactionEnum = pgEnum("typeTransactionEnum", [
    "depense",
    "revenu",
    "non_categorise",
]);

export type TransactionType = (typeof typeTransactionEnum.enumValues)[number];
