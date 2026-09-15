import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seeds a couple of categories and products so you have something to test
 * the catalog/checkout endpoints against immediately after migrating.
 * Run with: npx prisma db seed  (configured via package.json's "prisma.seed" field)
 */
async function main() {
  const electronics = await prisma.category.upsert({
    where: { name: "Electronics" },
    update: {},
    create: { name: "Electronics" },
  });

  const clothing = await prisma.category.upsert({
    where: { name: "Clothing" },
    update: {},
    create: { name: "Clothing" },
  });

  await prisma.product.createMany({
    data: [
      {
        name: "Wireless Mouse",
        description: "Ergonomic wireless mouse",
        price: 24.99,
        stock: 50,
        categoryId: electronics.id,
      },
      {
        name: "Mechanical Keyboard",
        description: "RGB mechanical keyboard",
        price: 79.99,
        stock: 30,
        categoryId: electronics.id,
      },
      {
        name: "Cotton T-Shirt",
        description: "Plain cotton t-shirt",
        price: 14.99,
        stock: 100,
        categoryId: clothing.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
