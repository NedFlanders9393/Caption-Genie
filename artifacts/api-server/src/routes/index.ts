import { Router, type IRouter } from "express";
import healthRouter from "./health";
import captionsRouter from "./captions";
import stripeRouter from "./stripe";
import moderationRouter from "./moderation";
import bugsRouter from "./bugs";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(captionsRouter);
router.use(stripeRouter);
router.use(moderationRouter);
router.use(bugsRouter);
router.use(historyRouter);

export default router;
