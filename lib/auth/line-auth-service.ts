import { prisma } from "@/lib/db/prisma";

import type { CurrentUser } from "./current-user";

type VerifiedLineIdentity = {
  sub: string;
  name?: string;
  picture?: string;
  email?: string;
};

export type SyncLineProfileInput = {
  idToken?: string;
  profile?: {
    userId: string;
    displayName?: string;
    pictureUrl?: string;
    statusMessage?: string;
    language?: string;
  };
};

export class InvalidLineTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLineTokenError";
  }
}

function isMockAuthEnabled() {
  return process.env.USE_MOCK_AUTH === "true";
}

async function verifyLineIdToken(idToken: string): Promise<VerifiedLineIdentity> {
  const channelId = process.env.LINE_CHANNEL_ID?.trim();

  if (!channelId) {
    throw new Error("LINE_CHANNEL_ID is not configured.");
  }

  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: channelId,
    }),
  });

  if (!response.ok) {
    throw new InvalidLineTokenError("Invalid LINE ID token");
  }

  const payload = (await response.json()) as Partial<VerifiedLineIdentity>;

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new InvalidLineTokenError("Invalid LINE ID token");
  }

  return {
    sub: payload.sub,
    ...(typeof payload.name === "string" ? { name: payload.name } : {}),
    ...(typeof payload.picture === "string" ? { picture: payload.picture } : {}),
    ...(typeof payload.email === "string" ? { email: payload.email } : {}),
  };
}

function mapUser(user: {
  id: string;
  lineUserId: string | null;
  displayName: string;
  email: string | null;
  role: "USER" | "ADMIN";
}): CurrentUser {
  return user;
}

export async function syncLineProfile(input: SyncLineProfileInput): Promise<CurrentUser> {
  let lineUserId: string;
  let displayName: string;
  let pictureUrl: string | undefined;
  let email: string | undefined;

  if (input.idToken) {
    const verified = await verifyLineIdToken(input.idToken);

    lineUserId = verified.sub;
    displayName = verified.name ?? input.profile?.displayName ?? "LINE User";
    pictureUrl = input.profile?.pictureUrl ?? verified.picture;
    email = verified.email;
  } else if (isMockAuthEnabled() && input.profile?.userId) {
    lineUserId = input.profile.userId;
    displayName = input.profile.displayName ?? "LINE User";
    pictureUrl = input.profile.pictureUrl;
  } else {
    throw new InvalidLineTokenError("Invalid LINE ID token");
  }

  const linkedUser = await prisma.$transaction(async (tx) => {
    const existingLineAccount = await tx.lineAccount.findUnique({
      where: { lineUserId },
      include: {
        user: {
          select: {
            id: true,
            lineUserId: true,
            displayName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (existingLineAccount) {
      const updatedUser = await tx.user.update({
        where: { id: existingLineAccount.userId },
        data: {
          lineUserId,
          displayName,
          ...(email ? { email } : {}),
        },
        select: {
          id: true,
          lineUserId: true,
          displayName: true,
          email: true,
          role: true,
        },
      });

      await tx.lineAccount.update({
        where: { lineUserId },
        data: {
          displayName,
          ...(pictureUrl ? { pictureUrl } : {}),
          ...(input.profile?.statusMessage ? { statusMessage: input.profile.statusMessage } : {}),
          ...(input.profile?.language ? { language: input.profile.language } : {}),
          lastLoginAt: new Date(),
        },
      });

      return updatedUser;
    }

    const existingUser =
      (await tx.user.findFirst({
        where: {
          OR: [{ lineUserId }, ...(email ? [{ email }] : [])],
        },
        select: {
          id: true,
          lineUserId: true,
          displayName: true,
          email: true,
          role: true,
        },
      })) ?? null;

    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            lineUserId,
            displayName,
            ...(email ? { email } : {}),
          },
          select: {
            id: true,
            lineUserId: true,
            displayName: true,
            email: true,
            role: true,
          },
        })
      : await tx.user.create({
          data: {
            lineUserId,
            displayName,
            email: email ?? null,
          },
          select: {
            id: true,
            lineUserId: true,
            displayName: true,
            email: true,
            role: true,
          },
        });

    await tx.lineAccount.create({
      data: {
        userId: user.id,
        lineUserId,
        displayName,
        pictureUrl: pictureUrl ?? null,
        statusMessage: input.profile?.statusMessage ?? null,
        language: input.profile?.language ?? null,
        lastLoginAt: new Date(),
      },
    });

    return user;
  });

  return mapUser(linkedUser);
}
