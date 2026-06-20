import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { groups, groupMembers, activityLogs } from "../db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string; email: string; fullName: string };
}

// POST /api/groups/:id/invite — generate a fresh invite link (admin only)
export const generateInviteLink = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };

    // Must be admin
    const [membership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, id), eq(groupMembers.userId, userId)))
      .limit(1);

    if (!membership) return reply.code(403).send({ error: "Not a member of this group" });
    if (membership.role !== "admin") return reply.code(403).send({ error: "Only admins can generate invite links" });

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.update(groups)
      .set({ inviteToken: token, inviteExpiresAt: expiresAt })
      .where(eq(groups.id, id));

    const inviteUrl = `${process.env.FRONTEND_URL || "https://settlemint.online"}/join/${token}`;

    return reply.code(200).send({ inviteToken: token, inviteUrl, expiresAt });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// GET /api/invite/:token — preview group info before joining (public, no auth needed)
export const previewInvite = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const { token } = request.params as { token: string };

    const [group] = await db
      .select({
        id: groups.id,
        name: groups.name,
        emoji: groups.emoji,
        color: groups.color,
        mode: groups.mode,
        baseCurrency: groups.baseCurrency,
        inviteExpiresAt: groups.inviteExpiresAt,
      })
      .from(groups)
      .where(eq(groups.inviteToken, token))
      .limit(1);

    if (!group) return reply.code(404).send({ error: "Invalid or expired invite link" });

    if (group.inviteExpiresAt && new Date() > new Date(group.inviteExpiresAt)) {
      return reply.code(410).send({ error: "This invite link has expired" });
    }

    // Count members
    const memberCount = await db
      .select()
      .from(groupMembers)
      .where(eq(groupMembers.groupId, group.id));

    return reply.code(200).send({ group: { ...group, memberCount: memberCount.length } });
  } catch (error) {
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

// POST /api/invite/:token/join — authenticated user joins via invite token
export const joinViaInvite = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { token } = request.params as { token: string };

    const [group] = await db
      .select()
      .from(groups)
      .where(eq(groups.inviteToken, token))
      .limit(1);

    if (!group) return reply.code(404).send({ error: "Invalid or expired invite link" });
    if (group.inviteExpiresAt && new Date() > new Date(group.inviteExpiresAt)) {
      return reply.code(410).send({ error: "This invite link has expired" });
    }

    // Check already a member
    const [existingMembership] = await db
      .select()
      .from(groupMembers)
      .where(and(eq(groupMembers.groupId, group.id), eq(groupMembers.userId, userId)))
      .limit(1);

    if (existingMembership) {
      return reply.code(200).send({ message: "Already a member", groupId: group.id });
    }

    // Join group
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId,
      role: "member",
    });

    await db.insert(activityLogs).values({
      groupId: group.id,
      userId,
      action: "Member Joined",
      description: `Joined "${group.name}" via invite link`,
    });

    return reply.code(201).send({ message: "Joined group successfully", groupId: group.id });
  } catch (error) {
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
