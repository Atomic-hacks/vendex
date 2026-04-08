import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

type SeedOption = {
  name: string;
  values: string[];
};

type SeedVariant = {
  sku: string;
  price: number;
  quantity: number;
  selectedValues: Record<string, string>;
};

async function createProductWithVariants(input: {
  vendorId: string;
  title: string;
  category:
    | "ELECTRONICS"
    | "FASHION"
    | "HOME"
    | "BEAUTY"
    | "LIFESTYLE"
    | "OTHER";
  description: string;
  imageUrls: string[];
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  options: SeedOption[];
  variants: SeedVariant[];
}) {
  const product = await prisma.product.create({
    data: {
      vendorId: input.vendorId,
      title: input.title,
      category: input.category,
      description: input.description,
      imageUrls: input.imageUrls,
      status: input.status ?? "PUBLISHED",
    },
  });

  const optionRecords = new Map<
    string,
    { id: string; values: Map<string, string> }
  >();

  for (const option of input.options) {
    const createdOption = await prisma.variantOption.create({
      data: {
        productId: product.id,
        name: option.name,
      },
    });

    const valueMap = new Map<string, string>();

    for (const value of option.values) {
      const createdValue = await prisma.optionValue.create({
        data: {
          optionId: createdOption.id,
          value,
        },
      });

      valueMap.set(value, createdValue.id);
    }

    optionRecords.set(option.name, {
      id: createdOption.id,
      values: valueMap,
    });
  }

  const createdVariants = [];

  for (const variant of input.variants) {
    const createdVariant = await prisma.productVariant.create({
      data: {
        productId: product.id,
        sku: variant.sku,
        price: variant.price,
        inventory: {
          create: {
            quantity: variant.quantity,
          },
        },
      },
      include: {
        inventory: true,
      },
    });

    for (const [optionName, valueName] of Object.entries(variant.selectedValues)) {
      const option = optionRecords.get(optionName);
      const valueId = option?.values.get(valueName);

      if (!valueId) {
        throw new Error(
          `Missing option value mapping for ${optionName}:${valueName} on ${variant.sku}`,
        );
      }

      await prisma.variantValue.create({
        data: {
          variantId: createdVariant.id,
          valueId,
        },
      });
    }

    createdVariants.push(createdVariant);
  }

  return {
    product,
    variants: createdVariants,
  };
}

