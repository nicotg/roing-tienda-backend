import crypto from 'crypto';

export type CartItemLike = { id: string | number; quantity: number };


export function buildIdempotencyKey(
  userId: string | number,
  items: CartItemLike[],
  operation: 'checkout' | 'payment' | 'checkout',
): string {
  
    const normalized = items
    .map((i) => ({ id: Number(i.id), quantity: Number(i.quantity) }))
    .sort((a, b) => a.id - b.id);

    const payload = JSON.stringify({ userId: String(userId), items: normalized });
    const hash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32);

    return `${operation}:${String(userId)}:${hash}`;
}
