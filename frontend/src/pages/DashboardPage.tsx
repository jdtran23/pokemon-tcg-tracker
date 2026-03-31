import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCards } from "@/hooks/use-api";
import { TrendingUp, TrendingDown, Minus, Package } from "lucide-react";

export default function DashboardPage() {
  const { data, isLoading, error } = useCards();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load data. Is the API server running on port 8000?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const cards = data?.cards ?? [];
  const buyCount = cards.filter((c) => c.signal === "buy").length;
  const sellCount = cards.filter((c) => c.signal === "sell").length;
  const holdCount = cards.filter((c) => c.signal === "hold").length;

  const topMovers = [...cards]
    .filter((c) => c.trends.price_change_7d_pct != null)
    .sort(
      (a, b) =>
        Math.abs(b.trends.price_change_7d_pct ?? 0) -
        Math.abs(a.trends.price_change_7d_pct ?? 0),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Summary stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cards
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Buy Signals
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{buyCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sell Signals
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{sellCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hold
            </CardTitle>
            <Minus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{holdCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Top movers */}
      {topMovers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Movers (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topMovers.map((card) => {
                const pct = card.trends.price_change_7d_pct ?? 0;
                const isUp = pct > 0;
                return (
                  <div
                    key={card.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {card.image_url ? (
                        <img
                          src={`${card.image_url}/low.webp`}
                          alt={card.name}
                          className="h-10 w-7 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-10 w-7 rounded bg-muted" />
                      )}
                      <div>
                        <p className="text-sm font-medium">{card.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {card.set_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          card.signal === "buy"
                            ? "default"
                            : card.signal === "sell"
                              ? "destructive"
                              : "secondary"
                        }
                        className={
                          card.signal === "buy" ? "bg-green-600 hover:bg-green-700" : ""
                        }
                      >
                        {card.signal}
                      </Badge>
                      <span
                        className={`text-sm font-medium tabular-nums ${
                          isUp ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {isUp ? "+" : ""}
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
