ALTER TABLE "accounts" ADD COLUMN "accountTypeLabel" varchar(255);--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "isArchived" boolean DEFAULT false NOT NULL;--> statement-breakpoint

-- Normalise les anciens types de comptes.
UPDATE "accounts" SET "accountType" = 'courant'
WHERE lower("accountType") IN ('courant', 'compte courant', 'compte_courant');--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'livret_a'
WHERE lower("accountType") IN ('livret_a', 'livret a');--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'livret_jeune'
WHERE lower("accountType") IN ('livret_jeune', 'livret jeune');--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'assurance_vie'
WHERE lower("accountType") IN ('assurance_vie', 'assurance vie');--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'pea' WHERE lower("accountType") = 'pea';--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'cto' WHERE lower("accountType") IN ('cto', 'compte titre', 'compte-titre');--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'ldds' WHERE lower("accountType") = 'ldds';--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'lep' WHERE lower("accountType") = 'lep';--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'pel' WHERE lower("accountType") = 'pel';--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'cel' WHERE lower("accountType") = 'cel';--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'crypto' WHERE lower("accountType") = 'crypto';--> statement-breakpoint
UPDATE "accounts" SET "accountType" = 'autre' WHERE lower("accountType") = 'autre';--> statement-breakpoint

-- Tout type inconnu devient un type personnalisé "autre".
UPDATE "accounts"
SET "accountTypeLabel" = COALESCE("accountTypeLabel", "accountType"),
    "accountType" = 'autre'
WHERE "accountType" NOT IN (
  'courant', 'livret_a', 'livret_jeune', 'ldds', 'lep', 'pel', 'cel',
  'pea', 'cto', 'assurance_vie', 'crypto', 'autre'
);--> statement-breakpoint

-- Crée un compte par défaut pour chaque utilisateur qui n'en a pas.
INSERT INTO "accounts" ("userId", "accountName", "accountType", "balance", "currency")
SELECT u."id", 'Compte Courant', 'courant', 0, 'EUR'
FROM "users" u
WHERE NOT EXISTS (
  SELECT 1 FROM "accounts" a WHERE a."userId" = u."id"
);--> statement-breakpoint

-- Rattache les transactions existantes au compte par défaut.
UPDATE "transactions" t
SET "accountId" = (
  SELECT a."id"
  FROM "accounts" a
  WHERE a."userId" = t."userId"
  ORDER BY a."createdAt" ASC, a."id" ASC
  LIMIT 1
)
WHERE t."accountId" IS NULL;--> statement-breakpoint

-- Rattache les budgets existants au compte par défaut.
UPDATE "budgets" b
SET "accountId" = (
  SELECT a."id"
  FROM "accounts" a
  WHERE a."userId" = b."userId"
  ORDER BY a."createdAt" ASC, a."id" ASC
  LIMIT 1
)
WHERE b."accountId" IS NULL;--> statement-breakpoint

ALTER TABLE "budgets" ALTER COLUMN "accountId" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "accounts_user_archived_idx" ON "accounts" USING btree ("userId","isArchived");