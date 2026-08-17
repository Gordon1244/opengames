export type Game = {
  id: string; slug: string; title: string; titleEn: string; creator: string; creatorHandle: string;
  description: string; category: string; tags: string[]; plays: number; badge: string;
  art: "tide" | "orbit" | "garden" | "void"; license: string; allowDownload: boolean;
  sourceUrl?: string; version: string; playUrl: string; releaseId?: string;
};

export const demoGames: Game[] = [
  { id: "demo-void-runner", slug: "void-runner", title: "Void Runner", titleEn: "Void Runner", creator: "OpenGames Lab", creatorHandle: "opengames", description: "穿越無盡星門，在速度與節奏之間找到唯一安全的路線。支援鍵盤與觸控。", category: "動作", tags: ["街機", "太空", "單人"], plays: 8241, badge: "本週精選", art: "void", license: "MIT", allowDownload: true, sourceUrl: "https://github.com/Gordon1244/opengames", version: "1.0.0", playUrl: "/demo/void-runner/index.html" },
  { id: "demo-neon-tideline", slug: "neon-tideline", title: "Neon Tideline", titleEn: "Neon Tideline", creator: "Morrow Studio", creatorHandle: "morrow", description: "跟著潮汐脈動，在變形的色彩海岸收集散落的訊號。", category: "節奏冒險", tags: ["節奏", "氛圍", "短篇"], plays: 6214, badge: "編輯精選", art: "tide", license: "CC BY-NC 4.0", allowDownload: false, version: "0.9.2", playUrl: "/demo/neon-tideline/index.html" },
  { id: "demo-orbital-common", slug: "orbital-common", title: "Orbital Common", titleEn: "Orbital Common", creator: "Ada & Finch", creatorHandle: "ada-finch", description: "在微型星系裡配置軌道，讓每一顆行星都找到共存的位置。", category: "策略", tags: ["益智", "太空", "開源"], plays: 4832, badge: "開放原始碼", art: "orbit", license: "MIT", allowDownload: true, sourceUrl: "https://github.com/Gordon1244/opengames", version: "1.2.0", playUrl: "/demo/orbital-common/index.html" },
  { id: "demo-moon-garden", slug: "moon-garden", title: "Moon Garden", titleEn: "Moon Garden", creator: "Soft Relay", creatorHandle: "soft-relay", description: "在月光落下以前，照料一座只在夜晚生長的小花園。", category: "休閒", tags: ["療癒", "模擬", "短篇"], plays: 3941, badge: "新作", art: "garden", license: "All rights reserved", allowDownload: false, version: "1.0.1", playUrl: "/demo/moon-garden/index.html" },
];

export function findDemoGame(slug: string) { return demoGames.find((game) => game.slug === slug); }
