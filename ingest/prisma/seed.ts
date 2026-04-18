import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Minimal locality + YouTube source for local testing. Set DEMO_YOUTUBE_CHANNEL_ID to a real channel id.
 */
async function main() {
  const channelId = process.env.DEMO_YOUTUBE_CHANNEL_ID ?? "UC_x5XG1OV2P6uZZ5FSM9Ttw"; // Google Developers sample list channel
  const locality = await prisma.locality.upsert({
    where: { id: "seed-rgv-demo" },
    create: {
      id: "seed-rgv-demo",
      name: "RGV Demo",
      region: "RGV",
      county: "Hidalgo",
      city: "McAllen",
    },
    update: {},
  });

  await prisma.source.upsert({
    where: { id: "seed-youtube-demo" },
    create: {
      id: "seed-youtube-demo",
      name: "Demo YouTube meetings",
      localityId: locality.id,
      type: "youtube_channel",
      config: { channelId },
      enabled: true,
      respectRobots: true,
    },
    update: {
      config: { channelId },
    },
  });

  console.log("Seed complete:", locality.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
