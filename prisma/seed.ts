import "dotenv/config";
import { PrismaClient, DomainStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "yuvraj@example.com" },
    update: {},
    create: {
      email: "yuvraj@example.com",
      name: "Yuvraj",
      password: "$2a$10$placeholder_hash_for_seed_only",
      settings: {
        create: {
          theme: "dark",
        },
      },
    },
  });

const domains = [
  {
    name: "Health",
    slug: "health",
    description: "Physical energy, training, recovery, and health habits.",
    identity: "I take care of my body and protect my energy.",
    primaryReason: "When my body is right, everything else gets easier.",
    primaryCost: "Low energy spills into focus, discipline, and confidence.",
    nextMove: "Train today and lock in recovery tonight.",
    status: DomainStatus.ALIGNED,
    positionX: 2,
    positionY: 1,
    positionZ: 0,
  },
  {
    name: "Career",
    slug: "career",
    description: "Work, projects, income, and long-term direction.",
    identity: "I build toward freedom through skill, proof, and execution.",
    primaryReason: "Career progress compounds into money, leverage, and options.",
    primaryCost: "Drift here creates anxiety and weakens long-term momentum.",
    nextMove: "Ship the next meaningful piece of work this week.",
    status: DomainStatus.NEUTRAL,
    positionX: -1,
    positionY: 2,
    positionZ: 1,
  },
  {
    name: "Relationships",
    slug: "relationships",
    description: "Family, friends, dating, and social connection.",
    identity: "I stay intentional about the people I keep close.",
    primaryReason: "Good relationships stabilize life and sharpen perspective.",
    primaryCost: "Neglect here turns into disconnection and emotional drag.",
    nextMove: "Reach out directly instead of assuming things are fine.",
    status: DomainStatus.DRIFTING,
    positionX: 0,
    positionY: -2,
    positionZ: 1,
  },
];

  for (const domain of domains) {
    await prisma.domain.upsert({
      where: { userId_slug: { userId: user.id, slug: domain.slug } },
      update: {
        name: domain.name,
        description: domain.description,
        status: domain.status,
        positionX: domain.positionX,
        positionY: domain.positionY,
        positionZ: domain.positionZ,
      },
      create: {
        ...domain,
        userId: user.id,
      },
    });
  }

  const careerDomain = await prisma.domain.findUnique({
    where: { userId_slug: { userId: user.id, slug: "career" } },
  });

  if (careerDomain) {
    await prisma.commitment.upsert({
      where: {
        id: "career-commitment-1",
      },
      update: {
        text: "Finish the first working version of Axis.",
      },
      create: {
        id: "career-commitment-1",
        text: "Finish the first working version of Axis.",
        userId: user.id,
        domainId: careerDomain.id,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });