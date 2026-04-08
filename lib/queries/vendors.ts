import { prisma } from "@/lib/prisma";

export async function getVendorBySlug(slug: string) {
  return prisma.vendorProfile.findUnique({
    where: { slug },
    select: {
      id: true,
      storeName: true,
      description: true,
      logoUrl: true,
      bannerUrl: true,
      status: true,
      slug: true,
    }
  });
}