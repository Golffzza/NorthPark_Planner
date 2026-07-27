import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { parks } from "./seed-data/parks";
import { evaluationRules } from "./seed-data/rules";
import { systemSettings } from "./seed-data/settings";
import { users } from "./seed-data/users";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function seedUsers() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        displayName: user.displayName,
        phone: user.phone,
        role: user.role,
      },
      create: {
        displayName: user.displayName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  }
}

async function seedParks() {
  for (const park of parks) {
    await prisma.park.upsert({
      where: { slug: park.slug },
      update: {
        nameTh: park.nameTh,
        nameEn: park.nameEn,
        province: park.province,
        region: park.region,
        latitude: park.latitude,
        longitude: park.longitude,
        openTime: park.openTime,
        closeTime: park.closeTime,
        description: park.description,
        coverImageUrl: park.coverImageUrl,
        isActive: park.isActive,
      },
      create: {
        slug: park.slug,
        nameTh: park.nameTh,
        nameEn: park.nameEn,
        province: park.province,
        region: park.region,
        latitude: park.latitude,
        longitude: park.longitude,
        openTime: park.openTime,
        closeTime: park.closeTime,
        description: park.description,
        coverImageUrl: park.coverImageUrl,
        isActive: park.isActive,
      },
    });

    const savedPark = await prisma.park.findUniqueOrThrow({
      where: { slug: park.slug },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.parkAttraction.deleteMany({ where: { parkId: savedPark.id } }),
      prisma.parkWarning.deleteMany({ where: { parkId: savedPark.id } }),
      prisma.parkAttraction.createMany({
        data: park.attractions.map((attraction) => ({
          parkId: savedPark.id,
          name: attraction.name,
          description: attraction.description,
          type: attraction.type,
          imageUrl: attraction.imageUrl,
        })),
      }),
      ...(park.warnings.length > 0
        ? [
            prisma.parkWarning.createMany({
              data: park.warnings.map((warning) => ({
                parkId: savedPark.id,
                title: warning.title,
                description: warning.description,
                severity: warning.severity,
                isActive: warning.isActive,
              })),
            }),
          ]
        : []),
    ]);
  }
}

async function seedRules() {
  for (const rule of evaluationRules) {
    await prisma.evaluationRule.upsert({
      where: { key: rule.key },
      update: {
        value: rule.value,
        description: rule.description,
        isActive: true,
      },
      create: {
        key: rule.key,
        value: rule.value,
        description: rule.description,
        isActive: true,
      },
    });
  }
}

async function seedSettings() {
  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        description: setting.description,
      },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    });
  }
}

async function main() {
  await seedUsers();
  await seedParks();
  await seedRules();
  await seedSettings();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
