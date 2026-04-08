import { prisma } from "@/lib/prisma";

export async function getBuyerOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId },
    include: {
      payment: true,
      items: {
        include: {
          product: {
            select: {
              title: true,
            },
          },
          vendor: {
            select: {
              storeName: true,
              slug: true,
            },
          },
          variant: {
            include: {
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
    orderBy: { createdAt: "desc" },
  });
}

export async function getVendorOrderItems(vendorId: string) {
  return prisma.orderItem.findMany({
    where: { vendorId },
    include: {
      order: {
        include: {
          user: {
            select: {
              email: true,
              name: true,
            },
          },
          payment: true,
        },
      },
      product: {
        select: {
          title: true,
        },
      },
      variant: {
        include: {
          values: {
            include: {
              value: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
