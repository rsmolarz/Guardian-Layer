import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transactionsRouter from "./transactions";
import approvalsRouter from "./approvals";
import dashboardRouter from "./dashboard";
import alertsRouter from "./alerts";
import integrationsRouter from "./integrations";
import monitoringRouter from "./monitoring";
import darkWebRouter from "./dark-web";

const router: IRouter = Router();

router.use(healthRouter);
router.use(transactionsRouter);
router.use(approvalsRouter);
router.use(dashboardRouter);
router.use(alertsRouter);
router.use(integrationsRouter);
router.use(monitoringRouter);
router.use(darkWebRouter);

export default router;
