import { ProductCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma"
import type { CatalogCategoryFilter, CatalogSortOption } from "@/lib/catalog";

export async function getMarketplaceProducts(filters?: {
  search?: string
  vendorId?: string      // reused by vendor storefront
  category?: ProductCategory | CatalogCategoryFilter
  sort?: CatalogSortOption
}) {
  console.log("[getMarketplaceProducts] called with filters:", filters)

  const products = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      vendor: { status: "APPROVED" },
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
      ...(filters?.vendorId && {
        vendorId: filters.vendorId,
      }),
      ...(filters?.category && filters.category !== "ALL" && {
        category: filters.category,
      }),
    },
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      imageUrls: true,
      vendor: {
        select: {
          id: true,
          storeName: true,
          slug: true,
          logoUrl: true,
        },
      },
      variants: {
        orderBy: { price: "asc" },
        take: 1,           // cheapest variant for card display
        select: {
          id: true,
          price: true,
          inventory: { select: { quantity: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  const sortedProducts = [...products];

  switch (filters?.sort) {
    case "price_asc":
      sortedProducts.sort(
        (a, b) => (a.variants[0]?.price ?? Number.MAX_SAFE_INTEGER) - (b.variants[0]?.price ?? Number.MAX_SAFE_INTEGER),
      );
      break;
    case "price_desc":
      sortedProducts.sort(
        (a, b) => (b.variants[0]?.price ?? -1) - (a.variants[0]?.price ?? -1),
      );
      break;
    case "name_asc":
      sortedProducts.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "newest":
    default:
      break;
  }

  console.log("[getMarketplaceProducts] returned", sortedProducts.length, "products")
  return sortedProducts
}

export async function getMarketplaceProductById(productId: string) {
  return prisma.product.findFirst({
    where: {
      id: productId,
      status: "PUBLISHED",
      vendor: {
        status: "APPROVED",
      },
    },
    include: {
      vendor: {
        select: {
          id: true,
          storeName: true,
          slug: true,
          logoUrl: true,
          description: true,
        },
      },
      variantOptions: {
        include: {
          values: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      },
      variants: {
        include: {
          inventory: true,
          values: {
            include: {
              value: {
                include: {
                  option: true,
                },
              },
            },
          },
        },
        orderBy: {
          price: "asc",
        },
      },
    },
  });
}
