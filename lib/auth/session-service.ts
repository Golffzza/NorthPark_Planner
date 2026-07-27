import { createHmac, randomBytes } from "node:crypto";

import type { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { prisma } from "@/lib/db/prisma";

const DEFAULT_SESSION_COOKIE_NAME = "northpark_session";
const SESSION_TTL_DAYS = 30;

type CookieStoreLike = {
  get: (name: string) => { value: string } | undefined;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return secret;
}

export function getSessionCookieName() {
  return process.env.SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;
}

function getSessionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

  return expiresAt;
}

function hashSessionToken(token: string) {
  return createHmac("sha256", getSessionSecret()).update(token).digest("hex");
}

function generateSessionToken() {
  return randomBytes(32).toString("hex");
}

export function readSessionTokenFromCookieStore(cookieStore: CookieStoreLike) {
  return cookieStore.get(getSessionCookieName())?.value;
}

export async function issueUserSession(userId: string) {
  const token = generateSessionToken();

  await prisma.userSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: getSessionExpiryDate(),
    },
  });

  return token;
}

export async function getUserIdFromSessionToken(token: string) {
  const session = await prisma.userSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    select: {
      userId: true,
      expiresAt: true,
      revokedAt: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return session.userId;
}

export async function revokeSessionToken(token: string) {
  await prisma.userSession.updateMany({
    where: {
      tokenHash: hashSessionToken(token),
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = readSessionTokenFromCookieStore(cookieStore);

  if (!token) {
    return;
  }

  await revokeSessionToken(token);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: getSessionCookieName(),
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: getSessionExpiryDate(),
  });

  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
