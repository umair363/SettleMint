import { and, eq, inArray } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { anonymous } from "better-auth/plugins/anonymous";
import { emailOTP } from "better-auth/plugins/email-otp";
import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned";
import { uuidv7 } from "uuidv7";
import { CLIENT_IP_HEADER } from "./client-ip";
import type { AppConfig } from "./config";
import type { Db } from "./db/client";
import { account, activityEvents, expenses, members, session, settlements, user, verification } from "./db/schema";
import { otpEmail, type Mailer } from "./mailer";

export const GUEST_EMAIL_DOMAIN = "guest.settlemint.invalid";

/**
 * When a guest creates a real account, their group spots move to it.
 * If the real account is already in one of those groups, the guest's spot
 * stays as a named placeholder so its history is kept and can be merged by
 * hand; it is never silently dropped.
 */
export async function linkGuestToUser(db: Db, guestUserId: string, realUserId: string) {
  await db.transaction(async (tx) => {
    const guestMembers = await tx
      .select({ id: members.id, groupId: members.groupId })
      .from(members)
      .where(eq(members.userId, guestUserId));
    if (guestMembers.length === 0) return;

    const existing = await tx
      .select({ groupId: members.groupId })
      .from(members)
      .where(
        and(
          eq(members.userId, realUserId),
          inArray(
            members.groupId,
            guestMembers.map((m) => m.groupId),
          ),
        ),
      );
    const clash = new Set(existing.map((e) => e.groupId));

    for (const m of guestMembers) {
      await tx
        .update(members)
        .set({ userId: clash.has(m.groupId) ? null : realUserId })
        .where(eq(members.id, m.id));
    }
    for (const table of [expenses, settlements]) {
      await tx.update(table).set({ createdByUserId: realUserId }).where(eq(table.createdByUserId, guestUserId));
    }
    await tx.update(expenses).set({ updatedByUserId: realUserId }).where(eq(expenses.updatedByUserId, guestUserId));
    await tx.update(activityEvents).set({ actorUserId: realUserId }).where(eq(activityEvents.actorUserId, guestUserId));
  });
}

export function createAuth(db: Db, config: AppConfig, mailer: Mailer) {
  return betterAuth({
    appName: "SettleMint",
    baseURL: config.apiUrl,
    basePath: "/v1/auth",
    secret: config.authSecret,
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
    trustedOrigins: config.trustedOrigins,
    telemetry: { enabled: false },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      requireEmailVerification: config.requireEmailVerification,
    },
    // Confirming the email is a 6-digit code (email OTP plugin below); entering it signs you in.
    // Signing in with a password before that sends a fresh code.
    emailVerification: { sendOnSignIn: true, autoSignInAfterVerification: true },
    socialProviders: {
      ...(config.google ? { google: { ...config.google, prompt: "select_account" as const } } : {}),
      ...(config.apple ? { apple: config.apple } : {}),
    },
    user: {
      additionalFields: {
        defaultCurrency: { type: "string", required: false, input: false },
        locale: { type: "string", required: false, input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 60, // 60 days
      updateAge: 60 * 60 * 24, // refresh the expiry at most once a day
    },
    rateLimit: { enabled: config.env !== "test" && config.authRateLimit !== false },
    advanced: {
      // The address Fastify resolved from trusted proxy hops only (see app.ts).
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
      database: { generateId: () => uuidv7() },
      useSecureCookies: config.env === "production",
      ...(config.cookieDomain ? { crossSubDomainCookies: { enabled: true, domain: config.cookieDomain } } : {}),
    },
    plugins: [
      // The mobile app: maps its expo-origin header to an origin and lets
      // social sign-in return to settlemint:// deep links.
      expo(),
      // Refuse passwords known from data breaches (NIST guidance). Only the first 5 characters of a
      // SHA-1 hash leave the server. Production only, so tests never depend on an outside service.
      ...(config.env === "production" ? [haveIBeenPwned()] : []),
      anonymous({
        emailDomainName: GUEST_EMAIL_DOMAIN,
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          await linkGuestToUser(db, anonymousUser.user.id, newUser.user.id);
        },
      }),
      emailOTP({
        otpLength: 6,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: "hashed",
        overrideDefaultEmailVerification: true,
        async sendVerificationOTP({ email, otp, type }) {
          // Not awaited by callers' timing: failures are logged, not leaked.
          await mailer.send(otpEmail(email, otp, type)).catch((err) => {
            console.error("Failed to send OTP email", err);
          });
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
