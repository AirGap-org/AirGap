ALTER TABLE "users" ADD COLUMN "session_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "asso_accounts_category_idx" ON "assoAccountsCategories" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "asso_budget_category_idx" ON "assoBudgetCategories" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "asso_transactions_category_idx" ON "assoTransactionsCategories" USING btree ("categoryId");--> statement-breakpoint
CREATE INDEX "budgets_user_idx" ON "budgets" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "budgets_account_idx" ON "budgets" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_user_name_idx" ON "categories" USING btree ("user_id","name");--> statement-breakpoint
UPDATE "users" SET "email" = lower("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_deleted_at_idx" ON "users" USING btree ("deletedAt");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("userId","date");--> statement-breakpoint
CREATE INDEX "transactions_user_type_idx" ON "transactions" USING btree ("userId","typeTransaction");--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("accountId");--> statement-breakpoint
CREATE INDEX "sender_recipient_account_idx" ON "senderRecipient" USING btree ("accountId");