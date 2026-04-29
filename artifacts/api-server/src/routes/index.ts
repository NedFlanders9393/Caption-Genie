import { Router, type IRouter } from "express";
import healthRouter from "./health";
import captionsRouter from "./captions";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(captionsRouter);
router.use(stripeRouter);

export default router;
