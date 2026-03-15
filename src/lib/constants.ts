import { TransactionCategory } from "@/graphql/generated/graphql";

export const CATEGORY_LABELS: Record<string, string> = {
  [TransactionCategory.EatOut]: "외식",
  [TransactionCategory.Grocery]: "식료품",
  [TransactionCategory.Clothing]: "의류",
  [TransactionCategory.Transportation]: "교통",
  [TransactionCategory.Medical]: "의료",
  [TransactionCategory.Leisure]: "여가",
  [TransactionCategory.Service]: "서비스",
  [TransactionCategory.Membership]: "멤버십",
  [TransactionCategory.Housing]: "주거",
  [TransactionCategory.DailyNecessity]: "생필품",
  [TransactionCategory.Income]: "수입",
  [TransactionCategory.Transfer]: "이체",
  [TransactionCategory.Stock]: "주식",
  [TransactionCategory.Cash]: "현금",
  [TransactionCategory.Present]: "선물",
  [TransactionCategory.Parenting]: "육아",
  [TransactionCategory.Interest]: "이자",
  [TransactionCategory.Etc]: "기타",
};
