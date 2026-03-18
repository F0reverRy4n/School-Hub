import { Router, type IRouter, type Request, type Response } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req: Request, res: Response) => {
  const [setting] = await db
    .select()
    .from(appSettingsTable)
    .where(eq(appSettingsTable.key, "lockdown"))
    .limit(1);
  return res.json({ lockdown: setting?.value === "true" });
});

export default router;
