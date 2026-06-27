import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import { stripeStorage } from "../lib/stripeStorage";

const router = Router();

router.get("/scholarship/status", requireAuth, async (req, res) => {
  try {
    const user = await stripeStorage.getUser(req.user!.id);
    const request = await stripeStorage.getScholarshipRequest(req.user!.id);
    res.json({
      scholarshipStatus: user?.scholarshipStatus ?? null,
      applicationExists: !!request,
      applicationStatus: request?.status ?? null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/scholarship/apply", requireAuth, async (req, res) => {
  try {
    const user = await stripeStorage.getUser(req.user!.id);

    if (user?.scholarshipStatus === "approved") {
      res.status(400).json({ error: "You already have scholarship access." });
      return;
    }

    const existing = await stripeStorage.getScholarshipRequest(req.user!.id);
    if (existing) {
      res.status(400).json({ error: "Application already submitted.", status: existing.status });
      return;
    }

    const { story } = req.body as { story?: string };
    const request = await stripeStorage.createScholarshipRequest(req.user!.id, story);
    await stripeStorage.updateScholarshipStatus(req.user!.id, "pending");

    res.json({ success: true, status: request.status });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
