// One-off script: populates Mongo with sample products for local dev/demo.
// Run with: npm run seed (inside services/catalog-cart-service)
import mongoose from "mongoose";
import { env } from "../config/env";
import { Product } from "../models/product.model";

const categories = [
  "Running Shoes",
  "Wireless Headphones",
  "Backpack",
  "Water Bottle",
  "Desk Lamp",
  "Mechanical Keyboard",
  "Office Chair",
  "Yoga Mat",
  "Coffee Grinder",
  "Bluetooth Speaker",
];

function sampleProducts() {
  const products = [];
  for (let i = 0; i < 30; i += 1) {
    const category = categories[i % categories.length];
    products.push({
      name: `${category} - Model ${Math.floor(i / categories.length) + 1}`,
      description: `A durable, well-reviewed ${category.toLowerCase()} suited for everyday use.`,
      price: Math.round((10 + Math.random() * 190) * 100) / 100,
      stock: Math.floor(Math.random() * 100),
      variants: ["Standard", "Pro"].slice(0, 1 + (i % 2)),
      attributes: {
        brand: `Brand${(i % 5) + 1}`,
        color: ["Black", "White", "Blue", "Red"][i % 4],
      },
    });
  }
  return products;
}

async function seed(): Promise<void> {
  await mongoose.connect(env.mongoUri);
  console.log("Connected to Mongo — seeding products...");

  await Product.deleteMany({});
  const inserted = await Product.insertMany(sampleProducts());

  console.log(`Seeded ${inserted.length} products.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
