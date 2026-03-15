import prisma from "../src/lib/prisma";

async function main() {
  const deleted = await prisma.shop.deleteMany({
    where: { slug: { in: ["sharp-and-co", "ember-and-oak", "iron-works-auto"] } },
  });
  console.log(`Deleted ${deleted.count} demo shops.`);
  await prisma.$disconnect();
}

main().catch(console.error);
