-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "description" TEXT,
ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
