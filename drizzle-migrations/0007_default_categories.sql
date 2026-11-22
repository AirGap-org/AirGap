-- Catégories globales par défaut (idempotent).
INSERT INTO "categories" ("name", "type_transaction", "user_id", "isDefault")
SELECT v.name, v.type::"typeTransactionEnum", NULL, true
FROM (
    VALUES
        ('Salaire & Pro', 'revenu'),
        ('Aides & Pensions', 'revenu'),
        ('Alimentation & Quotidien', 'depense'),
        ('Logement & Factures', 'depense'),
        ('Loisirs & Achats', 'depense'),
        ('Transports', 'depense'),
        ('Virements', 'non_categorise'),
        ('Non catégorisé', 'non_categorise')
) AS v(name, type)
WHERE NOT EXISTS (
    SELECT 1
    FROM "categories" c
    WHERE c."user_id" IS NULL
      AND lower(c."name") = lower(v.name)
);
