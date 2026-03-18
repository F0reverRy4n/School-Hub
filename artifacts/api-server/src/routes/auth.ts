import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, emailVerificationsTable, schoolsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { sendVerificationCode } from "../lib/email";
import crypto from "crypto";

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    role: string;
  }
}

const registerSchema = z.object({
  username: z.string().min(4).max(20),
  password: z
    .string()
    .min(8)
    .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), {
      message: "Password must contain at least one letter and one number",
    }),
  role: z.enum(["student", "teacher"]).optional().default("student"),
  email: z.string().email().optional(),
  emailCode: z.string().optional(),
  schoolId: z.number().int().positive().nullable().optional(),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const sendCodeSchema = z.object({
  email: z.string().email(),
});

router.post("/send-verification-code", async (req: Request, res: Response) => {
  const parsed = sendCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const { email } = parsed.data;

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);
  if (existing.length > 0) {
    return res.status(400).json({ error: "An account with this email already exists" });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(emailVerificationsTable).values({ email, code, expiresAt });

  await sendVerificationCode(email, code);

  return res.json({ message: "Verification code sent" });
});

router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const { username, password, role: requestedRole, email, emailCode, schoolId } = parsed.data;

  const isRyanAdmin = username.toLowerCase() === "ryan";
  const role = isRyanAdmin ? "admin" : (requestedRole ?? "student");

  if (role === "teacher") {
    if (!email) {
      return res.status(400).json({ error: "Email is required for teacher registration" });
    }
    if (!emailCode) {
      return res.status(400).json({ error: "Email verification code is required" });
    }

    const now = new Date();
    const verification = await db
      .select()
      .from(emailVerificationsTable)
      .where(
        and(
          eq(emailVerificationsTable.email, email),
          eq(emailVerificationsTable.code, emailCode),
          eq(emailVerificationsTable.used, false),
          gt(emailVerificationsTable.expiresAt, now)
        )
      )
      .limit(1);

    if (verification.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    await db
      .update(emailVerificationsTable)
      .set({ used: true })
      .where(eq(emailVerificationsTable.id, verification[0].id));
  }

  const existingUsername = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existingUsername.length > 0) {
    return res.status(409).json({ error: "Username is already taken" });
  }

  if (email) {
    const existingEmail = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const insertValues: any = {
    username,
    passwordHash,
    role,
    ...(email && { email, emailVerified: role === "teacher" }),
    ...(schoolId != null && { schoolId }),
  };

  const [user] = await db
    .insert(usersTable)
    .values(insertValues)
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      schoolId: usersTable.schoolId,
      email: usersTable.email,
    });

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  return res.status(201).json({
    user: { id: user.id, username: user.username, role: user.role, schoolId: user.schoolId, email: user.email },
    message: "Account created",
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const { username, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;

  return res.json({
    user: { id: user.id, username: user.username, role: user.role, schoolId: user.schoolId, email: user.email },
    message: "Logged in",
  });
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {});
  res.json({ message: "Logged out" });
});

router.get("/me", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      schoolId: usersTable.schoolId,
      email: usersTable.email,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Not authenticated" });
  }

  req.session.role = user.role;

  return res.json({ id: user.id, username: user.username, role: user.role, schoolId: user.schoolId, email: user.email });
});

export default router;
