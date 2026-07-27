import { prisma } from "@/lib/db/prisma";

const DEMO_USER_EMAIL = "demo.user@northpark.local";

export type MockCurrentUser = {
  id: string;
  displayName: string;
  email: string | null;
  role: "USER" | "ADMIN";
};

export async function getMockCurrentUser(): Promise<MockCurrentUser> {
  const user = await prisma.user.findUnique({
    where: { email: DEMO_USER_EMAIL },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    throw new Error("Mock current user is not seeded.");
  }

  return user;
}
