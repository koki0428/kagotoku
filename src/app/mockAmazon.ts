import { AmazonProduct } from "./types";

const mockData: Record<string, AmazonProduct[]> = {
  牛乳: [
    { title: "明治おいしい牛乳 900ml", price: 268, url: "#", image: "" },
    { title: "森永のおいしい牛乳 1L", price: 299, url: "#", image: "" },
  ],
  食パン: [
    { title: "超熟 6枚切", price: 198, url: "#", image: "" },
    { title: "ダブルソフト 6枚切", price: 248, url: "#", image: "" },
  ],
  卵: [
    { title: "国産たまご 10個入り", price: 298, url: "#", image: "" },
    { title: "平飼い卵 10個パック", price: 498, url: "#", image: "" },
  ],
  洗剤: [
    { title: "アタックZERO 本体 400g", price: 327, url: "#", image: "" },
    { title: "アリエール ジェルボール 17個", price: 398, url: "#", image: "" },
  ],
};

export function searchAmazon(query: string): AmazonProduct[] {
  const key = Object.keys(mockData).find((k) => query.includes(k));
  if (key) return mockData[key];
  // デフォルト: 検索語をそのまま使ったダミー結果
  return [
    { title: `${query}（Amazon出品）`, price: 500, url: "#", image: "" },
    { title: `${query} お得パック`, price: 780, url: "#", image: "" },
  ];
}
