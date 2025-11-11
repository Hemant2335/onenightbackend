/*
  Warnings:

  - You are about to drop the column `code` on the `Coupon` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Coupon" DROP COLUMN "code";

-- CreateTable
CREATE TABLE "UserCoupon" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "coupon_template_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "is_redeemed" BOOLEAN NOT NULL DEFAULT false,
    "redeemed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCoupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCoupon_code_key" ON "UserCoupon"("code");

-- CreateIndex
CREATE INDEX "UserCoupon_user_id_idx" ON "UserCoupon"("user_id");

-- CreateIndex
CREATE INDEX "UserCoupon_ticket_id_idx" ON "UserCoupon"("ticket_id");

-- CreateIndex
CREATE INDEX "UserCoupon_code_idx" ON "UserCoupon"("code");

-- CreateIndex
CREATE INDEX "UserCoupon_coupon_template_id_idx" ON "UserCoupon"("coupon_template_id");

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCoupon" ADD CONSTRAINT "UserCoupon_coupon_template_id_fkey" FOREIGN KEY ("coupon_template_id") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
