-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('ELECTRONICS', 'FASHION', 'HOME', 'BEAUTY', 'LIFESTYLE', 'OTHER');

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "category" "ProductCategory" NOT NULL DEFAULT 'OTHER';
