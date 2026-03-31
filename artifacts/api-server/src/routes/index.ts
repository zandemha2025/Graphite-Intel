import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import reportsRouter from "./reports";
import conversationsRouter from "./conversations";
import dashboardRouter from "./dashboard";
import companyProfilesRouter from "./company-profiles";
import researchRouter from "./research";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(reportsRouter);
router.use(conversationsRouter);
router.use(dashboardRouter);
router.use(companyProfilesRouter);
router.use(researchRouter);

export default router;
