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
