import { Router } from "express";
import { listProducts, decrementStock } from "../controllers/product.controller";
import { requireInternalSecret } from "../middleware/internalAuth";

const router = Router();
router.get("/products", listProducts);
router.post("/products/decrement-stock", requireInternalSecret, decrementStock);

export default router;
