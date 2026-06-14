import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    fullName: string;
  };
}

// PUT /api/users/me - Update profile
export const updateProfile = async (request: AuthenticatedRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) return reply.code(401).send({ error: "Unauthorized" });

    const { fullName, avatarUrl, defaultCurrency } = request.body as any;

    const [updatedUser] = await db.update(users)
      .set({
        ...(fullName && { fullName }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(defaultCurrency && { defaultCurrency }),
      })
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        defaultCurrency: users.defaultCurrency,
      });

    return reply.code(200).send({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
