import { useDeferredValue, useState } from "react";
import { Link } from "react-router-dom";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
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
import { Input } from "@/components/ui/input";
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
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronLeft,
  ChevronRight,
  ImageOff,
} from "lucide-react";
import { useCards } from "@/hooks/use-api";
import type { Card as CardType } from "@/types/api";

// -- Helper: format currency ------------------------------------------------

function formatPrice(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
}

// -- Helper: sort icon for column headers -----------------------------------

function SortIcon({ isSorted }: { isSorted: false | "asc" | "desc" }) {
  if (isSorted === "asc") return <ArrowUp className="ml-1 h-3 w-3" />;
  if (isSorted === "desc") return <ArrowDown className="ml-1 h-3 w-3" />;
  return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
}

// -- Image cell component (extracted for proper hooks usage) ----------------

function ImageCell({ card }: { card: CardType }) {
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

// -- Column definitions -----------------------------------------------------

const columns: ColumnDef<CardType>[] = [
  // Image thumbnail
  {
    id: "image",
    header: "",
    size: 50,
    enableSorting: false,
    cell: ({ row }) => <ImageCell card={row.original} />,
  },
  // Name (links to detail page)
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => (
      <Link
        to={`/cards/${encodeURIComponent(row.original.id)}`}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  // Set
  {
    accessorKey: "set_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Set
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.set_name}</span>
    ),
  },
  // Rarity
  {
    accessorKey: "rarity",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Rarity
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.rarity || "—"}</span>
    ),
  },
  // Market Price
  {
    id: "price",
    accessorFn: (row) => row.latest_price?.market ?? null,
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Market Price
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatPrice(row.original.latest_price?.market)}
      </span>
    ),
    sortingFn: "basic",
    sortUndefined: "last",
  },
  // 7d Change %
  {
    id: "change_7d",
    accessorFn: (row) => row.trends?.price_change_7d_pct ?? null,
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        7d Change
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => {
      const pct = row.original.trends?.price_change_7d_pct;
      if (pct == null) return <span className="text-muted-foreground">—</span>;
      const isUp = pct > 0;
      const isFlat = pct === 0;
      return (
        <span
          className={`inline-flex items-center gap-1 tabular-nums ${
            isFlat
              ? "text-muted-foreground"
              : isUp
                ? "text-green-500"
                : "text-red-500"
          }`}
        >
          {isFlat ? (
            <Minus className="h-3 w-3" />
          ) : isUp ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isUp ? "+" : ""}
          {pct.toFixed(1)}%
        </span>
      );
    },
    sortingFn: "basic",
    sortUndefined: "last",
  },
  // Signal badge
  {
    id: "signal",
    accessorKey: "signal",
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Signal
        <SortIcon isSorted={column.getIsSorted()} />
      </Button>
    ),
    cell: ({ row }) => {
      const card = row.original;
      return (
        <Tooltip>
          <TooltipTrigger>
            <div className="flex flex-wrap items-center gap-1">
              <Badge
                variant={
                  card.signal === "buy"
                    ? "default"
                    : card.signal === "sell"
                      ? "destructive"
                      : "secondary"
                }
                className={
                  card.signal === "buy"
                    ? "bg-green-600 hover:bg-green-700"
                    : ""
                }
              >
                {card.signal}
              </Badge>
              {card.contributing_factors.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  +{card.contributing_factors.length}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{card.signal_type}</p>
            <p className="text-xs text-muted-foreground">
              {card.signal_reason || "No reason provided"}
            </p>
            {card.contributing_factors.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {card.contributing_factors.map((f, i) => (
                  <Badge key={`${f}-${i}`} variant="outline" className="text-[10px]">
                    {f}
                  </Badge>
                ))}
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      );
    },
  },
];

// -- CardsPage component ----------------------------------------------------

export default function CardsPage() {
  const { data, isLoading, error } = useCards();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const deferredFilter = useDeferredValue(globalFilter);

  const cards = data?.cards ?? [];

  const table = useReactTable({
    data: cards,
    columns,
    state: { sorting, globalFilter: deferredFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  });

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Cards</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Failed to load cards. Is the API server running?
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cards</h1>
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} card
          {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Search filter */}
      <Input
        placeholder="Search cards..."
        value={globalFilter}
        onChange={(e) => setGlobalFilter(e.target.value)}
        className="max-w-sm"
      />

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {globalFilter ? "No cards match your search." : "No cards tracked yet."}
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
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
