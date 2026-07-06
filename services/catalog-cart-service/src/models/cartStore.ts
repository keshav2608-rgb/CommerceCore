// Cart storage: one Redis hash per user (`cart:<userId>`), mapping
// productId -> quantity. Redis is the right fit here per Section 9 of the
// roadmap — cart state is ephemeral and doesn't need relational guarantees.
// A sliding TTL means an abandoned cart quietly expires instead of growing
// forever (Section 5-6 edge case: "TTL expiry").
import { redisClient } from "../config/redis";
import { env } from "../config/env";

function cartKey(userId: string): string {
  return `cart:${userId}`;
}

export async function getCartRaw(userId: string): Promise<Record<string, string>> {
  return redisClient.hgetall(cartKey(userId));
}

export async function upsertCartItem(
  userId: string,
  productId: string,
  quantityDelta: number
): Promise<number> {
  const key = cartKey(userId);
  // HINCRBY is atomic, so concurrent "add to cart" clicks from the same user
  // (e.g. double-clicked button, two tabs) can't race each other into a lost update.
  const newQuantity = await redisClient.hincrby(key, productId, quantityDelta);
  await redisClient.expire(key, env.cartTtlSeconds);
  return newQuantity;
}

export async function setCartItem(userId: string, productId: string, quantity: number): Promise<void> {
  const key = cartKey(userId);
  await redisClient.hset(key, productId, quantity);
  await redisClient.expire(key, env.cartTtlSeconds);
}

export async function removeCartItem(userId: string, productId: string): Promise<void> {
  await redisClient.hdel(cartKey(userId), productId);
}

export async function clearCart(userId: string): Promise<void> {
  await redisClient.del(cartKey(userId));
}
