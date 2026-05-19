import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useCreditCardsQuery,
  useUnlinkedCreditCardAccountsQuery,
  useCreateCreditCardMutation,
} from "@/graphql/generated/graphql";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function getNumericId(globalId: string) {
  return atob(globalId).split(":")[1];
}

export function CreditCardsPage() {
  const { data, loading, refetch } = useCreditCardsQuery();
  const { data: unlinkedData, refetch: refetchUnlinked } =
    useUnlinkedCreditCardAccountsQuery();
  const [createCreditCard] = useCreateCreditCardMutation();

  const [showForm, setShowForm] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [annualFee, setAnnualFee] = useState("");
  const [notes, setNotes] = useState("");

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const cards = data?.creditCardRelay.edges.map((e) => e.node) ?? [];
  const linkedAccountIds = new Set(cards.map((c) => c.account.id));
  const unlinkedAccounts =
    unlinkedData?.accountRelay.edges
      .map((e) => e.node)
      .filter((a) => !linkedAccountIds.has(a.id)) ?? [];

  const handleCreate = async () => {
    if (!selectedAccountId) return;
    try {
      await createCreditCard({
        variables: {
          accountId: selectedAccountId,
          annualFee: annualFee || "0",
          issueDate: null,
          expiryDate: null,
          notes,
        },
      });
      setShowForm(false);
      setSelectedAccountId("");
      setAnnualFee("");
      setNotes("");
      refetch();
      refetchUnlinked();
    } catch (e) {
      alert(e instanceof Error ? e.message : "생성 실패");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">신용카드 혜택</h1>
          <p className="text-muted-foreground">카드별 혜택 및 계좌 정보</p>
        </div>
        {unlinkedAccounts.length > 0 && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "취소" : "카드 등록"}
          </Button>
        )}
      </div>

      {showForm && unlinkedAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">신용카드 등록</CardTitle>
            <CardDescription>
              연동되지 않은 신용카드 계좌를 선택하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>계좌 선택</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  <option value="">-- 선택 --</option>
                  {unlinkedAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bank.name} - {acc.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>연회비 (원)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={annualFee}
                  onChange={(e) => setAnnualFee(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Input
                placeholder="카드 특징, 전월실적 조건 등"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={!selectedAccountId}>
              등록
            </Button>
          </CardContent>
        </Card>
      )}

      {cards.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            등록된 신용카드가 없습니다.
            {unlinkedAccounts.length > 0 && " 위의 '카드 등록' 버튼으로 추가하세요."}
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
                        to={`/accounts/${btoa(`AccountNode:${getNumericId(card.account.id)}`)}`}
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
