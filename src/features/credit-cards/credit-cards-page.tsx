import { Link } from "react-router-dom";
import { useCreditCardsQuery } from "@/graphql/generated/graphql";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const BENEFIT_CATEGORY_LABELS: Record<string, string> = {
  CASHBACK: "캐시백",
  POINTS: "포인트",
  DISCOUNT: "할인",
  MILEAGE: "마일리지",
  OTHER: "기타",
};

const BENEFIT_CATEGORY_COLORS: Record<string, string> = {
  CASHBACK: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  POINTS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  DISCOUNT: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  MILEAGE: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

function formatAmount(amount: string) {
  const num = Number.parseFloat(amount);
  return new Intl.NumberFormat("ko-KR").format(num);
}

export function CreditCardsPage() {
  const { data, loading } = useCreditCardsQuery();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const cards = data?.creditCardRelay.edges.map((e) => e.node) ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">신용카드 혜택</h1>
        <p className="text-muted-foreground">카드별 혜택 및 계좌 정보</p>
      </div>

      {cards.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            등록된 신용카드가 없습니다. Admin에서 CreditCard를 추가해주세요.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((card) => (
            <Card key={card.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      <Link
                        to={`/accounts/${btoa(`AccountNode:${atob(card.account.id).split(":")[1]}`)}`}
                        className="hover:underline"
                      >
                        {card.account.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>{card.account.bank.name}</CardDescription>
                  </div>
                  <Badge variant={card.account.isActive ? "default" : "secondary"}>
                    {card.account.isActive ? "활성" : "비활성"}
                  </Badge>
                </div>
                <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                  <span>연회비: ₩{formatAmount(card.annualFee)}</span>
                  {card.issueDate && <span>발급: {card.issueDate}</span>}
                  {card.expiryDate && <span>만료: {card.expiryDate}</span>}
                </div>
                <div className="mt-1 text-sm">
                  현재 잔액:{" "}
                  <span className="font-semibold text-red-600">
                    ₩{formatAmount(card.account.amount)}
                  </span>
                </div>
                {card.account.lastTransaction && (
                  <div className="text-xs text-muted-foreground">
                    마지막 거래: {card.account.lastTransaction}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {card.benefits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">등록된 혜택이 없습니다.</p>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">혜택 목록</h4>
                    {card.benefits.map((benefit) => (
                      <div
                        key={benefit.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BENEFIT_CATEGORY_COLORS[benefit.category] ?? BENEFIT_CATEGORY_COLORS.OTHER}`}
                          >
                            {BENEFIT_CATEGORY_LABELS[benefit.category] ?? benefit.category}
                          </span>
                          <span className="font-medium">{benefit.title}</span>
                          {benefit.rate && (
                            <span className="ml-auto font-bold text-green-600">
                              {benefit.rate}%
                            </span>
                          )}
                        </div>
                        {benefit.description && (
                          <p className="mt-1 text-muted-foreground">{benefit.description}</p>
                        )}
                        <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                          {benefit.capAmount && (
                            <span>월 한도: ₩{formatAmount(benefit.capAmount)}</span>
                          )}
                          {benefit.conditions && <span>조건: {benefit.conditions}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {card.notes && (
                  <div className="mt-3 rounded bg-muted p-2 text-xs text-muted-foreground">
                    {card.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
