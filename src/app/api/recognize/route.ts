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
      max_tokens: 512,
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
              text: `この画像に写っている商品を認識してください。
JSON形式のみで回答してください。マークダウンのコードブロックや説明文は不要です。
{"productName": "商品名", "price": 数値または null}
- productName: 商品の一般的な名前（例：「牛乳」「食パン」「卵」）
- price: 価格が見える場合は数値、見えない場合はnull
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

    // マークダウンコードブロックを除去
    const cleaned = text.replace(/```json\s*/g, "").replace(/```/g, "").trim();

    // JSON抽出（フラットなオブジェクト）
    const jsonMatch = cleaned.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      console.error("JSON extraction failed. Raw text:", text);
      return NextResponse.json(
        { error: "認識結果を解析できませんでした" },
        { status: 500 }
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (e) {
    console.error("recognize error:", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました", detail: message },
      { status: 500 }
    );
  }
}
