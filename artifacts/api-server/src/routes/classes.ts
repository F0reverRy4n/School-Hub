import { Router, type IRouter, type Request, type Response } from "express";
import { db, classesTable } from "@workspace/db";
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
  name: z.string().min(1).max(100),
  color: z.string().default("#3b82f6"),
});

router.get("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const classes = await db
    .select()
    .from(classesTable)
    .where(eq(classesTable.userId, userId));

  res.json(classes);
});

router.post("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;

  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const [created] = await db
    .insert(classesTable)
    .values({ userId, ...parsed.data })
    .returning();

  return res.status(201).json(created);
});

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
