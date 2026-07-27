import { cookies } from "next/headers";

import { prisma } from "@/lib/db/prisma";

import { getMockCurrentUser } from "./mock-current-user";
import { getUserIdFromSessionToken, readSessionTokenFromCookieStore } from "./session-service";

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export type CurrentUser = {
  id: string;
  lineUserId: string | null;
  displayName: string;
  email: string | null;
  role: "USER" | "ADMIN";
};

function isMockAuthEnabled() {
  return process.env.USE_MOCK_AUTH === "true";
}

async function getRequestCookieStore() {
  try {
    return await cookies();
  } catch {
    if (isMockAuthEnabled()) {
      return null;
    }

    throw new AuthenticationError("Unauthorized");
  }
}

function mapCurrentUser(user: {
  id: string;
  lineUserId: string | null;
  displayName: string;
  email: string | null;
  role: "USER" | "ADMIN";
}) {
  return user;
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await getRequestCookieStore();
  const sessionToken = cookieStore ? readSessionTokenFromCookieStore(cookieStore) : undefined;

  if (sessionToken) {
    const userId = await getUserIdFromSessionToken(sessionToken);

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          lineUserId: true,
          displayName: true,
          email: true,
          role: true,
        },
      });

      if (user) {
        return mapCurrentUser(user);
      }
    }
  }

  if (isMockAuthEnabled()) {
    const mockUser = await getMockCurrentUser();

    return {
      ...mockUser,
      lineUserId: null,
    };
  }

  throw new AuthenticationError("Unauthorized");
}
