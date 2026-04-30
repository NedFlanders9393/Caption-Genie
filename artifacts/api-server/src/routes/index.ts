import { Router, type IRouter } from "express";
import healthRouter from "./health";
import captionsRouter from "./captions";
import stripeRouter from "./stripe";
import moderationRouter from "./moderation";

const router: IRouter = Router();

router.use(healthRouter);
router.use(captionsRouter);
router.use(stripeRouter);
router.use(moderationRouter);

export default router;
