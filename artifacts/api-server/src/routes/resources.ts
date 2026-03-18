import { Router, type IRouter, type Request, type Response } from "express";
import { db, resourcesTable, classesTable } from "@workspace/db";
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
  type: z.enum(["link", "image", "note"]),
  title: z.string().min(1).max(200),
  content: z.string(),
});

router.get("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const resources = await db
    .select({
      id: resourcesTable.id,
      userId: resourcesTable.userId,
      classId: resourcesTable.classId,
      className: classesTable.name,
      type: resourcesTable.type,
      title: resourcesTable.title,
      content: resourcesTable.content,
      createdAt: resourcesTable.createdAt,
    })
    .from(resourcesTable)
    .leftJoin(classesTable, eq(resourcesTable.classId, classesTable.id))
    .where(eq(resourcesTable.userId, userId));

  res.json(resources);
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
    .insert(resourcesTable)
    .values({ userId, classId: classId ?? null, ...rest })
    .returning();

  const className = classId
    ? (await db.select({ name: classesTable.name }).from(classesTable).where(eq(classesTable.id, classId)).limit(1))[0]?.name ?? null
    : null;

  return res.status(201).json({ ...created, className });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const id = parseInt(req.params.id ?? "");
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const [deleted] = await db
    .delete(resourcesTable)
    .where(and(eq(resourcesTable.id, id), eq(resourcesTable.userId, userId)))
    .returning();

  if (!deleted) return res.status(404).json({ error: "Not found" });

  return res.json({ message: "Resource deleted" });
});

export default router;
