import { FastifyRequest, FastifyReply } from "fastify";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendWelcomeEmail, sendOTPEmail } from "../utils/email";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-jwt-key-settlemint-123";

// Generate 6 digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, password, fullName } = request.body as any;

  if (!email || !password || !fullName) {
    return reply.code(400).send({ error: "Email, password, and fullName are required." });
  }

  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0) {
      if (!existingUser[0].isVerified) {
        // Resend OTP if user exists but isn't verified
        const otpCode = generateOTP();
        const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
        await db.update(users)
          .set({ otpCode, otpExpiresAt })
          .where(eq(users.id, existingUser[0].id));
        
        sendOTPEmail(email, fullName, otpCode).catch(err => {
          request.log.error("OTP email failed: ", err);
        });

        return reply.code(200).send({
          message: "Account exists but is not verified. A new verification code has been sent.",
          requireVerification: true,
        });
      }
      return reply.code(409).send({ error: "User already exists with this email." });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Create user
    const [newUser] = await db.insert(users).values({
      email,
      passwordHash,
      fullName,
      isVerified: false,
      otpCode,
      otpExpiresAt,
    }).returning({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
    });

    // Send OTP Email asynchronously
    sendOTPEmail(newUser.email, newUser.fullName, otpCode).catch(err => {
      request.log.error("OTP email failed: ", err);
    });

    return reply.code(201).send({
      message: "Please check your email to verify your account.",
      requireVerification: true,
      email: newUser.email,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const verifyOtp = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, otp } = request.body as any;

  if (!email || !otp) {
    return reply.code(400).send({ error: "Email and OTP are required." });
  }

  try {
    const userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userRecords[0];

    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    if (user.isVerified) {
      return reply.code(400).send({ error: "User is already verified." });
    }

    if (user.otpCode !== otp) {
      return reply.code(401).send({ error: "Invalid OTP code." });
    }

    if (!user.otpExpiresAt || user.otpExpiresAt.getTime() < Date.now()) {
      return reply.code(401).send({ error: "OTP code has expired. Please request a new one." });
    }

    // Verify successful
    const [verifiedUser] = await db.update(users)
      .set({ isVerified: true, otpCode: null, otpExpiresAt: null })
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        avatarUrl: users.avatarUrl,
        defaultCurrency: users.defaultCurrency,
      });

    // Generate JWT
    const token = jwt.sign(
      { id: verifiedUser.id, email: verifiedUser.email, fullName: verifiedUser.fullName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Send Welcome Email asynchronously
    sendWelcomeEmail(verifiedUser.email, verifiedUser.fullName).catch(err => {
      request.log.error("Welcome email failed: ", err);
    });

    return reply.code(200).send({
      message: "Verification successful",
      user: verifiedUser,
      token,
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Internal Server Error" });
  }
};

export const resendOtp = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email } = request.body as any;

  if (!email) {
    return reply.code(400).send({ error: "Email is required." });
  }

  try {
    const userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userRecords[0];

    if (!user) {
      return reply.code(404).send({ error: "User not found." });
    }

    if (user.isVerified) {
      return reply.code(400).send({ error: "User is already verified." });
    }

    const otpCode = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.update(users)
      .set({ otpCode, otpExpiresAt })
      .where(eq(users.id, user.id));

    sendOTPEmail(email, user.fullName, otpCode).catch(err => {
      request.log.error("OTP email failed: ", err);
    });

    return reply.code(200).send({ message: "A new OTP has been sent." });
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

    if (!user.isVerified) {
      return reply.code(403).send({ error: "Please verify your email to log in.", requireVerification: true });
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
