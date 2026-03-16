import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

/** 月額300円のサブスクリプション Price ID（初回に自動作成） */
let cachedPriceId: string | null = null;

export async function getOrCreatePriceId(): Promise<string> {
  if (cachedPriceId) return cachedPriceId;

  // 既存のPrice検索
  const prices = await stripe.prices.list({
    lookup_keys: ["kagotoku_premium_monthly"],
    active: true,
    limit: 1,
  });

  if (prices.data.length > 0) {
    cachedPriceId = prices.data[0].id;
    return cachedPriceId;
  }

  // Product + Price を作成
  const product = await stripe.products.create({
    name: "カゴトク プレミアム",
    description: "広告非表示・価格アラート無制限",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 300,
    currency: "jpy",
    recurring: { interval: "month" },
    lookup_key: "kagotoku_premium_monthly",
  });

  cachedPriceId = price.id;
  return cachedPriceId;
}
