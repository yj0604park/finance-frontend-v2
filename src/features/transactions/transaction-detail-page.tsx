import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import {
  useGetTransactionQuery,
  useGetRetailerListQuery,
} from "@/graphql/generated/graphql";
import { formatCurrency, getDisplayColor } from "@/lib/format";
import { CATEGORY_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CheckCircle2, Circle, RefreshCw, Save } from "lucide-react";

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

async function toggleReviewedApi(numericId: string): Promise<void> {
  await fetch(`/money/toggle_reviewed/${numericId}/`, {
    method: "GET",
    credentials: "include",
    headers: { "X-CSRFToken": getCsrfToken() },
  });
}

function formatDateSafe(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "yyyy-MM-dd");
  } catch {
    return dateStr;
  }
}

export function TransactionDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();

  // Decode URL-encoded GlobalID → numeric ID, or use numeric ID directly
  const numericId = useMemo(() => {
    if (!transactionId) return null;
    // Try to decode as GlobalID first
    try {
      const decoded = atob(decodeURIComponent(transactionId));
      const parts = decoded.split(":");
      if (parts.length >= 2 && parts[1]) return parts[1];
    } catch {
      // not base64
    }
    // Fallback: if it looks like a numeric ID, use directly
    if (/^\d+$/.test(transactionId)) return transactionId;
    return null;
  }, [transactionId]);

  const { data, loading, error } = useGetTransactionQuery({
    variables: { id: numericId },
    skip: !numericId,
  });

  const { data: retailerData } = useGetRetailerListQuery();
  const allRetailers = retailerData?.retailerRelay?.edges ?? [];

  const tx = data?.transactionRelay?.edges?.[0]?.node;

  // Edit form state — initialized from tx when it loads
  const [editCategory, setEditCategory] = useState<string | null>(null);
  const [editRetailerId, setEditRetailerId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState<string | null>(null);
  const [editIsInternal, setEditIsInternal] = useState<boolean | null>(null);

  // Reviewed toggle state
  const [localReviewed, setLocalReviewed] = useState<boolean | null>(null);
  const [togglingReviewed, setTogglingReviewed] = useState(false);

  // Saving state
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Derived display values (prefer edit state, fall back to loaded data)
  const displayCategory = editCategory ?? tx?.type ?? "";
  const displayRetailerId = editRetailerId ?? tx?.retailer?.id ?? "";
  const displayNote = editNote ?? tx?.note ?? "";
  const displayIsInternal = editIsInternal ?? tx?.isInternal ?? false;
  const displayReviewed = localReviewed ?? tx?.reviewed ?? false;

  const currency = tx?.account?.currency ?? "KRW";

  const handleToggleReviewed = useCallback(async () => {
    if (!numericId) return;
    setTogglingReviewed(true);
    try {
      await toggleReviewedApi(numericId);
      setLocalReviewed((prev) => {
        const current = prev ?? tx?.reviewed ?? false;
        return !current;
      });
    } catch (e) {
      console.error("Failed to toggle reviewed", e);
    } finally {
      setTogglingReviewed(false);
    }
  }, [numericId, tx?.reviewed]);

  const handleSave = useCallback(async () => {
    // TODO: Add updateTransaction mutation to backend when available.
    // Currently there is no updateTransaction GraphQL mutation, so we show a message.
    setSaving(true);
    try {
      // Simulate async save
      await new Promise((r) => setTimeout(r, 300));
      setSaveMessage("수정 기능 미지원 — 백엔드 mutation이 필요합니다.");
    } finally {
      setSaving(false);
    }
  }, []);

  if (!transactionId || !numericId) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        거래를 찾을 수 없습니다.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-destructive">
        거래 로드 실패: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        {loading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold tracking-tight">
              {tx?.retailer?.name ?? formatDateSafe(tx?.date ?? "")}
            </h1>
            <Badge variant="outline">{CATEGORY_LABELS[tx?.type ?? ""] ?? tx?.type ?? ""}</Badge>
            {displayReviewed ? (
              <Badge className="bg-green-500/15 text-green-700 border-green-300">검토 완료</Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-300">미검토</Badge>
            )}
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">날짜</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <p className="text-lg font-semibold">{formatDateSafe(tx?.date ?? "")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">계좌</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-40" />
            ) : (
              <div>
                <p className="text-lg font-semibold">{tx?.account?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{tx?.account?.bank?.name ?? ""}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">가맹점</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-32" />
            ) : (
              <p className="text-lg font-semibold">{tx?.retailer?.name ?? "—"}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">금액</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className={`text-2xl font-bold font-mono ${getDisplayColor(tx?.amount ?? "0")}`}>
                {formatCurrency(tx?.amount ?? "0", currency)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">잔액</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <p className="text-2xl font-bold font-mono text-muted-foreground">
                {tx?.balance ? formatCurrency(tx.balance, currency) : "—"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">메모</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <p className="text-sm">{tx?.note ?? <span className="text-muted-foreground">—</span>}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Flags */}
      <Card>
        <CardHeader>
          <CardTitle>플래그</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-8 w-40" />
            </div>
          ) : (
            <>
              {/* Reviewed toggle — bidirectional on this page */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">검토 완료</Label>
                  <p className="text-sm text-muted-foreground">
                    이 페이지에서는 검토 완료 취소도 가능합니다.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {togglingReviewed && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <button
                    type="button"
                    onClick={handleToggleReviewed}
                    disabled={togglingReviewed}
                    className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                  >
                    {displayReviewed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6" />
                    )}
                  </button>
                </div>
              </div>

              {/* requiresDetail — read-only display */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">세부 필요</Label>
                  <p className="text-sm text-muted-foreground">세부 정보가 필요한 거래</p>
                </div>
                <Switch
                  checked={tx?.requiresDetail ?? false}
                  disabled
                  aria-label="requiresDetail"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>수정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={`skel-${i.toString()}`} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">분류 (카테고리)</Label>
                <Select
                  value={displayCategory}
                  onValueChange={(v) => setEditCategory(v)}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="분류 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Retailer */}
              <div className="space-y-2">
                <Label htmlFor="retailer">가맹점</Label>
                <Select
                  value={displayRetailerId}
                  onValueChange={(v) => setEditRetailerId(v)}
                >
                  <SelectTrigger id="retailer">
                    <SelectValue placeholder="가맹점 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">— 없음 —</SelectItem>
                    {allRetailers.map((edge) => (
                      <SelectItem key={edge.node.id} value={edge.node.id}>
                        {edge.node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label htmlFor="note">메모</Label>
                <Input
                  id="note"
                  value={displayNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="메모 입력"
                />
              </div>

              {/* isInternal */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isInternal" className="text-base cursor-pointer">
                    내부 이체
                  </Label>
                  <p className="text-sm text-muted-foreground">계좌 간 이체 등 내부 거래</p>
                </div>
                <Switch
                  id="isInternal"
                  checked={displayIsInternal}
                  onCheckedChange={(v) => setEditIsInternal(v)}
                />
              </div>

              {/* Save button */}
              {saveMessage && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                  {saveMessage}
                </div>
              )}
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                저장
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
