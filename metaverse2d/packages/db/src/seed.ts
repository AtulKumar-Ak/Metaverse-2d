//packages/db/src/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const AVATARS = [
  // Pixel art characters
  { name: "Cyber Wolf",    imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=CyberWolf&backgroundColor=b6e3f4" },
  { name: "Nova",          imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Nova&backgroundColor=d1d4f9" },
  { name: "Ghost",         imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Ghost&backgroundColor=c0aede" },
  { name: "Blaze",         imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Blaze&backgroundColor=ffd5dc" },
  { name: "Axiom",         imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Axiom&backgroundColor=b6e3f4" },
  { name: "Vex",           imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Vex&backgroundColor=ffdfbf" },
  { name: "Luna",          imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Luna&backgroundColor=d1d4f9" },
  { name: "Rook",          imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Rook&backgroundColor=c0aede" },
  { name: "Echo",          imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Echo&backgroundColor=b6e3f4" },
  { name: "Cipher",        imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Cipher&backgroundColor=ffd5dc" },
  { name: "Flux",          imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Flux&backgroundColor=ffdfbf" },
  { name: "Kira",          imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Kira&backgroundColor=d1d4f9" },
  { name: "Dusk",          imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Dusk&backgroundColor=c0aede" },
  { name: "Zeno",          imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Zeno&backgroundColor=b6e3f4" },
  { name: "Pixel",         imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Pixel&backgroundColor=ffd5dc" },
  { name: "Nyx",           imageUrl: "https://api.dicebear.com/7.x/pixel-art/svg?seed=Nyx&backgroundColor=d1d4f9" },
];

async function main() {
  // Clear existing avatars and re-seed
  await prisma.avatar.deleteMany();

  for (const avatar of AVATARS) {
    await prisma.avatar.create({ data: avatar });
  }

  // Elements
  await prisma.element.deleteMany();
  await prisma.element.create({
    data: { width: 1, height: 1, static: true, imageUrl: "https://png.pngtree.com/png-vector/20220805/ourmid/pngtree-stone-wall-brick-pixel-art-png-image_6098748.png" }
  });
  await prisma.element.create({
    data: { width: 1, height: 1, static: false, imageUrl: "https://static.vecteezy.com/system/resources/previews/021/691/590/non_2x/pixel-art-chair-icon-free-vector.jpg" }
  });

  console.log(`✓ Seeded ${AVATARS.length} avatars`);
}
//@ts-ignore
main().catch(console.error).finally(() => prisma.$disconnect());