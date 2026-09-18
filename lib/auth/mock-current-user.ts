import { prisma } from "@/lib/db/prisma";

const DEMO_USER_EMAIL = "demo.user@northpark.local";

export type MockCurrentUser = {
  id: string;
  displayName: string;
  email: string | null;
  role: "USER" | "ADMIN";
};

const DEFAULT_MOCK_USER: MockCurrentUser = {
  id: "mock-user-1",
  displayName: "NorthPark Demo User",
  email: DEMO_USER_EMAIL,
  role: "USER",
};

export async function getMockCurrentUser(): Promise<MockCurrentUser> {
  try {
    const user = await prisma.user.upsert({
      where: { email: DEMO_USER_EMAIL },
      update: {},
      create: {
        id: "mock-user-1",
        displayName: "NorthPark Demo User",
        email: DEMO_USER_EMAIL,
        phone: "0800000000",
        role: "USER",
      },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
      },
    });

    if (user) {
      return user;
    }
  } catch (error) {
    console.warn("[mock-current-user] Database query failed, using in-memory mock user fallback:", error);
  }

  return DEFAULT_MOCK_USER;
}
