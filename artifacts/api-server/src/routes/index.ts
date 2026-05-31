import { Router, type IRouter, type RequestHandler } from "express";
import healthRouter from "./health";
import plannerRouter from "./planner";
import aiRouter from "./ai";
import trackersRouter from "./trackers";
import wellnessRouter from "./wellness";
import authRouter from "./auth";
import stripeRouter from "./stripe";
import adminRouter from "./admin";
import lifestyleRouter from "./lifestyle";
import businessRouter from "./business";
import ideasRouter from "./ideas";

const router: IRouter = Router();

/**
 * Gate a router so it only handles requests whose path starts with the given
 * prefix. This prevents routers that apply router.use(requireAuth) globally
 * from intercepting requests meant for other routers (e.g. stripe routes).
 */
function pathGate(prefix: string, handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    if (req.path.startsWith(prefix)) {
      handler(req, res, next);
    } else {
      next();
    }
  };
}

router.use(authRouter);
router.use(healthRouter);
router.use(stripeRouter);
router.use(pathGate("/admin", adminRouter));
router.use(pathGate("/planner", plannerRouter));
router.use(pathGate("/tasks", plannerRouter));
router.use(pathGate("/brain-dumps", plannerRouter));
router.use(pathGate("/ai", aiRouter));
router.use(pathGate("/trackers", trackersRouter));
router.use(pathGate("/reminders", trackersRouter));
router.use(pathGate("/todos", wellnessRouter));
router.use(pathGate("/prayers", wellnessRouter));
router.use(pathGate("/habits", wellnessRouter));
router.use(pathGate("/cycle", lifestyleRouter));
router.use(pathGate("/mood", lifestyleRouter));
router.use(pathGate("/notes", lifestyleRouter));
router.use(pathGate("/vision-board", lifestyleRouter));
router.use(pathGate("/business", businessRouter));
router.use(pathGate("/ideas", ideasRouter));

export default router;
