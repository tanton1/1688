export interface QualityScoreChecklist {
  title: { score: number; max: 10; message?: string };
  translation: { score: number; max: 15; message?: string };
  images: { score: number; max: 15; message?: string };
  skuMapping: { score: number; max: 20; message?: string };
  pricing: { score: number; max: 15; message?: string };
  description: { score: number; max: 10; message?: string };
  category: { score: number; max: 5; message?: string };
  stock: { score: number; max: 5; message?: string };
  supplier: { score: number; max: 5; message?: string };
}

export interface QualityScoreResult {
  totalScore: number; // 0 - 100
  canPublish: boolean;
  checklist: QualityScoreChecklist;
  warnings: string[];
  blockers: string[];
}