async function main() {
  const demoPasswordHash = await bcrypt.hash("password123", 12);

  // Clean slate (safe for dev). If you have real data later, remove these.
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.variantValue.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.optionValue.deleteMany();
  await prisma.variantOption.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendorBalance.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  const buyer = await prisma.user.create({
    data: {
      email: "buyer@test.com",
      name: "Buyer One",
      passwordHash: demoPasswordHash,
      role: "BUYER",
    },
  });

  const buyerTwo = await prisma.user.create({
    data: {
      email: "buyer2@test.com",
      name: "Buyer Two",
      passwordHash: demoPasswordHash,
      role: "BUYER",
    },
  });

  const vendorUsers = await Promise.all([
    prisma.user.create({
      data: {
        email: "vendor@test.com",
        name: "Vendor One",
        passwordHash: demoPasswordHash,
        role: "VENDOR",
      },
    }),
    prisma.user.create({
      data: {
        email: "fashion@test.com",
        name: "Fashion Vendor",
        passwordHash: demoPasswordHash,
        role: "VENDOR",
      },
    }),
    prisma.user.create({
      data: {
        email: "home@test.com",
        name: "Home Vendor",
        passwordHash: demoPasswordHash,
        role: "VENDOR",
      },
    }),
  ]);

  const vendorProfiles = await Promise.all([
    prisma.vendorProfile.create({
      data: {
        userId: vendorUsers[0].id,
        storeName: "Tech Haven",
        slug: "tech-haven",
        description:
          "Performance accessories, focused setups, and desk gear for builders.",
        logoUrl:
          "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
        bannerUrl:
          "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80",
        status: "APPROVED",
      },
    }),
    prisma.vendorProfile.create({
      data: {
        userId: vendorUsers[1].id,
        storeName: "Fold Studio",
        slug: "fold-studio",
        description:
          "Modern wardrobe staples, sharp silhouettes, and color-driven drops.",
        logoUrl:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400&q=80",
        bannerUrl:
          "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80",
        status: "APPROVED",
      },
    }),
    prisma.vendorProfile.create({
      data: {
        userId: vendorUsers[2].id,
        storeName: "Nest Supply",
        slug: "nest-supply",
        description:
          "Functional home objects, warm materials, and everyday essentials.",
        logoUrl:
          "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=400&q=80",
        bannerUrl:
          "https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1200&q=80",
        status: "APPROVED",
      },
    }),
  ]);

  const keyboardBundle = await createProductWithVariants({
    vendorId: vendorProfiles[0].id,
    title: "Apex Mechanical Keyboard",
    category: "ELECTRONICS",
    description:
      "A compact mechanical keyboard with hot-swappable switches, premium case weight, and tuned acoustics for focused work sessions.",
    imageUrls: [
      "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=80",
    ],
    options: [
      { name: "Layout", values: ["75%", "TKL"] },
      { name: "Switch", values: ["Linear", "Tactile"] },
    ],
    variants: [
      {
        sku: "TECH-KEY-75-LIN",
        price: 4250000,
        quantity: 14,
        selectedValues: { Layout: "75%", Switch: "Linear" },
      },
      {
        sku: "TECH-KEY-75-TAC",
        price: 4350000,
        quantity: 9,
        selectedValues: { Layout: "75%", Switch: "Tactile" },
      },
      {
        sku: "TECH-KEY-TKL-LIN",
        price: 4550000,
        quantity: 6,
        selectedValues: { Layout: "TKL", Switch: "Linear" },
      },
      {
        sku: "TECH-KEY-TKL-TAC",
        price: 4650000,
        quantity: 4,
        selectedValues: { Layout: "TKL", Switch: "Tactile" },
      },
    ],
  });

  const monitorLight = await createProductWithVariants({
    vendorId: vendorProfiles[0].id,
    title: "Halo Monitor Light Bar",
    category: "ELECTRONICS",
    description:
      "Bias lighting and front task light in one low-profile bar designed for late-night builders and clean desk setups.",
    imageUrls: [
      "https://images.unsplash.com/photo-1527443154391-507e9dc6c5cc?auto=format&fit=crop&w=1200&q=80",
    ],
    options: [{ name: "Finish", values: ["Black", "Silver"] }],
    variants: [
      {
        sku: "TECH-LIGHT-BLK",
        price: 980000,
        quantity: 20,
        selectedValues: { Finish: "Black" },
      },
      {
        sku: "TECH-LIGHT-SLV",
        price: 1030000,
        quantity: 11,
        selectedValues: { Finish: "Silver" },
      },
    ],
  });

  const hoodieBundle = await createProductWithVariants({
    vendorId: vendorProfiles[1].id,
    title: "Studio Weight Hoodie",
    category: "FASHION",
    description:
      "Heavyweight brushed fleece hoodie with structured hood, dropped shoulders, and clean embroidery for daily wear.",
    imageUrls: [
      "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1200&q=80",
    ],
    options: [
      { name: "Color", values: ["Charcoal", "Sand"] },
      { name: "Size", values: ["S", "M", "L"] },
    ],
    variants: [
      {
        sku: "FOLD-HOOD-CHA-S",
        price: 1850000,
        quantity: 7,
        selectedValues: { Color: "Charcoal", Size: "S" },
      },
      {
        sku: "FOLD-HOOD-CHA-M",
        price: 1850000,
        quantity: 10,
        selectedValues: { Color: "Charcoal", Size: "M" },
      },
      {
        sku: "FOLD-HOOD-CHA-L",
        price: 1850000,
        quantity: 6,
        selectedValues: { Color: "Charcoal", Size: "L" },
      },
      {
        sku: "FOLD-HOOD-SND-S",
        price: 1890000,
        quantity: 5,
        selectedValues: { Color: "Sand", Size: "S" },
      },
      {
        sku: "FOLD-HOOD-SND-M",
        price: 1890000,
        quantity: 8,
        selectedValues: { Color: "Sand", Size: "M" },
      },
      {
        sku: "FOLD-HOOD-SND-L",
        price: 1890000,
        quantity: 4,
        selectedValues: { Color: "Sand", Size: "L" },
      },
    ],
  });

  const teeBundle = await createProductWithVariants({
    vendorId: vendorProfiles[1].id,
    title: "Everyday Box Tee",
    category: "FASHION",
    description:
      "Relaxed-fit cotton tee with a boxy drape and thick collar, built to layer cleanly across seasons.",
    imageUrls: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80",
    ],
    options: [
      { name: "Color", values: ["White", "Olive"] },
      { name: "Size", values: ["M", "L"] },
    ],
    variants: [
      {
        sku: "FOLD-TEE-WHT-M",
        price: 720000,
        quantity: 15,
        selectedValues: { Color: "White", Size: "M" },
      },
      {
        sku: "FOLD-TEE-WHT-L",
        price: 720000,
        quantity: 13,
        selectedValues: { Color: "White", Size: "L" },
      },
      {
        sku: "FOLD-TEE-OLV-M",
        price: 760000,
        quantity: 9,
        selectedValues: { Color: "Olive", Size: "M" },
      },
      {
        sku: "FOLD-TEE-OLV-L",
        price: 760000,
        quantity: 5,
        selectedValues: { Color: "Olive", Size: "L" },
      },
    ],
  });

  const lampBundle = await createProductWithVariants({
    vendorId: vendorProfiles[2].id,
    title: "Arc Table Lamp",
    category: "HOME",
    description:
      "Soft ambient table lamp with spun metal shade and dimmable warm light for reading corners and bedside use.",
    imageUrls: [
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    ],
    options: [{ name: "Finish", values: ["Brass", "Matte Black"] }],
    variants: [
      {
        sku: "NEST-LAMP-BRS",
        price: 2650000,
        quantity: 8,
        selectedValues: { Finish: "Brass" },
      },
      {
        sku: "NEST-LAMP-BLK",
        price: 2550000,
        quantity: 12,
        selectedValues: { Finish: "Matte Black" },
      },
    ],
  });

  const throwBundle = await createProductWithVariants({
    vendorId: vendorProfiles[2].id,
    title: "Textured Throw Blanket",
    category: "HOME",
    description:
      "Chunky woven throw with soft hand feel, designed to add warmth and texture across sofas, beds, and lounge chairs.",
    imageUrls: [
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    ],
    options: [{ name: "Color", values: ["Clay", "Stone"] }],
    variants: [
      {
        sku: "NEST-THROW-CLAY",
        price: 1450000,
        quantity: 10,
        selectedValues: { Color: "Clay" },
      },
      {
        sku: "NEST-THROW-STONE",
        price: 1450000,
        quantity: 7,
        selectedValues: { Color: "Stone" },
      },
    ],
  });

  const draftProduct = await createProductWithVariants({
    vendorId: vendorProfiles[0].id,
    title: "Prototype Desk Pad",
    category: "ELECTRONICS",
      description:
      "A draft listing used to test vendor editing and publish validation before release.",
    imageUrls: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    ],
    status: "DRAFT",
    options: [{ name: "Size", values: ["Medium", "Large"] }],
    variants: [
      {
        sku: "TECH-PAD-M",
        price: 0,
        quantity: 0,
        selectedValues: { Size: "Medium" },
      },
      {
        sku: "TECH-PAD-L",
        price: 0,
        quantity: 0,
        selectedValues: { Size: "Large" },
      },
    ],
  });

  const buyerCart = await prisma.cart.create({
    data: {
      userId: buyer.id,
    },
  });

  await prisma.cartItem.createMany({
    data: [
      {
        cartId: buyerCart.id,
        productId: keyboardBundle.product.id,
        variantId: keyboardBundle.variants[0].id,
        quantity: 1,
        priceSnapshot: keyboardBundle.variants[0].price,
      },
      {
        cartId: buyerCart.id,
        productId: hoodieBundle.product.id,
        variantId: hoodieBundle.variants[1].id,
        quantity: 2,
        priceSnapshot: hoodieBundle.variants[1].price,
      },
      {
        cartId: buyerCart.id,
        productId: lampBundle.product.id,
        variantId: lampBundle.variants[0].id,
        quantity: 1,
        priceSnapshot: lampBundle.variants[0].price,
      },
    ],
  });

  console.log("✅ Seed complete!");
  console.log({
    password: "password123",
    buyers: ["buyer@test.com", "buyer2@test.com"],
    vendors: ["vendor@test.com", "fashion@test.com", "home@test.com"],
    vendorStores: vendorProfiles.map((vendor) => ({
      storeName: vendor.storeName,
      slug: vendor.slug,
    })),
    featuredProducts: [
      keyboardBundle.product.title,
      monitorLight.product.title,
      hoodieBundle.product.title,
      teeBundle.product.title,
      lampBundle.product.title,
      throwBundle.product.title,
      `${draftProduct.product.title} (draft)`,
    ],
    buyerCartId: buyerCart.id,
    buyerTwoId: buyerTwo.id,
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
