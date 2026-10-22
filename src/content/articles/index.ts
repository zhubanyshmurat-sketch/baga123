import type { Article } from "@/lib/content/types";
import { careerAnxietyArticles } from "./career-anxiety";
import { dormitoryArticles } from "./dormitory";
import { examAnxietyArticles } from "./exam-anxiety";
import { motivationArticles } from "./motivation";
import { selfEsteemArticles } from "./self-esteem";
import { sleepNutritionArticles } from "./sleep-nutrition";
import { timeManagementArticles } from "./time-management";

export const articles: Article[] = [
  ...examAnxietyArticles,
  ...motivationArticles,
  ...timeManagementArticles,
  ...dormitoryArticles,
  ...sleepNutritionArticles,
  ...careerAnxietyArticles,
  ...selfEsteemArticles,
];
