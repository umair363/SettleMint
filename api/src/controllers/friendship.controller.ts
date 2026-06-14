import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { friendships, users } from "../db/schema";
import { eq, or, and } from "drizzle-orm";

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
  };
}

export const getFriends = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const userFriends = await db
      .select({
        friendshipId: friendships.id,
        status: friendships.status,
        friendId: users.id,
        friendName: users.fullName,
        friendAvatar: users.avatarUrl,
      })
      .from(friendships)
      .innerJoin(
        users,
        or(
          and(eq(friendships.user1Id, userId), eq(users.id, friendships.user2Id)),
          and(eq(friendships.user2Id, userId), eq(users.id, friendships.user1Id))
        )
      )
      .where(
        or(eq(friendships.user1Id, userId), eq(friendships.user2Id, userId))
      );

    return reply.send({ friends: userFriends });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const addFriend = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { email } = request.body as { email: string };

    const [friend] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!friend) return reply.code(404).send({ error: "User not found" });

    if (friend.id === userId) return reply.code(400).send({ error: "Cannot add yourself" });

    // Check if already friends
    const existing = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.user1Id, userId), eq(friendships.user2Id, friend.id)),
          and(eq(friendships.user1Id, friend.id), eq(friendships.user2Id, userId))
        )
      )
      .limit(1);

    if (existing.length > 0) return reply.code(400).send({ error: "Already friends" });

    const [newFriendship] = await db.insert(friendships).values({
      user1Id: userId,
      user2Id: friend.id,
      status: "accepted",
    }).returning();

    return reply.send({ message: "Friend added", friendship: newFriendship });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
