CREATE TABLE "receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"image_key" text NOT NULL,
	"merchant_name" text,
	"total_amount" numeric(10, 2),
	"currency" varchar(3) DEFAULT 'USD',
	"receipt_date" text,
	"raw_ai_response" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "receipt_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric(10, 3) DEFAULT '1',
	"unit_price" numeric(10, 2),
	"total_price" numeric(10, 2)
);
--> statement-breakpoint
ALTER TABLE "receipt" ADD CONSTRAINT "receipt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_item" ADD CONSTRAINT "receipt_item_receipt_id_receipt_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipt"("id") ON DELETE cascade ON UPDATE no action;