import { useState } from "react";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateSignalRule } from "@/hooks/use-api";
import type { SignalRule } from "@/types/api";

const SIGNAL_STYLES: Record<string, string> = {
  buy: "bg-green-600 hover:bg-green-700",
  sell: "bg-red-600 hover:bg-red-700",
  hold: "bg-zinc-500 hover:bg-zinc-600",
};

const RULE_LABELS: Record<string, string> = {
  strong_buy: "Strong Buy",
  below_direct_low: "Below Direct Low",
  buy_dip: "Buy Dip",
  dip_vs_avg7: "Dip vs 7d Avg",
  rising: "Rising",
  sell_opportunity: "Sell Opportunity",
  declining: "Declining",
  weak_sell: "Weak Sell",
  hold_accumulate: "Hold / Accumulate",
};

interface RuleEditorProps {
  rule: SignalRule;
  priority: number;
  onSaved: () => void;
}

export default function RuleEditor({ rule, priority, onSaved }: RuleEditorProps) {
  const [thresholds, setThresholds] = useState<Record<string, string>>(
    () => Object.fromEntries(
      Object.entries(rule.thresholds).map(([k, v]) => [k, String(v)]),
    ),
  );
  const [dirty, setDirty] = useState(false);
  const updateMutation = useUpdateSignalRule();

  const thresholdKeys = Object.keys(rule.thresholds);
  const hasThresholds = thresholdKeys.length > 0;

  function handleChange(key: string, value: string) {
    setThresholds((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  function handleSave() {
    const parsed = Object.fromEntries(
      Object.entries(thresholds).map(([k, v]) => [k, parseFloat(v)]),
    );
    if (Object.values(parsed).some(isNaN)) return;
    updateMutation.mutate(
      { rule_type: rule.type, thresholds: parsed },
      {
        onSuccess: () => {
          setDirty(false);
          onSaved();
        },
      },
    );
  }

  function handleReset() {
    setThresholds(
      Object.fromEntries(
        Object.entries(rule.thresholds).map(([k, v]) => [k, String(v)]),
      ),
    );
    setDirty(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border p-4">
      {/* Priority + type */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <span className="tabular-nums text-sm text-muted-foreground w-6 text-right">
          {priority}
        </span>
        <span className="font-medium text-sm">
          {RULE_LABELS[rule.type] ?? rule.type}
        </span>
        <Badge className={SIGNAL_STYLES[rule.signal] ?? ""}>
          {rule.signal}
        </Badge>
      </div>

      {/* Condition text */}
      <p className="text-sm text-muted-foreground flex-1 min-w-[180px]">
        {rule.condition}
      </p>

      {/* Threshold editors */}
      {hasThresholds ? (
        <div className="flex flex-wrap items-center gap-2">
          {thresholdKeys.map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <label
                htmlFor={`${rule.type}-${key}`}
                className="text-xs text-muted-foreground whitespace-nowrap"
              >
                {key}
              </label>
              <Input
                id={`${rule.type}-${key}`}
                type="number"
                step="any"
                className="h-8 w-24 tabular-nums text-sm"
                value={thresholds[key]}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">
          No thresholds
        </span>
      )}

      {/* Save / Reset */}
      {hasThresholds && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Save ${rule.type} thresholds`}
            onClick={handleSave}
            disabled={!dirty || updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            {updateMutation.isPending ? "Saving…" : "Save"}
          </Button>
          {dirty && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Reset
            </Button>
          )}
        </div>
      )}

      {updateMutation.isError && (
        <span className="text-xs text-destructive" role="alert">Save failed</span>
      )}
      {updateMutation.isSuccess && !dirty && (
        <span className="text-xs text-green-600" role="status">Saved ✓</span>
      )}
    </div>
  );
}
