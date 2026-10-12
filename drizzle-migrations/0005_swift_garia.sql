CREATE TABLE "portfolio" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	"pru" numeric(14, 4) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_quantity_positive" CHECK ("portfolio"."quantity" > 0),
	CONSTRAINT "portfolio_pru_non_negative" CHECK ("portfolio"."pru" >= 0),
	CONSTRAINT "portfolio_symbol_uppercase" CHECK ("portfolio"."symbol" = upper("portfolio"."symbol"))
);
--> statement-breakpoint
ALTER TABLE "portfolio" ADD CONSTRAINT "portfolio_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_user_symbol_uidx" ON "portfolio" USING btree ("user_id","symbol");