import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // 1. Create some Avatars
  const avatars = await Promise.all([
    prisma.avatar.create({ data: { name: "Warrior", imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Warrior" } }),
    prisma.avatar.create({ data: { name: "Mage", imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Mage" } }),
    prisma.avatar.create({ data: { name: "Rogue", imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Rogue" } }),
  ]);

  // 2. Create basic elements (Static and Non-Static)
  const wall = await prisma.element.create({
    data: { width: 1, height: 1, static: true, imageUrl: "https://png.pngtree.com/png-vector/20220805/ourmid/pngtree-stone-wall-brick-pixel-art-png-image_6098748.png" }
  });

  const chair = await prisma.element.create({
    data: { width: 1, height: 1, static: false, imageUrl: "https://static.vecteezy.com/system/resources/previews/021/691/590/non_2x/pixel-art-chair-icon-free-vector.jpg" }
  });

  console.log("Database seeded successfully!");
}
//@ts-ignore
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());