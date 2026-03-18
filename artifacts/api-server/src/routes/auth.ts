import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const router: IRouter = Router();

const registerSchema = z.object({
  username: z.string().min(4).max(20),
  password: z
    .string()
    .min(8)
    .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), {
      message: "Password must contain at least one letter and one number",
    }),
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
  }
}

router.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const { username, password } = parsed.data;

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existing.length > 0) {
    return res.status(409).json({ error: "Username is already taken" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const [user] = await db
    .insert(usersTable)
    .values({ username, passwordHash })
    .returning({ id: usersTable.id, username: usersTable.username });

  req.session.userId = user.id;
  req.session.username = user.username;

  return res.status(201).json({ user: { id: user.id, username: user.username }, message: "Account created" });
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

  return res.json({ user: { id: user.id, username: user.username }, message: "Logged in" });
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {});
  res.json({ message: "Logged out" });
});

router.get("/me", (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json({ id: req.session.userId, username: req.session.username });
});

export default router;
