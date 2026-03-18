import { Router, type IRouter, type Request, type Response } from "express";
import { db, assignmentsTable, classesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

function requireAuth(req: Request, res: Response): number | null {
  const userId = req.session?.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return userId;
}

const createSchema = z.object({
  classId: z.number().int().nullable().optional(),
  title: z.string().min(1).max(200),
  notes: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]),
});

const updateSchema = z.object({
  classId: z.number().int().nullable().optional(),
  title: z.string().min(1).max(200).optional(),
  notes: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  completed: z.boolean().optional(),
});

router.get("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const assignments = await db
    .select({
      id: assignmentsTable.id,
      userId: assignmentsTable.userId,
      classId: assignmentsTable.classId,
      className: classesTable.name,
      title: assignmentsTable.title,
      notes: assignmentsTable.notes,
      dueDate: assignmentsTable.dueDate,
      priority: assignmentsTable.priority,
      completed: assignmentsTable.completed,
      createdAt: assignmentsTable.createdAt,
    })
    .from(assignmentsTable)
    .leftJoin(classesTable, eq(assignmentsTable.classId, classesTable.id))
    .where(eq(assignmentsTable.userId, userId));

  res.json(assignments);
});

router.post("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const { classId, ...rest } = parsed.data;

  const [created] = await db
    .insert(assignmentsTable)
    .values({ userId, classId: classId ?? null, ...rest })
    .returning();

  const className = classId
    ? (await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, classId)).limit(1))[0]?.name ?? null
    : null;

  return res.status(201).json({ ...created, className });
});

router.put("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const { classId, ...rest } = parsed.data;

  const updateData: Record<string, unknown> = { ...rest };
  if (classId !== undefined) updateData.classId = classId;

  const [updated] = await db
    .update(assignmentsTable)
    .set(updateData)
    .where(and(eq(assignmentsTable.id, id), eq(assignmentsTable.userId, userId)))
    .returning();

  if (!updated) return res.status(404).json({ error: "Not found" });

  const className = updated.classId
    ? (await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, updated.classId)).limit(1))[0]?.name ?? null
    : null;

  return res.json({ ...updated, className });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db
    .delete(assignmentsTable)
    .where(and(eq(assignmentsTable.id, id), eq(assignmentsTable.userId, userId)))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Not found" });

  return res.json({ message: "Assignment deleted" });
});

export default router;
