-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "coupon_template_id" TEXT;

-- CreateTable
CREATE TABLE "CouponTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "discount" DOUBLE PRECISION,
    "image_url" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "terms" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponTemplate_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_coupon_template_id_fkey" FOREIGN KEY ("coupon_template_id") REFERENCES "CouponTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
