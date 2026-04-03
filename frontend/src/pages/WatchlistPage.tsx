import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Minus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useCards, useWatchlist, useRemoveFromWatchlist } from "@/hooks/use-api";
import type { Card as CardType } from "@/types/api";
import WatchlistSearch from "@/components/WatchlistSearch";

// -- Helpers (same as CardsPage) -------------------------------------------

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (isSorted === "asc") return <ArrowUp className="ml-1 h-3 w-3" />;
  if (isSorted === "desc") return <ArrowDown className="ml-1 h-3 w-3" />;
  return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
}

function WatchlistImageCell({ card }: { card: CardType }) {
  const [imgError, setImgError] = useState(false);
  if (!card.image_url || imgError) {
    return (
      <div className="flex h-[60px] w-[42px] items-center justify-center rounded bg-muted">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={`${card.image_url}/low.webp`}
      alt={card.name}
      className="h-[60px] w-[42px] rounded object-cover"
      loading="lazy"
      onError={() => setImgError(true)}
    />
  );
}

// -- Remove button (needs hooks, so it's a component) ----------------------

function RemoveButton({ cardId }: { cardId: string }) {
  const removeMutation = useRemoveFromWatchlist();
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      aria-label="Remove from watchlist"
      onClick={() => removeMutation.mutate({ card_id: cardId })}
      disabled={removeMutation.isPending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

// -- Column definitions -----------------------------------------------------

const columns: ColumnDef<CardType>[] = [
  {
    id: "image",
    header: "",
    size: 50,
    enableSorting: false,
    cell: ({ row }) => <WatchlistImageCell card={row.original} />,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => (
      <Link to={`/cards/${encodeURIComponent(row.original.id)}`} className="font-medium hover:underline">
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "set_name",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Set <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.set_name}</span>,
  },
  {
    id: "price",
    accessorFn: (row) => row.latest_price?.market ?? null,
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Market Price <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{formatPrice(row.original.latest_price?.market)}</span>
    ),
    sortingFn: "basic",
    sortUndefined: "last",
  },
  {
    id: "change_7d",
    accessorFn: (row) => row.trends?.price_change_7d_pct ?? null,
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        7d Change <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => {
      const pct = row.original.trends?.price_change_7d_pct;
      if (pct == null) return <span className="text-muted-foreground">—</span>;
      const isUp = pct > 0;
      const isFlat = pct === 0;
      return (
        <span className={`inline-flex items-center gap-1 tabular-nums ${isFlat ? "text-muted-foreground" : isUp ? "text-green-500" : "text-red-500"}`}>
          {isFlat ? <Minus className="h-3 w-3" /> : isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isUp ? "+" : ""}{pct.toFixed(1)}%
        </span>
      );
    },
    sortingFn: "basic",
    sortUndefined: "last",
  },
  {
    id: "signal",
    accessorKey: "signal",
    header: ({ column }) => (
      <Button variant="ghost" size="sm" className="-ml-3" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Signal <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => {
      const card = row.original;
      return (
        <Tooltip>
          <TooltipTrigger>
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                variant={card.signal === "buy" ? "default" : card.signal === "sell" ? "destructive" : "secondary"}
                className={card.signal === "buy" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {card.signal}
              </Badge>
              {card.contributing_factors.length > 0 && (
                <span className="text-[10px] text-muted-foreground">+{card.contributing_factors.length}</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{card.signal_type}</p>
            <p className="text-xs text-muted-foreground">{card.signal_reason || "No reason provided"}</p>
            {card.contributing_factors.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {card.contributing_factors.map((f, i) => (
                  <Badge key={`${f}-${i}`} variant="outline" className="text-[10px]">{f}</Badge>
                ))}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      );
    },
  },
  {
    id: "actions",
    header: "",
    size: 50,
    enableSorting: false,
    cell: ({ row }) => <RemoveButton cardId={row.original.id} />,
  },
];

// -- WatchlistPage ----------------------------------------------------------

const WATCHLIST_LIMIT = 200;

export default function WatchlistPage() {
  const { data: watchlistData, isLoading: watchlistLoading, error: watchlistError } = useWatchlist();
  const { data: cardsData, isLoading: cardsLoading, error: cardsError } = useCards();
  const [sorting, setSorting] = useState<SortingState>([]);

  const watchlistIds = useMemo(
    () => new Set(watchlistData?.card_ids ?? []),
    [watchlistData],
  );

  const watchlistCards = useMemo(
    () => (cardsData?.cards ?? []).filter((c) => watchlistIds.has(c.id)),
    [cardsData, watchlistIds],
  );

  const isLoading = watchlistLoading || cardsLoading;

  const table = useReactTable({
    data: watchlistCards,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  if (!isLoading && (watchlistError || cardsError)) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load watchlist. Is the API server running?</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <span className="text-sm text-muted-foreground">
          {watchlistIds.size} / {WATCHLIST_LIMIT}
        </span>
      </div>

      {/* Search section */}
      <WatchlistSearch watchlistIds={watchlistIds} />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : watchlistCards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Search className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No cards on your watchlist yet.</p>
                    <p className="text-sm text-muted-foreground">
                      Use the search above to find and add cards.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
