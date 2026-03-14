import { supabase } from "./supabase";
import type { PricePost, Favorite, ShoppingGroup, PointEntry, Category } from "../types";

const MIGRATED_KEY = "kagotoku_supabase_migrated";

export function hasMigrated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(MIGRATED_KEY) === "true";
}

/** localStorageのデータをSupabaseに移行（初回ログイン時のみ） */
export async function migrateToSupabase(userId: string): Promise<void> {
  if (hasMigrated()) return;

  try {
    // 1. プロフィール
    const profileRaw = localStorage.getItem("kagotoku_profile");
    if (profileRaw) {
      const p = JSON.parse(profileRaw);
      await supabase
        .from("profiles")
        .upsert({
          id: userId,
          nickname: p.nickname || "",
          points: p.points || 0,
          post_count: p.postCount || 0,
        });
    }

    // 2. 価格投稿
    const postsRaw = localStorage.getItem("kagotoku_prices");
    if (postsRaw) {
      const posts: PricePost[] = JSON.parse(postsRaw);
      if (posts.length > 0) {
        const rows = posts.map((p) => ({
          user_id: userId,
          product_name: p.productName,
          store_name: p.storeName,
          price: p.price,
          location: p.location || "",
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          category: p.category || "other",
          posted_at: p.postedAt,
        }));
        // バッチで挿入（最大100件ずつ）
        for (let i = 0; i < rows.length; i += 100) {
          await supabase.from("price_posts").insert(rows.slice(i, i + 100));
        }
      }
    }

    // 3. お気に入り
    const favsRaw = localStorage.getItem("kagotoku_favorites");
    if (favsRaw) {
      const favs: Favorite[] = JSON.parse(favsRaw);
      if (favs.length > 0) {
        const rows = favs.map((f) => ({
          user_id: userId,
          product_name: f.productName,
          target_price: f.targetPrice,
          added_at: f.addedAt,
        }));
        await supabase.from("favorites").insert(rows);
      }
    }

    // 4. 買い物リスト
    const shoppingRaw = localStorage.getItem("kagotoku_shopping_list");
    if (shoppingRaw) {
      const data = JSON.parse(shoppingRaw);
      const groups: ShoppingGroup[] = Array.isArray(data) && data.length > 0 && "items" in data[0]
        ? data
        : [];
      for (const g of groups) {
        const { data: inserted } = await supabase
          .from("shopping_groups")
          .insert({ user_id: userId, name: g.name, created_at: g.createdAt })
          .select("id")
          .single();
        if (inserted && g.items.length > 0) {
          const items = g.items.map((item) => ({
            group_id: inserted.id,
            user_id: userId,
            product_name: item.productName,
            completed: item.completed,
            added_at: item.addedAt,
            completed_at: item.completedAt,
          }));
          await supabase.from("shopping_items").insert(items);
        }
      }
    }

    // 5. ポイント履歴
    const pointsRaw = localStorage.getItem("kagotoku_points_history");
    if (pointsRaw) {
      const entries: PointEntry[] = JSON.parse(pointsRaw);
      if (entries.length > 0) {
        const rows = entries.map((e) => ({
          user_id: userId,
          amount: e.amount,
          consumed: e.consumed,
          earned_at: e.earnedAt,
          expires_at: e.expiresAt,
        }));
        await supabase.from("point_entries").insert(rows);
      }
    }

    localStorage.setItem(MIGRATED_KEY, "true");
  } catch (err) {
    console.error("Migration error:", err);
  }
}

// ===== Supabase CRUD ヘルパー =====

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

function fourteenDaysAgoISO(): string {
  return new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();
}

function mapRowToPost(row: Record<string, unknown>): PricePost {
  return {
    id: row.id as string,
    productName: row.product_name as string,
    storeName: row.store_name as string,
    price: row.price as number,
    location: (row.location as string) || "",
    lat: (row.lat as number) ?? undefined,
    lng: (row.lng as number) ?? undefined,
    category: ((row.category as string) || "other") as Category,
    postedAt: row.posted_at as string,
  };
}

/** 共有価格投稿を検索（14日以内） */
export async function fetchSharedPosts(productName?: string): Promise<PricePost[]> {
  let query = supabase
    .from("price_posts")
    .select("*")
    .gte("posted_at", fourteenDaysAgoISO())
    .order("posted_at", { ascending: false })
    .limit(200);

  if (productName) {
    query = query.ilike("product_name", `%${productName}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("fetchSharedPosts error:", error);
    return [];
  }
  return (data ?? []).map(mapRowToPost);
}

/** 最近の共有投稿を取得（14日以内） */
export async function fetchRecentSharedPosts(limit: number = 8): Promise<PricePost[]> {
  const { data, error } = await supabase
    .from("price_posts")
    .select("*")
    .gte("posted_at", fourteenDaysAgoISO())
    .order("posted_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("fetchRecentSharedPosts error:", error);
    return [];
  }
  return (data ?? []).map(mapRowToPost);
}

/** 共有価格投稿を追加（未ログイン時はuser_id=null） */
export async function insertSharedPost(
  userId: string | null,
  post: Omit<PricePost, "id" | "postedAt">
): Promise<PricePost | null> {
  const { data, error } = await supabase
    .from("price_posts")
    .insert({
      user_id: userId,
      product_name: post.productName,
      store_name: post.storeName,
      price: post.price,
      location: post.location || "",
      lat: post.lat ?? null,
      lng: post.lng ?? null,
      category: post.category || "other",
    })
    .select()
    .single();

  if (error) {
    console.error("insertSharedPost error:", error);
    return null;
  }
  return data ? mapRowToPost(data) : null;
}

/** プロフィールを同期 */
export async function syncProfile(
  userId: string,
  data: { nickname?: string; points?: number; post_count?: number }
): Promise<void> {
  await supabase.from("profiles").upsert({ id: userId, ...data });
}
