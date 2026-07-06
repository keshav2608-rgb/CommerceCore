// Handles GET /products — search, price filter, and pagination (Section 16/D6).
import { Request, Response, NextFunction } from "express";
import { Product } from "../models/product.model";

export async function listProducts(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { search, minPrice, maxPrice } = req.query;
    const page = Math.max(parseInt((req.query.page as string) ?? "1", 10), 1);
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) ?? "20", 10), 1), 100);

    const filter: Record<string, unknown> = {};

    if (typeof search === "string" && search.trim().length > 0) {
      filter.$text = { $search: search.trim() };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (minPrice !== undefined) priceFilter.$gte = Number(minPrice);
      if (maxPrice !== undefined) priceFilter.$lte = Number(maxPrice);
      filter.price = priceFilter;
    }

    const [items, total] = await Promise.all([
      Product.find(filter)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({ items, page, limit, total });
  } catch (err) {
    next(err);
  }
}

interface DecrementItem {
  productId: string;
  quantity: number;
}

// Internal-only endpoint (guarded by requireInternalSecret middleware):
// order-payment-service calls this after a Postgres order transaction commits.
// NOTE: this happens as a separate call, not inside the same ACID transaction
// as the order write — Mongo and Postgres can't share a transaction. That's an
// intentional Month-1 simplification (documented in Section 4/27-28 of the
// roadmap); the Month-2 fix is an event-driven saga (order-service publishes
// OrderPlaced, catalog-service consumes it and decrements stock, with a
// compensating action if it fails).
export async function decrementStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { items } = req.body as { items?: DecrementItem[] };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "ValidationError", message: "items[] is required" });
      return;
    }

    const results: { productId: string; success: boolean }[] = [];

    for (const item of items) {
      // The stock >= quantity guard in the filter makes this a conditional
      // update — it can never push stock negative even under concurrent orders.
      const updated = await Product.findOneAndUpdate(
        { _id: item.productId, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
      results.push({ productId: item.productId, success: updated !== null });
    }

    const allSucceeded = results.every((r) => r.success);
    res.status(allSucceeded ? 200 : 409).json({ results });
  } catch (err) {
    next(err);
  }
}
