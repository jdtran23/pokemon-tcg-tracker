import { useState } from "react";
import { Bell, BellRing, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAlertsConfig,
  useAddAlert,
  useRemoveAlert,
  useCards,
} from "@/hooks/use-api";
import type { AlertConfig } from "@/types/api";

// -- Condition helpers ------------------------------------------------------

const CONDITION_LABELS: Record<string, string> = {
  price_below: "Price falls below",
  price_above: "Price rises above",
  change_7d_above_pct: "7d change exceeds",
  change_7d_below_pct: "7d change drops below",
  change_30d_above_pct: "30d change exceeds",
  change_30d_below_pct: "30d change drops below",
};

const CONDITIONS = Object.entries(CONDITION_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function isPercentCondition(condition: string): boolean {
  return condition.includes("pct");
}

function formatThreshold(condition: string, value: number): string {
  return isPercentCondition(condition) ? `${value}%` : `$${value.toFixed(2)}`;
}

// -- Sub-components ---------------------------------------------------------

function RemoveAlertButton({ alertId }: { alertId: string }) {
  const removeMutation = useRemoveAlert();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        aria-label="Remove alert"
        onClick={() => removeMutation.mutate(alertId)}
        disabled={removeMutation.isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {removeMutation.isError && (
        <span className="text-xs text-destructive">Failed</span>
      )}
    </div>
  );
}

function AlertItem({ alert }: { alert: AlertConfig }) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 ${
        alert.triggered
          ? "border-green-500/50 bg-green-500/5"
          : "border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        {alert.triggered ? (
          <BellRing className="h-5 w-5 text-green-500" />
        ) : (
          <Bell className="h-5 w-5 text-muted-foreground" />
        )}
        <div>
          <p className="font-medium">{alert.card_name}</p>
          <p className="text-sm text-muted-foreground">
            {CONDITION_LABELS[alert.condition] ?? alert.condition}{" "}
            <span className="font-medium tabular-nums">
              {formatThreshold(alert.condition, alert.value)}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant={alert.triggered ? "default" : "secondary"}
          className={alert.triggered ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {alert.triggered ? "Triggered" : "Watching"}
        </Badge>
        <RemoveAlertButton alertId={alert.id} />
      </div>
    </div>
  );
}

// -- Add Alert Form ---------------------------------------------------------

function AddAlertForm() {
  const { data: cardsData } = useCards();
  const addMutation = useAddAlert();

  const [cardId, setCardId] = useState("");
  const [condition, setCondition] = useState("");
  const [value, setValue] = useState("");

  const cards = cardsData?.cards ?? [];
  const selectedCard = cards.find((c) => c.id === cardId);

  const isValid =
    cardId !== "" &&
    condition !== "" &&
    value !== "" &&
    !isNaN(Number(value)) &&
    Number(value) > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !selectedCard) return;

    addMutation.mutate(
      {
        card_id: cardId,
        card_name: selectedCard.name,
        condition,
        value: Number(value),
      },
      {
        onSuccess: () => {
          setCardId("");
          setCondition("");
          setValue("");
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plus className="h-4 w-4" />
          Add Alert
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <label htmlFor="alert-card" className="text-sm font-medium">
              Card
            </label>
            <select
              id="alert-card"
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

          <div className="flex min-w-[180px] flex-1 flex-col gap-1.5">
            <label htmlFor="alert-condition" className="text-sm font-medium">
              Condition
            </label>
            <select
              id="alert-condition"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              required
            >
              <option value="">Select condition…</option>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[100px] flex-col gap-1.5">
            <label htmlFor="alert-value" className="text-sm font-medium">
              {isPercentCondition(condition) ? "Threshold (%)" : "Threshold ($)"}
            </label>
            <Input
              id="alert-value"
              type="number"
              min={0}
              step="any"
              placeholder={
                isPercentCondition(condition) ? "e.g. 10" : "e.g. 5.00"
              }
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={!isValid || addMutation.isPending}>
            {addMutation.isPending ? "Adding…" : "Add Alert"}
          </Button>
          {addMutation.isError && (
            <p className="text-sm text-destructive" role="alert">
              Failed to add alert. Please try again.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// -- Loading skeleton -------------------------------------------------------

function AlertsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Main Page --------------------------------------------------------------

export default function AlertsPage() {
  const { data, isLoading, error } = useAlertsConfig();
  const alerts = data?.alerts ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Alerts</h1>

      <AddAlertForm />

      {!isLoading && error ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load alerts. Is the API server running?
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <AlertsSkeleton />
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Bell className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">
              No alerts configured. Add one above to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <AlertItem key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}
