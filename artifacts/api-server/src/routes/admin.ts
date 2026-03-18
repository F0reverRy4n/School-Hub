import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, schoolsTable, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "../middleware/requireRole";

const router: IRouter = Router();

// ---- ADMIN: APP SETTINGS (lockdown) ----

router.put("/settings", requireRole("admin"), async (req: Request, res: Response) => {
  const { lockdown } = req.body;
  if (typeof lockdown !== "boolean") {
    return res.status(400).json({ error: "lockdown must be a boolean" });
  }

  await db
    .insert(appSettingsTable)
    .values({ key: "lockdown", value: String(lockdown) })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value: String(lockdown), updatedAt: new Date() },
    });

  return res.json({ lockdown });
});

// ---- ADMIN: USERS ----

router.get("/users", requireRole("admin"), async (_req: Request, res: Response) => {
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
      schoolId: usersTable.schoolId,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .orderBy(usersTable.createdAt);

  const schools = await db.select({ id: schoolsTable.id, name: schoolsTable.name }).from(schoolsTable);
  const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s.name]));

  return res.json(
    users.map((u) => ({
      ...u,
      schoolName: u.schoolId != null ? (schoolMap[u.schoolId] ?? null) : null,
    }))
  );
});

const updateUserSchema = z.object({
  role: z.enum(["student", "teacher", "school_admin", "admin"]).optional(),
  schoolId: z.number().int().positive().nullable().optional(),
});

router.put("/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const updates: Record<string, any> = {};
  if (parsed.data.role !== undefined) updates.role = parsed.data.role;
  if ("schoolId" in parsed.data) updates.schoolId = parsed.data.schoolId;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
      schoolId: usersTable.schoolId,
      createdAt: usersTable.createdAt,
    });

  if (!updated) return res.status(404).json({ error: "User not found" });

  const schools = await db.select({ id: schoolsTable.id, name: schoolsTable.name }).from(schoolsTable);
  const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s.name]));

  return res.json({ ...updated, schoolName: updated.schoolId != null ? (schoolMap[updated.schoolId] ?? null) : null });
});

router.delete("/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });

  if (id === req.session.userId) {
    return res.status(400).json({ error: "You cannot delete your own account" });
  }

  const deleted = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
  if (deleted.length === 0) return res.status(404).json({ error: "User not found" });

  return res.json({ message: "User deleted" });
});

// ---- ADMIN: SCHOOLS ----

router.get("/schools", requireRole("admin"), async (_req: Request, res: Response) => {
  const schools = await db.select().from(schoolsTable).orderBy(schoolsTable.createdAt);
  return res.json(schools);
});

router.post("/schools", requireRole("admin"), async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "School name must be at least 2 characters" });
  }

  const [school] = await db
    .insert(schoolsTable)
    .values({ name: name.trim(), status: "approved" })
    .returning();

  return res.status(201).json(school);
});

const updateSchoolSchema = z.object({
  status: z.enum(["approved", "denied"]).optional(),
  name: z.string().min(2).max(200).optional(),
});

router.put("/schools/:id", requireRole("admin"), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid school ID" });

  const parsed = updateSchoolSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const updates: Record<string, any> = {};
  if (parsed.data.status) updates.status = parsed.data.status;
  if (parsed.data.name) updates.name = parsed.data.name;

  const [updated] = await db
    .update(schoolsTable)
    .set(updates)
    .where(eq(schoolsTable.id, id))
    .returning();

  if (!updated) return res.status(404).json({ error: "School not found" });
  return res.json(updated);
});

router.delete("/schools/:id", requireRole("admin"), async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid school ID" });

  await db.update(usersTable).set({ schoolId: null }).where(eq(usersTable.schoolId, id));
  const deleted = await db.delete(schoolsTable).where(eq(schoolsTable.id, id)).returning({ id: schoolsTable.id });
  if (deleted.length === 0) return res.status(404).json({ error: "School not found" });

  return res.json({ message: "School deleted" });
});

// ---- SCHOOL ADMIN: manage own school ----

router.get(
  "/school-users",
  requireRole("school_admin", "admin"),
  async (req: Request, res: Response) => {
    const role = req.session.role;
    let schoolId: number | null = null;

    if (role === "admin") {
      const qSchoolId = req.query.schoolId;
      schoolId = qSchoolId ? Number(qSchoolId) : null;
    } else {
      const [me] = await db
        .select({ schoolId: usersTable.schoolId })
        .from(usersTable)
        .where(eq(usersTable.id, req.session.userId!))
        .limit(1);
      schoolId = me?.schoolId ?? null;
    }

    if (!schoolId) return res.json([]);

    const schools = await db.select({ id: schoolsTable.id, name: schoolsTable.name }).from(schoolsTable);
    const schoolMap = Object.fromEntries(schools.map((s) => [s.id, s.name]));

    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        role: usersTable.role,
        email: usersTable.email,
        emailVerified: usersTable.emailVerified,
        schoolId: usersTable.schoolId,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.schoolId, schoolId));

    return res.json(users.map((u) => ({ ...u, schoolName: u.schoolId != null ? (schoolMap[u.schoolId] ?? null) : null })));
  }
);

router.post(
  "/school-users/:id/remove",
  requireRole("school_admin", "admin"),
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid user ID" });

    if (req.session.role === "school_admin") {
      const [me] = await db
        .select({ schoolId: usersTable.schoolId })
        .from(usersTable)
        .where(eq(usersTable.id, req.session.userId!))
        .limit(1);
      const [target] = await db
        .select({ schoolId: usersTable.schoolId })
        .from(usersTable)
        .where(eq(usersTable.id, id))
        .limit(1);
      if (!target) return res.status(404).json({ error: "User not found" });
      if (target.schoolId !== me?.schoolId) {
        return res.status(403).json({ error: "User is not in your school" });
      }
    }

    await db.update(usersTable).set({ schoolId: null }).where(eq(usersTable.id, id));
    return res.json({ message: "User removed from school" });
  }
);

export default router;
