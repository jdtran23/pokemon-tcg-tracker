import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSignalRules, useRecomputeSignals } from "@/hooks/use-api";
import RuleEditor from "@/components/settings/RuleEditor";
import OverridesPanel from "@/components/settings/OverridesPanel";

// -- Loading skeleton -------------------------------------------------------

function RulesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}

// -- Recompute Banner -------------------------------------------------------

function RecomputeBanner() {
  const recompute = useRecomputeSignals();

  return (
    <div className="flex items-center justify-between rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
      <p className="text-sm font-medium">
        Rules changed — recompute signals to apply new thresholds.
      </p>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => recompute.mutate()}
          disabled={recompute.isPending}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${recompute.isPending ? "animate-spin" : ""}`}
          />
          {recompute.isPending ? "Recomputing…" : "Recompute Signals"}
        </Button>
        {recompute.isError && (
          <span className="text-xs text-destructive" role="alert">Recompute failed</span>
        )}
        {recompute.isSuccess && (
          <span className="text-xs text-green-600" role="status">Done ✓</span>
        )}
      </div>
    </div>
  );
}

// -- Main Page --------------------------------------------------------------

export default function SettingsPage() {
  const { data, isLoading, error } = useSignalRules();
  const [showRecompute, setShowRecompute] = useState(false);

  const rules = data?.rules ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings — Signal Tuning</h1>

      {showRecompute && <RecomputeBanner />}

      {/* Signal Rules */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Signal Rules</h2>

        {error ? (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Failed to load signal rules. Is the API server running?
              </p>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <RulesSkeleton />
        ) : rules.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No signal rules found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {rules.map((rule, idx) => (
              <RuleEditor
                key={rule.type}
                rule={rule}
                priority={idx + 1}
                onSaved={() => setShowRecompute(true)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Overrides */}
      <section>
        <OverridesPanel />
      </section>
    </div>
  );
}
