import { prisma } from "@/lib/prisma";

export async function getCartByUserId(userId: string) {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              status: true,
              vendor: {
                select: {
                  storeName: true,
                  slug: true,
                },
              },
            },
          },
          variant: {
            include: {
              inventory: true,
              values: {
                include: {
                  value: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
