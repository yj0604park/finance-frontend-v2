import Decimal from "decimal.js";
import { CheckCircle2, Plus, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionCategory, useCreateSalaryMutation } from "@/graphql/generated/graphql";
import { useAllTransactions } from "@/hook/useAllTransactions";

interface KVPair {
  key: string;
  value: string;
}

function fromKVPairs(pairs: KVPair[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const { key, value } of pairs) {
    if (key.trim()) {
      result[key.trim()] = parseFloat(value) || 0;
    }
  }
  return result;
}

function sumKV(pairs: KVPair[]): Decimal {
  return pairs.reduce((acc, p) => acc.plus(new Decimal(parseFloat(p.value) || 0)), new Decimal(0));
}

interface KVEditorProps {
  label: string;
  pairs: KVPair[];
  onChange: (pairs: KVPair[]) => void;
  total: string;
}

function KVEditor({ label, pairs, onChange, total }: KVEditorProps) {
  const sum = sumKV(pairs);
  const totalDec = new Decimal(parseFloat(total) || 0);
  const diff = totalDec.minus(sum).abs();
  const isValid = diff.lessThan(0.01);

  const add = () => onChange([...pairs, { key: "", value: "0" }]);
  const remove = (i: number) => onChange(pairs.filter((_, idx) => idx !== i));
  const update = (i: number, field: "key" | "value", val: string) => {
    const next = [...pairs];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          {isValid ? (
            <Badge
              variant="outline"
              className="text-green-600 border-green-300 bg-green-50 text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" /> Valid
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs">
              <XCircle className="h-3 w-3 mr-1" /> Diff: {diff.toFixed(2)}
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={add}
            className="h-6 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" /> Add
          </Button>
        </div>
      </div>
      <div className="space-y-1.5">
        {pairs.map((pair, i) => (
          <div key={`kv-${i.toString()}`} className="flex gap-2 items-center">
            <Input
              value={pair.key}
              onChange={(e) => update(i, "key", e.target.value)}
              placeholder="Label"
              className="h-8 text-sm flex-1"
            />
            <Input
              value={pair.value}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="0.00"
              className="h-8 text-sm w-32 font-mono"
              type="number"
              step="0.01"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => remove(i)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {pairs.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-1">No entries</p>
        )}
      </div>
      <div className="text-xs text-muted-foreground text-right">
        Sum: <span className="font-mono font-medium">{sum.toFixed(2)}</span>
        {" / Total: "}
        <span className="font-mono font-medium">{totalDec.toFixed(2)}</span>
      </div>
    </div>
  );
}

interface ValidityRowProps {
  label: string;
  isValid: boolean;
  diff: string;
}

function ValidityRow({ label, isValid, diff }: ValidityRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      {isValid ? (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          <CheckCircle2 className="h-3 w-3 mr-1" /> OK
        </Badge>
      ) : (
        <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
          <XCircle className="h-3 w-3 mr-1" /> {diff}
        </Badge>
      )}
    </div>
  );
}

interface CreateSalaryDialogProps {
  open: boolean;
  year: number;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSalaryDialog({ open, year, onClose, onCreated }: CreateSalaryDialogProps) {
  const currentYear = isNaN(year) ? new Date().getFullYear() : year;
  const [date, setDate] = useState(`${currentYear}-01-01`);
  const [grossPay, setGrossPay] = useState("");
  const [totalAdjustment, setTotalAdjustment] = useState("");
  const [totalWithheld, setTotalWithheld] = useState("");
  const [totalDeduction, setTotalDeduction] = useState("");
  const [netPay, setNetPay] = useState("");
  const [selectedTransactionId, setSelectedTransactionId] = useState<string>("");
  const [payPairs, setPayPairs] = useState<KVPair[]>([]);
  const [adjustmentPairs, setAdjustmentPairs] = useState<KVPair[]>([]);
  const [taxPairs, setTaxPairs] = useState<KVPair[]>([]);
  const [deductionPairs, setDeductionPairs] = useState<KVPair[]>([]);

  const [createSalary, { loading }] = useCreateSalaryMutation();

  const { edges: transactionEdges, loading: txLoading } = useAllTransactions({
    dateGte: `${currentYear}-01-01`,
    dateLte: `${currentYear}-12-31`,
    skip: !open,
  });

  const incomeTransactions = transactionEdges.filter(
    (edge) => edge.node.type === TransactionCategory.Income,
  );

  // Validity checks
  const grossDiff = new Decimal(parseFloat(grossPay) || 0).minus(sumKV(payPairs)).abs();
  const adjDiff = new Decimal(parseFloat(totalAdjustment) || 0).minus(sumKV(adjustmentPairs)).abs();
  const taxDiff = new Decimal(parseFloat(totalWithheld) || 0).minus(sumKV(taxPairs)).abs();
  const dedDiff = new Decimal(parseFloat(totalDeduction) || 0).minus(sumKV(deductionPairs)).abs();
  const summaryDiff = new Decimal(parseFloat(netPay) || 0)
    .minus(
      new Decimal(parseFloat(grossPay) || 0)
        .plus(parseFloat(totalAdjustment) || 0)
        .plus(parseFloat(totalWithheld) || 0)
        .plus(parseFloat(totalDeduction) || 0),
    )
    .abs();

  const handleCreate = async () => {
    if (!selectedTransactionId) return;
    try {
      await createSalary({
        variables: {
          date,
          grossPay,
          totalAdjustment,
          totalWithheld,
          totalDeduction,
          netPay,
          transaction: { set: selectedTransactionId },
          payDetail: fromKVPairs(payPairs),
          adjustmentDetail: fromKVPairs(adjustmentPairs),
          taxDetail: fromKVPairs(taxPairs),
          deductionDetail: fromKVPairs(deductionPairs),
        },
      });
      onCreated();
      onClose();
      resetForm();
    } catch (err) {
      console.error("Failed to create salary:", err);
    }
  };

  const resetForm = () => {
    setDate(`${currentYear}-01-01`);
    setGrossPay("");
    setTotalAdjustment("");
    setTotalWithheld("");
    setTotalDeduction("");
    setNetPay("");
    setSelectedTransactionId("");
    setPayPairs([]);
    setAdjustmentPairs([]);
    setTaxPairs([]);
    setDeductionPairs([]);
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>급여 추가 — {currentYear}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="summary">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="flex-1">
              Summary
            </TabsTrigger>
            <TabsTrigger value="pay" className="flex-1">
              Pay Detail
            </TabsTrigger>
            <TabsTrigger value="adjustments" className="flex-1">
              Adjustments
            </TabsTrigger>
            <TabsTrigger value="taxes" className="flex-1">
              Taxes
            </TabsTrigger>
            <TabsTrigger value="deductions" className="flex-1">
              Deductions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Net Pay</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={netPay}
                  onChange={(e) => setNetPay(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gross Pay</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={grossPay}
                  onChange={(e) => setGrossPay(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Adjustment</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalAdjustment}
                  onChange={(e) => setTotalAdjustment(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Withheld</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalWithheld}
                  onChange={(e) => setTotalWithheld(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total Deduction</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={totalDeduction}
                  onChange={(e) => setTotalDeduction(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            {/* Transaction picker */}
            <div className="space-y-1.5">
              <Label>Transaction (Income)</Label>
              {txLoading ? (
                <p className="text-sm text-muted-foreground">Loading transactions…</p>
              ) : (
                <Select value={selectedTransactionId} onValueChange={setSelectedTransactionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an income transaction" />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeTransactions.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No income transactions found for {currentYear}
                      </SelectItem>
                    ) : (
                      incomeTransactions.map((edge) => (
                        <SelectItem key={edge.node.id} value={edge.node.id}>
                          {edge.node.date} — {edge.node.note ?? edge.node.id}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Validity checks */}
            <div className="border rounded-lg p-4 space-y-1 bg-muted/30">
              <p className="text-sm font-semibold mb-2">Validity Checks</p>
              <ValidityRow
                label="Gross = sum(payDetail)"
                isValid={grossDiff.lt(0.01)}
                diff={grossDiff.toFixed(2)}
              />
              <ValidityRow
                label="Adjustment = sum(adjustmentDetail)"
                isValid={adjDiff.lt(0.01)}
                diff={adjDiff.toFixed(2)}
              />
              <ValidityRow
                label="Withheld = sum(taxDetail)"
                isValid={taxDiff.lt(0.01)}
                diff={taxDiff.toFixed(2)}
              />
              <ValidityRow
                label="Deduction = sum(deductionDetail)"
                isValid={dedDiff.lt(0.01)}
                diff={dedDiff.toFixed(2)}
              />
              <ValidityRow
                label="Net = Gross + Adj + Withheld + Ded"
                isValid={summaryDiff.lt(0.01)}
                diff={summaryDiff.toFixed(2)}
              />
            </div>
          </TabsContent>

          <TabsContent value="pay" className="pt-4">
            <KVEditor label="Pay Detail" pairs={payPairs} onChange={setPayPairs} total={grossPay} />
          </TabsContent>

          <TabsContent value="adjustments" className="pt-4">
            <KVEditor
              label="Adjustment Detail"
              pairs={adjustmentPairs}
              onChange={setAdjustmentPairs}
              total={totalAdjustment}
            />
          </TabsContent>

          <TabsContent value="taxes" className="pt-4">
            <KVEditor
              label="Tax Detail"
              pairs={taxPairs}
              onChange={setTaxPairs}
              total={totalWithheld}
            />
          </TabsContent>

          <TabsContent value="deductions" className="pt-4">
            <KVEditor
              label="Deduction Detail"
              pairs={deductionPairs}
              onChange={setDeductionPairs}
              total={totalDeduction}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !selectedTransactionId || !date || !grossPay || !netPay}
          >
            {loading ? "Creating…" : "Create Salary"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
