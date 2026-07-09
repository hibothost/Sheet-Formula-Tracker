import { Router, type IRouter } from "express";
import healthRouter from "./health";
import traverseRouter from "./traverse";

const router: IRouter = Router();

router.use(healthRouter);
router.use(traverseRouter);

export default router;
