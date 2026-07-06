// Product schema for the catalog (Section 12-16 of the roadmap).
// Mongo is chosen here because product attributes vary by category
// (variants, custom attributes) — a flexible document shape fits better
// than a rigid relational schema.
import { Schema, model, Document } from "mongoose";

export interface ProductAttributes {
  [key: string]: string | number | boolean;
}

export interface ProductDocument extends Document {
  name: string;
  description: string;
  price: number;
  stock: number;
  variants: string[];
  attributes: ProductAttributes;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDocument>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    variants: { type: [String], default: [] },
    attributes: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Text index powers the `search` query param on GET /products (Section 16).
productSchema.index({ name: "text", description: "text" });
// Supports filtering/sorting by price efficiently (Section 27 perf requirement).
productSchema.index({ price: 1 });

export const Product = model<ProductDocument>("Product", productSchema);
