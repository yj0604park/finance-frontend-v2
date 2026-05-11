import { useParams, useNavigate } from "react-router-dom";
import { useGetSalaryFilteredQuery, type GetSalaryFilteredQuery } from "@/graphql/generated/graphql";
import { formatAccountingUSD, formatDate, toNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Decimal } from "decimal.js";
import { useMemo, useState } from "react";
import { SalaryBarChart } from "./salary-bar-chart";
import { EditSalaryDialog } from "./edit-salary-dialog";
import { CreateSalaryDialog } from "./create-salary-dialog";

export function IncomeYearDetailPage() {
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  type SalaryNode = NonNullable<NonNullable<GetSalaryFilteredQuery["salaryRelay"]>["edges"][0]>["node"];
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editSalary, setEditSalary] = useState<SalaryNode | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const dateMin = `${year}-01-01`;
  const dateMax = `${year}-12-31`;

  const { data, loading, refetch } = useGetSalaryFilteredQuery({
    variables: { dateMin, dateMax },
    skip: !year,
  });

  const salaries = data?.salaryRelay?.edges ?? [];

  // Totals
  const totals = useMemo(() => {
    let grossPay = new Decimal(0);
    let adjustment = new Decimal(0);
    let withheld = new Decimal(0);
    let deduction = new Decimal(0);
    let netPay = new Decimal(0);

    for (const edge of salaries) {
      const s = edge.node;
      grossPay = grossPay.plus(new Decimal(s.grossPay || 0));
      adjustment = adjustment.plus(new Decimal(s.totalAdjustment || 0));
      withheld = withheld.plus(new Decimal(s.totalWithheld || 0));
      deduction = deduction.plus(new Decimal(s.totalDeduction || 0));
      netPay = netPay.plus(new Decimal(s.netPay || 0));
    }

    return { grossPay, adjustment, withheld, deduction, netPay };
  }, [salaries]);

  // Chart data
  const chartData = salaries.map((edge) => ({
    date: edge.node.date,
    grossPay: toNumber(edge.node.grossPay),
    netPay: toNumber(edge.node.netPay),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/income")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Income {year}</h1>
        <Badge variant="outline">{salaries.length} pay periods</Badge>
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          급여 추가
        </Button>
      </div>

      {/* Summary Cards */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <SummaryCard title="Gross Pay" value={totals.grossPay.toString()} />
          <SummaryCard title="Adjustments" value={totals.adjustment.toString()} />
          <SummaryCard title="Withheld" value={totals.withheld.toString()} />
          <SummaryCard title="Deductions" value={totals.deduction.toString()} />
          <SummaryCard title="Net Pay" value={totals.netPay.toString()} />
        </div>
      )}

      {/* Chart */}
      <SalaryBarChart data={chartData} loading={loading} />

      {/* Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pay Periods</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`skel-${i.toString()}`} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Gross Pay</TableHead>
                  <TableHead className="text-right">Adjustments</TableHead>
                  <TableHead className="text-right">Withheld</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net Pay</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No salary data for {year}
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {salaries.map((edge) => {
                      const s = edge.node;
                      const isExpanded = expandedId === s.id;
                      return (
                        <>
                          <TableRow
                            key={s.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => setExpandedId(isExpanded ? null : s.id)}
                          >
                            <TableCell className="font-medium">
                              {formatDate(s.date)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatAccountingUSD(s.grossPay)}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${amountColor(s.totalAdjustment)}`}>
                              {formatAccountingUSD(s.totalAdjustment)}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${amountColor(s.totalWithheld)}`}>
                              {formatAccountingUSD(s.totalWithheld)}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${amountColor(s.totalDeduction)}`}>
                              {formatAccountingUSD(s.totalDeduction)}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {formatAccountingUSD(s.netPay)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditSalary(s);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`${s.id}-expanded`} className="bg-muted/30">
                              <TableCell colSpan={7} className="p-4">
                                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                  <DetailSection title="Pay" data={s.payDetail as Record<string, unknown>} />
                                  <DetailSection title="Adjustments" data={s.adjustmentDetail as Record<string, unknown>} />
                                  <DetailSection title="Taxes Withheld" data={s.taxDetail as Record<string, unknown>} />
                                  <DetailSection title="Deductions" data={s.deductionDetail as Record<string, unknown>} />
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                    {/* Totals Row */}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAccountingUSD(totals.grossPay.toString())}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${amountColor(totals.adjustment)}`}>
                        {formatAccountingUSD(totals.adjustment.toString())}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${amountColor(totals.withheld)}`}>
                        {formatAccountingUSD(totals.withheld.toString())}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${amountColor(totals.deduction)}`}>
                        {formatAccountingUSD(totals.deduction.toString())}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAccountingUSD(totals.netPay.toString())}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditSalaryDialog
        salary={editSalary}
        open={editSalary !== null}
        onClose={() => setEditSalary(null)}
        onSaved={() => { void refetch(); }}
      />

      <CreateSalaryDialog
        open={createOpen}
        year={Number(year)}
        onClose={() => setCreateOpen(false)}
        onCreated={() => { void refetch(); }}
      />
    </div>
  );
}

function amountColor(val: string | Decimal): string {
  const n = val instanceof Decimal ? val : new Decimal(parseFloat(String(val)) || 0);
  return n.isNegative() ? "text-red-600" : "";
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  const isNeg = parseFloat(value) < 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-xl font-bold font-mono ${isNeg ? "text-red-600" : ""}`}>
          {formatAccountingUSD(value)}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailSection({ title, data }: { title: string; data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-1.5">{title}</p>
      <div className="space-y-0.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{key}</span>
            <span className="font-mono">{formatAccountingUSD(String(value))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

