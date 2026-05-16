import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RetailerType,
  TransactionCategory,
  useCreateRetailerMutation,
} from "@/graphql/generated/graphql";

export const RETAILER_TYPES: { value: RetailerType; label: string }[] = [
  { value: RetailerType.Restaurant, label: "음식점" },
  { value: RetailerType.Store, label: "가게/쇼핑" },
  { value: RetailerType.Service, label: "서비스" },
  { value: RetailerType.Bank, label: "은행/금융" },
  { value: RetailerType.Income, label: "수입" },
  { value: RetailerType.Person, label: "개인" },
  { value: RetailerType.Etc, label: "기타" },
];

export const TRANSACTION_CATEGORIES: { value: TransactionCategory; label: string }[] = [
  { value: TransactionCategory.EatOut, label: "외식" },
  { value: TransactionCategory.Grocery, label: "식료품" },
  { value: TransactionCategory.Clothing, label: "의류" },
  { value: TransactionCategory.Transportation, label: "교통" },
  { value: TransactionCategory.Medical, label: "의료" },
  { value: TransactionCategory.Leisure, label: "여가" },
  { value: TransactionCategory.Service, label: "서비스" },
  { value: TransactionCategory.Membership, label: "멤버십" },
  { value: TransactionCategory.Housing, label: "주거" },
  { value: TransactionCategory.DailyNecessity, label: "생필품" },
  { value: TransactionCategory.Income, label: "수입" },
  { value: TransactionCategory.Transfer, label: "이체" },
  { value: TransactionCategory.Stock, label: "주식" },
  { value: TransactionCategory.Cash, label: "현금" },
  { value: TransactionCategory.Present, label: "선물" },
  { value: TransactionCategory.Parenting, label: "육아" },
  { value: TransactionCategory.Interest, label: "이자" },
  { value: TransactionCategory.Etc, label: "기타" },
];

interface CreateRetailerFormProps {
  onSuccess: (retailer: { id: string; name: string; category: string }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function CreateRetailerForm({
  onSuccess,
  onCancel,
  submitLabel = "추가",
}: CreateRetailerFormProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<RetailerType>(RetailerType.Etc);
  const [category, setCategory] = useState<TransactionCategory>(TransactionCategory.Etc);

  const [createRetailer, { loading }] = useCreateRetailerMutation({
    onCompleted: (data) => {
      onSuccess({
        id: data.createRetailer.id,
        name: data.createRetailer.name,
        category: data.createRetailer.category,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createRetailer({ variables: { name, type, category } });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="retailer-name">가맹점명</Label>
        <Input
          id="retailer-name"
          placeholder="예: 스타벅스"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="retailer-type">유형</Label>
        <Select value={type} onValueChange={(v) => setType(v as RetailerType)}>
          <SelectTrigger id="retailer-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RETAILER_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="retailer-category">거래 분류</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as TransactionCategory)}>
          <SelectTrigger id="retailer-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSACTION_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit" size="sm" disabled={loading || !name}>
          {loading ? "저장 중..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
