import { Router, type IRouter } from "express";
import healthRouter from "./health";
import captionsRouter from "./captions";
import stripeRouter from "./stripe";
import moderationRouter from "./moderation";
import bugsRouter from "./bugs";
import historyRouter from "./history";
import favoritesRouter from "./favorites";
import creditsRouter from "./credits";
import checkinsRouter from "./checkins";
import revenuecatWebhookRouter from "./revenuecatWebhook";
import authRouter from "./auth";
import accountRouter from "./account";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(captionsRouter);
router.use(stripeRouter);
router.use(moderationRouter);
router.use(bugsRouter);
router.use(historyRouter);
router.use(favoritesRouter);
router.use(creditsRouter);
router.use(checkinsRouter);
router.use(revenuecatWebhookRouter);
router.use(authRouter);
router.use(accountRouter);
router.use(adminRouter);

export default router;
