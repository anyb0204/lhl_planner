import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth, createClerkClient } from "@clerk/express";
import { requireAuth } from "../middlewares/requireAuth";
import { z } from "zod/v4";

const router: IRouter = Router();

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

router.get("/auth/user", (req: Request, res: Response) => {
  const auth = getAuth(req);
  res.json({
    user: auth?.userId ? { id: auth.userId } : null,
  });
});

const profileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
});

router.patch("/auth/profile", requireAuth, async (req: Request, res: Response) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  try {
    const updated = await clerkClient.users.updateUser(req.user!.id, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    });
    res.json({ firstName: updated.firstName, lastName: updated.lastName });
  } catch (err) {
    req.log.error({ err }, "Failed to update user profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
