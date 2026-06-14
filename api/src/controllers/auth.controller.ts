import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-settlemint-123";

export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, password, fullName } = request.body as any;

  if (!email || !password || !fullName) {
    return reply.code(400).send({ error: "Email, password, and fullName are required." });
  }

  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      return reply.code(409).send({ error: "User already exists with this email." });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      fullName,
    }).returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
    });

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, fullName: newUser.fullName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return reply.code(201).send({
      message: "User registered successfully",
      user: newUser,
      token,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const login = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, password } = request.body as any;

  if (!email || !password) {
    return reply.code(400).send({ error: "Email and password are required." });
  }

  try {
    // Find user
    const userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userRecords[0];

    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials." });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return reply.code(401).send({ error: "Invalid credentials." });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, fullName: user.fullName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return reply.code(200).send({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        defaultCurrency: user.defaultCurrency
      },
      token,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const me = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const userId = request.user?.id;
    if (!userId) {
      return reply.code(401).send({ error: "Unauthorized" });
    }

    const userRecords = await db.select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      avatarUrl: users.avatarUrl,
      defaultCurrency: users.defaultCurrency,
    }).from(users).where(eq(users.id, userId)).limit(1);

    const user = userRecords[0];
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    return reply.code(200).send({ user });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};
