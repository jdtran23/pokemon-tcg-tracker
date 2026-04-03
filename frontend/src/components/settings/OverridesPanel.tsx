import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useSignalOverrides,
  useAddSignalOverride,
  useRemoveSignalOverride,
  useCards,
  useSignalRules,
} from "@/hooks/use-api";
import type { SignalOverride } from "@/types/api";

// -- Override row -----------------------------------------------------------

function OverrideRow({ override }: { override: SignalOverride }) {
  const removeMutation = useRemoveSignalOverride();
  const thresholdEntries = Object.entries(override.thresholds);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{override.card_id}</span>
        <Badge variant="secondary">{override.rule_type}</Badge>
      </div>
      <div className="flex items-center gap-3">
        {thresholdEntries.map(([key, val]) => (
          <span key={key} className="text-xs text-muted-foreground">
            {key}: <span className="font-medium tabular-nums">{val}</span>
          </span>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          aria-label={`Remove override for ${override.card_id} ${override.rule_type}`}
          onClick={() =>
            removeMutation.mutate({
              card_id: override.card_id,
              rule_type: override.rule_type,
            })
          }
          disabled={removeMutation.isPending}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {removeMutation.isError && (
        <span className="text-xs text-destructive w-full">Remove failed</span>
      )}
    </div>
  );
}

// -- Add Override Form ------------------------------------------------------

function AddOverrideForm() {
  const { data: cardsData } = useCards();
  const { data: rulesData } = useSignalRules();
  const addMutation = useAddSignalOverride();

  const [cardId, setCardId] = useState("");
  const [ruleType, setRuleType] = useState("");
  const [thresholdStr, setThresholdStr] = useState("");

  const cards = cardsData?.cards ?? [];
  const rules = rulesData?.rules ?? [];

  // When a rule is selected, pre-fill its threshold keys
  const selectedRule = rules.find((r) => r.type === ruleType);
  const defaultKeys = selectedRule
    ? Object.keys(selectedRule.thresholds)
    : [];

  // Parse threshold string "key:value, key:value" into Record
  function parseThresholds(): Record<string, number> | null {
    if (defaultKeys.length === 0) return {};
    const result: Record<string, number> = {};
    const parts = thresholdStr.split(",").map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const [key, valStr] = part.split(":").map((s) => s.trim());
      if (!key || !valStr) return null;
      const val = parseFloat(valStr);
      if (isNaN(val)) return null;
      result[key] = val;
    }
    return result;
  }

  function handleRuleChange(type: string) {
    setRuleType(type);
    const rule = rules.find((r) => r.type === type);
    if (rule && Object.keys(rule.thresholds).length > 0) {
      setThresholdStr(
        Object.entries(rule.thresholds)
          .map(([k, v]) => `${k}:${v}`)
          .join(", "),
      );
    } else {
      setThresholdStr("");
    }
  }

  const parsedThresholds = parseThresholds();
  const isValid = cardId !== "" && ruleType !== "" && parsedThresholds !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !parsedThresholds) return;
    addMutation.mutate(
      { card_id: cardId, rule_type: ruleType, thresholds: parsedThresholds },
      {
        onSuccess: () => {
          setCardId("");
          setRuleType("");
          setThresholdStr("");
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
        <label htmlFor="override-card" className="text-sm font-medium">
          Card
        </label>
        <select
          id="override-card"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={cardId}
          onChange={(e) => setCardId(e.target.value)}
          required
        >
          <option value="">Select a card…</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.set_name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-[160px] flex-col gap-1.5">
        <label htmlFor="override-rule" className="text-sm font-medium">
          Rule Type
        </label>
        <select
          id="override-rule"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={ruleType}
          onChange={(e) => handleRuleChange(e.target.value)}
          required
        >
          <option value="">Select rule…</option>
          {rules.map((r) => (
            <option key={r.type} value={r.type}>
              {r.type}
            </option>
          ))}
        </select>
      </div>

      {defaultKeys.length > 0 && (
        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <label htmlFor="override-thresholds" className="text-sm font-medium">
            Thresholds
          </label>
          <Input
            id="override-thresholds"
            placeholder="key:value, key:value"
            value={thresholdStr}
            onChange={(e) => setThresholdStr(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">
            Keys: {defaultKeys.join(", ")}
          </span>
        </div>
      )}

      <Button type="submit" disabled={!isValid || addMutation.isPending}>
        {addMutation.isPending ? "Adding…" : "Add Override"}
      </Button>

      {addMutation.isError && (
        <p className="text-sm text-destructive w-full" role="alert">
          Failed to add override.
        </p>
      )}
    </form>
  );
}

// -- Main Panel -------------------------------------------------------------

export default function OverridesPanel() {
  const { data, isLoading, error } = useSignalOverrides();
  const [open, setOpen] = useState(false);
  const overrides = data?.overrides ?? [];

  return (
    <Card>
      <CardHeader
        role="button"
        tabIndex={0}
        aria-expanded={open}
        className="cursor-pointer select-none"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((prev) => !prev);
          }
        }}
      >
        <CardTitle className="flex items-center gap-2 text-lg">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          Per-Card Overrides
          {overrides.length > 0 && (
            <Badge variant="secondary">{overrides.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>

      {open && (
        <CardContent className="space-y-4">
          <AddOverrideForm />

          {error ? (
            <p className="text-sm text-destructive">Failed to load overrides.</p>
          ) : isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No per-card overrides. Add one above to customise thresholds for a specific card.
            </p>
          ) : (
            <div className="space-y-2">
              {overrides.map((o) => (
                <OverrideRow
                  key={`${o.card_id}-${o.rule_type}`}
                  override={o}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
