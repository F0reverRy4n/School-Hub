import { Router, type IRouter, type Request, type Response } from "express";
import { db, classesTable, enrollmentsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return userId;
}

function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().default("#3b82f6"),
});

// GET /classes - own classes + enrolled teacher classes
router.get("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const role = req.session.role ?? "student";

  // Own classes
  const ownClasses = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.userId, userId));

  // Enrolled teacher classes (for non-teachers)
  let enrolledClasses: any[] = [];
  if (role !== "teacher") {
    const enrollments = await db
      .select({ classId: enrollmentsTable.classId })
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.studentId, userId));

    if (enrollments.length > 0) {
      const classIds = enrollments.map((e) => e.classId);
      const joinedRaw = await db
        .select({
          id: classesTable.id,
          userId: classesTable.userId,
          name: classesTable.name,
          color: classesTable.color,
          joinCode: classesTable.joinCode,
          isTeacherClass: classesTable.isTeacherClass,
          createdAt: classesTable.createdAt,
          ownerUsername: usersTable.username,
        })
        .from(classesTable)
        .innerJoin(usersTable, eq(classesTable.userId, usersTable.id))
        .where(inArray(classesTable.id, classIds));

      enrolledClasses = joinedRaw.map((c) => ({ ...c, enrolled: true }));
    }
  }

  // For teacher classes, get enrolled counts
  const teacherClassIds = ownClasses.filter((c) => c.isTeacherClass).map((c) => c.id);
  let enrolledCounts: Record<number, number> = {};
  if (teacherClassIds.length > 0) {
    const counts = await db
      .select({ classId: enrollmentsTable.classId })
      .from(enrollmentsTable)
      .where(inArray(enrollmentsTable.classId, teacherClassIds));
    for (const c of counts) {
      enrolledCounts[c.classId] = (enrolledCounts[c.classId] ?? 0) + 1;
    }
  }

  const ownMapped = ownClasses.map((c) => ({
    ...c,
    ownerUsername: null,
    enrolled: false,
    enrolledCount: c.isTeacherClass ? (enrolledCounts[c.id] ?? 0) : null,
  }));

  res.json([...ownMapped, ...enrolledClasses]);
});

// POST /classes - create a class
router.post("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const role = req.session.role ?? "student";
  const isTeacher = role === "teacher";

  let joinCode: string | null = null;
  if (isTeacher) {
    let attempts = 0;
    while (attempts < 10) {
      const code = generateJoinCode();
      const existing = await db
        .select({ id: classesTable.id })
        .from(classesTable)
        .where(eq(classesTable.joinCode, code))
        .limit(1);
      if (existing.length === 0) {
        joinCode = code;
        break;
      }
      attempts++;
    }
  }

  const [created] = await db
    .insert(classesTable)
    .values({
      userId,
      ...parsed.data,
      ...(joinCode && { joinCode, isTeacherClass: true }),
    })
    .returning();

  return res.status(201).json({ ...created, ownerUsername: null, enrolledCount: 0 });
});

// POST /classes/join - student joins a teacher class
router.post("/join", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const { joinCode } = req.body;
  if (!joinCode || typeof joinCode !== "string") {
    return res.status(400).json({ error: "Join code is required" });
  }

  const [cls] = await db
    .select()
    .from(classesTable)
    .where(and(eq(classesTable.joinCode, joinCode.toUpperCase().trim()), eq(classesTable.isTeacherClass, true)))
    .limit(1);

  if (!cls) {
    return res.status(404).json({ error: "No class found with that join code" });
  }

  if (cls.userId === userId) {
    return res.status(400).json({ error: "You cannot join your own class" });
  }

  try {
    await db.insert(enrollmentsTable).values({ studentId: userId, classId: cls.id });
  } catch {
    return res.status(400).json({ error: "You are already enrolled in this class" });
  }

  return res.json({ message: `Joined "${cls.name}" successfully` });
});

// GET /classes/:id/students - teacher sees enrolled students
router.get("/:id/students", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const role = req.session.role ?? "student";

  const [cls] = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.id, id))
    .limit(1);

  if (!cls) return res.status(404).json({ error: "Class not found" });

  if (role !== "admin" && cls.userId !== userId) {
    return res.status(403).json({ error: "You do not own this class" });
  }

  const enrollments = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      role: usersTable.role,
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
      schoolId: usersTable.schoolId,
      createdAt: usersTable.createdAt,
    })
    .from(enrollmentsTable)
    .innerJoin(usersTable, eq(enrollmentsTable.studentId, usersTable.id))
    .where(eq(enrollmentsTable.classId, id));

  return res.json(enrollments.map((u) => ({ ...u, schoolName: null })));
});

// DELETE /classes/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db
    .delete(classesTable)
    .where(and(eq(classesTable.id, id), eq(classesTable.userId, userId)))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Not found" });

  return res.json({ message: "Class deleted" });
});

export default router;
