import { Router, type IRouter, type Request, type Response } from "express";
import { db, schoolsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendSchoolRequestNotification } from "../lib/email";

const router: IRouter = Router();

router.get("/", async (_req: Request, res: Response) => {
  const schools = await db
    .select()
    .from(schoolsTable)
    .where(eq(schoolsTable.status, "approved"))
    .orderBy(schoolsTable.name);
  return res.json(schools);
});

const requestSchema = z.object({
  name: z.string().min(2).max(200),
  requestedByEmail: z.string().email(),
});

router.post("/request", async (req: Request, res: Response) => {
  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
  }

  const { name, requestedByEmail } = parsed.data;

  const [school] = await db
    .insert(schoolsTable)
    .values({ name, status: "pending" })
    .returning();

  await sendSchoolRequestNotification(name, requestedByEmail);

  return res.json({
    message: "School request submitted. An administrator will review it shortly.",
  });
});

export default router;
