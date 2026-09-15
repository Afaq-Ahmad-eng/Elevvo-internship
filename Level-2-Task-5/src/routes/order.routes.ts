import { Router } from "express";
import { orderController } from "../controllers/order.controller";
import { authenticateToken } from "../middlewares/authenticate-token.middleware";
import { asyncHandler } from "../utils/async-handler.util";

const router = Router();

// Every order route requires a logged-in user — you can't checkout anonymously.
router.use(authenticateToken);

router.post("/", asyncHandler(orderController.checkout));
router.get("/", asyncHandler(orderController.getMyOrders));

export default router;
