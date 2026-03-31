import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCard, useCardTrends, usePrices } from "@/hooks/use-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  ImageOff,
} from "lucide-react";
import type { PriceSnapshot } from "@/types/api";

// -- Helpers ----------------------------------------------------------------

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// -- Timeframe options ------------------------------------------------------

const TIMEFRAMES = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: undefined },
] as const;

type Timeframe = (typeof TIMEFRAMES)[number];

// -- Helpers ----------------------------------------------------------------

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function TrendBadge({
  pct,
  label,
}: {
  pct: number | null;
  label: string;
}) {
  if (pct == null) return <span className="text-muted-foreground">—</span>;
  const isUp = pct > 0;
  const isFlat = pct === 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1 font-medium tabular-nums ${
          isFlat
            ? "text-muted-foreground"
            : isUp
              ? "text-green-500"
              : "text-red-500"
        }`}
      >
        {isFlat ? (
          <Minus className="h-4 w-4" />
        ) : isUp ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        {isUp ? "+" : ""}
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

// -- Chart tooltip ----------------------------------------------------------

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background p-3 shadow-md">
      <p className="mb-1 text-sm font-medium">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === "number" ? formatPrice(entry.value) : String(entry.value)}
        </p>
      ))}
    </div>
  );
}

// -- Card image component ---------------------------------------------------

function CardImage({
  url,
  name,
}: {
  url: string | undefined;
  name: string;
}) {
  const [imgError, setImgError] = useState(false);
  if (!url || imgError) {
    return (
      <div className="flex h-[350px] w-[250px] items-center justify-center rounded-lg bg-muted">
        <ImageOff className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={`${url}/high.webp`}
      alt={name}
      className="h-[350px] w-[250px] rounded-lg object-cover shadow-lg"
      onError={() => setImgError(true)}
    />
  );
}

// -- Main component ---------------------------------------------------------

export default function CardDetailPage() {
  const { cardId } = useParams<{ cardId: string }>();
  const decodedId = cardId ? safeDecode(cardId) : "";
  const navigate = useNavigate();

  const [timeframe, setTimeframe] = useState<Timeframe>(TIMEFRAMES[1]); // 30d default

  const {
    data: card,
    isLoading: cardLoading,
    error: cardError,
  } = useCard(decodedId);

  const { data: trendsData, isLoading: trendsLoading } =
    useCardTrends(decodedId);

  const { data: pricesData, isLoading: pricesLoading } = usePrices(
    decodedId,
    timeframe.days ? { days: timeframe.days } : undefined,
  );

  // Format chart data
  const chartData = useMemo(() => {
    if (!pricesData?.prices) return [];
    return pricesData.prices.map((p: PriceSnapshot) => ({
      date: formatDate(p.date),
      rawDate: p.date,
      Market: p.market,
      Low: p.low,
      High: p.high,
    }));
  }, [pricesData]);

  // -- Loading state --------------------------------------------------------

  if (cardLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex flex-col gap-6 md:flex-row">
          <Skeleton className="h-[350px] w-[250px] rounded-lg" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  // -- Error state ----------------------------------------------------------

  if (cardError || !card) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/cards")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cards
        </Button>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              {cardError
                ? "Failed to load card. Is the API server running?"
                : "Card not found."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trends = trendsData ?? null;

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/cards")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Cards
        </Button>
        <h1 className="text-2xl font-bold">{card.name}</h1>
      </div>

      {/* Top section: Image + metadata */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Card image */}
        <CardImage url={card.image_url} name={card.name} />

        {/* Metadata + prices + signal */}
        <div className="flex-1 space-y-4">
          {/* Card metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Card Info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Set</dt>
                <dd>{card.set_name}</dd>
                <dt className="text-muted-foreground">Number</dt>
                <dd>{card.number}</dd>
                <dt className="text-muted-foreground">Rarity</dt>
                <dd>{card.rarity || "—"}</dd>
                <dt className="text-muted-foreground">Supertype</dt>
                <dd>{card.supertype || "—"}</dd>
              </dl>
            </CardContent>
          </Card>

          {/* Current prices */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Current Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Market</p>
                  <p className="text-xl font-bold tabular-nums">
                    {formatPrice(card.latest_price?.market)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Low</p>
                  <p className="text-lg font-medium tabular-nums">
                    {formatPrice(card.latest_price?.low)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mid</p>
                  <p className="text-lg font-medium tabular-nums">
                    {formatPrice(card.latest_price?.mid)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">High</p>
                  <p className="text-lg font-medium tabular-nums">
                    {formatPrice(card.latest_price?.high)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signal */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Signal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant={
                        card.signal === "buy"
                          ? "default"
                          : card.signal === "sell"
                            ? "destructive"
                            : "secondary"
                      }
                      className={`text-sm ${
                        card.signal === "buy"
                          ? "bg-green-600 hover:bg-green-700"
                          : ""
                      }`}
                    >
                      {card.signal}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{card.signal_type}</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-sm font-medium">{card.signal_type}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {card.signal_reason || "No reason provided"}
              </p>
              {card.contributing_factors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {card.contributing_factors.map((f, i) => (
                    <Badge
                      key={`${f}-${i}`}
                      variant="outline"
                      className="text-xs"
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Trend summary (Task 4.3) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {trendsLoading ? (
            <div className="flex gap-8">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          ) : trends ? (
            <div className="flex flex-wrap items-center gap-8">
              <TrendBadge
                pct={trends.price_change_7d_pct}
                label="7d"
              />
              <TrendBadge
                pct={trends.price_change_30d_pct}
                label="30d"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Trend</span>
                <Badge
                  variant={
                    trends.trend === "rising"
                      ? "default"
                      : trends.trend === "declining"
                        ? "destructive"
                        : "secondary"
                  }
                  className={
                    trends.trend === "rising"
                      ? "bg-green-600 hover:bg-green-700"
                      : ""
                  }
                >
                  {trends.trend}
                </Badge>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No trend data available.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Price history chart (Task 4.2) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Price History</CardTitle>
          <Tabs
            value={timeframe.label}
            onValueChange={(val) => {
              const tf = TIMEFRAMES.find((t) => t.label === val);
              if (tf) setTimeframe(tf);
            }}
          >
            <TabsList>
              {TIMEFRAMES.map((tf) => (
                <TabsTrigger key={tf.label} value={tf.label}>
                  {tf.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {pricesLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-muted-foreground">
                No price history available for this timeframe.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  domain={["auto", "auto"]}
                />
                <RechartsTooltip
                  content={<ChartTooltipContent />}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Market"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="Low"
                  stroke="hsl(142, 71%, 45%)"
                  strokeWidth={1}
                  dot={false}
                  connectNulls
                  strokeDasharray="4 4"
                />
                <Line
                  type="monotone"
                  dataKey="High"
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={1}
                  dot={false}
                  connectNulls
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
