-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "terms" TEXT,
ADD COLUMN     "valid_from" TIMESTAMP(3),
ADD COLUMN     "valid_until" TIMESTAMP(3);
