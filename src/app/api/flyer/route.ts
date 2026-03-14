import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY が設定されていません。" },
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

    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "無効な画像フォーマットです" },
        { status: 400 }
      );
    }
    const mediaType = match[1] as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    const base64Data = match[2];

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
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
              text: `このチラシ画像から特売商品と価格を読み取ってください。以下のJSON形式のみで回答してください。
マークダウンのコードブロックや説明文は不要です。

{"storeName": "店舗名", "items": [{"name": "商品名", "price": 数値, "originalPrice": 数値またはnull, "note": "備考またはnull"}]}

- name: 商品の一般的な名前（例：「牛乳」「食パン」「卵」）
- price: 特売価格（税込）。数値のみ。
- originalPrice: 通常価格が記載されている場合は数値、なければnull
- note: 「限定○個」「○日まで」など補足情報があれば記載、なければnull
- 最大20件まで抽出してください
- 価格が不明な場合はその商品をスキップしてください

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

    const cleaned = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();
    const jsonStr = extractJson(cleaned);
    if (!jsonStr) {
      console.error("JSON extraction failed. Raw text:", text);
      return NextResponse.json(
        { error: "認識結果を解析できませんでした" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonStr);
    return NextResponse.json(result);
  } catch (e) {
    console.error("flyer recognize error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました", detail: msg },
      { status: 500 }
    );
  }
}

function extractJson(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}
