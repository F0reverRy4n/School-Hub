import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import classesRouter from "./classes";
import assignmentsRouter from "./assignments";
import resourcesRouter from "./resources";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/classes", classesRouter);
router.use("/assignments", assignmentsRouter);
router.use("/resources", resourcesRouter);

export default router;
