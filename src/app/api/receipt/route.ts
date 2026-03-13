import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません。.env.local を確認してください。" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const image: string | undefined = body?.image;
    if (!image) {
      return NextResponse.json(
        { error: "画像データがありません" },
        { status: 400 }
      );
    }

    // base64 data URL → raw base64 + media type
    // image/jpeg, image/png, image/webp, image/heic etc.
    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "無効な画像フォーマットです" },
        { status: 400 }
      );
    }
    const mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const base64Data = match[2];

    const today = new Date().toISOString().slice(0, 10);

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64Data,
              },
            },
            {
              type: "text",
              text: `このレシート画像から以下の情報を抽出してください。
JSON形式のみで回答してください。マークダウンのコードブロックや説明文は不要です。

{
  "storeName": "店名",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "商品名", "price": 数値, "category": "food|daily|drink|other"}
  ],
  "total": 合計金額
}

カテゴリの分類基準:
- food: 食品（肉、魚、野菜、果物、パン、米、調味料など）
- daily: 日用品（洗剤、ティッシュ、歯ブラシなど）
- drink: 飲料（ジュース、お茶、牛乳、コーヒーなど）
- other: その他

日付が読めない場合は今日の日付を使ってください: ${today}
JSONのみを返してください。`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    const text: string = textBlock && "text" in textBlock ? textBlock.text : "";

    if (!text) {
      return NextResponse.json(
        { error: "AIからの応答が空でした" },
        { status: 500 }
      );
    }

    // マークダウンコードブロックを除去してからJSON抽出
    const cleaned = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();

    // ネストされたJSONに対応: 最初の { から対応する } までをバランスで抽出
    const jsonStr = extractJson(cleaned);
    if (!jsonStr) {
      console.error("JSON extraction failed. Raw text:", text);
      return NextResponse.json(
        { error: "レシートを解析できませんでした", rawText: text.slice(0, 300) },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonStr);
    return NextResponse.json(result);
  } catch (e) {
    console.error("receipt error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました", detail: message },
      { status: 500 }
    );
  }
}

/** 括弧のバランスを見て最初の完全なJSONオブジェクトを抽出 */
function extractJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }
  return null;
}
