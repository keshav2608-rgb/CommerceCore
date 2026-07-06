import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getCart, addCartItem, removeCartItemHandler, clearCartHandler } from "../controllers/cart.controller";

const router = Router();

router.get("/cart", requireAuth, getCart);
router.post("/cart/items", requireAuth, addCartItem);
router.delete("/cart/items/:productId", requireAuth, removeCartItemHandler);
router.delete("/cart", requireAuth, clearCartHandler);

export default router;
