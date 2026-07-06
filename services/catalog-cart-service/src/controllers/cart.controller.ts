import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import { Product } from "../models/product.model";
import { getCartRaw, upsertCartItem, removeCartItem, clearCart } from "../models/cartStore";

interface HydratedCartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

async function hydrateCart(userId: string): Promise<{ items: HydratedCartItem[]; subtotal: number }> {
  const raw = await getCartRaw(userId);
  const productIds = Object.keys(raw);

  if (productIds.length === 0) {
    return { items: [], subtotal: 0 };
  }

  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const items: HydratedCartItem[] = [];
  let subtotal = 0;

  for (const productId of productIds) {
    const product = productMap.get(productId);
    const quantity = parseInt(raw[productId], 10);
    if (!product) {
      // Product was deleted from the catalog after being added to a cart —
      // skip it rather than crash; a real UI would surface this to the user.
      continue;
    }
    items.push({
      productId,
      name: product.name,
      price: product.price,
      quantity,
      stock: product.stock,
    });
    subtotal += product.price * quantity;
  }

  return { items, subtotal: Math.round(subtotal * 100) / 100 };
}

export async function getCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId as string;
    const cart = await hydrateCart(userId);
    res.status(200).json({ userId, ...cart });
  } catch (err) {
    next(err);
  }
}

export async function addCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId as string;
    const { productId, quantity } = req.body as { productId?: string; quantity?: number };

    if (!productId || typeof quantity !== "number" || quantity < 1) {
      res.status(400).json({ error: "ValidationError", message: "productId and a positive integer quantity are required" });
      return;
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      res.status(404).json({ error: "NotFound", message: "Product does not exist" });
      return;
    }

    if (product.stock <= 0) {
      res.status(409).json({ error: "OutOfStock", message: "This product is currently out of stock" });
      return;
    }

    const newQuantity = await upsertCartItem(userId, productId, quantity);

    if (newQuantity > product.stock) {
      // Roll back the increment we just made — we don't want a cart quantity
      // that exceeds real stock (Section 5-6 edge case: "stock=0").
      await upsertCartItem(userId, productId, -quantity);
      res.status(409).json({
        error: "InsufficientStock",
        message: `Only ${product.stock} in stock; you already have that in your cart`,
      });
      return;
    }

    const cart = await hydrateCart(userId);
    res.status(200).json({ userId, ...cart });
  } catch (err) {
    next(err);
  }
}

export async function removeCartItemHandler(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId as string;
    const { productId } = req.params;
    await removeCartItem(userId, productId);
    const cart = await hydrateCart(userId);
    res.status(200).json({ userId, ...cart });
  } catch (err) {
    next(err);
  }
}

export async function clearCartHandler(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId as string;
    await clearCart(userId);
    res.status(200).json({ userId, items: [], subtotal: 0 });
  } catch (err) {
    next(err);
  }
}
