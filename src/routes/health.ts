import { Router } from "express";
import { getHealth } from "../controllers/health";
import { generalRateLimit } from "../middleware";

const router = Router();

router.use(generalRateLimit);
router.get("/", getHealth);

export default router;
