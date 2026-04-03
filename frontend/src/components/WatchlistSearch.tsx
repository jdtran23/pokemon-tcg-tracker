import { useDeferredValue, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  ImageOff,
  Loader2,
  Plus,
  Search,
  Check,
} from "lucide-react";
import { useSearchCards, useAddToWatchlist, useRefreshPrices } from "@/hooks/use-api";
import type { SearchResult } from "@/types/api";

// -- Search result image ----------------------------------------------------

function SearchImage({ result }: { result: SearchResult }) {
  const [imgError, setImgError] = useState(false);
  if (!result.image_url || imgError) {
    return (
      <div className="flex h-[60px] w-[42px] items-center justify-center rounded bg-muted">
        <ImageOff className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={`${result.image_url}/low.webp`}
      alt={result.name}
      className="h-[60px] w-[42px] rounded object-cover"
      loading="lazy"
      onError={() => setImgError(true)}
    />
  );
}

// -- Search result row ------------------------------------------------------

function SearchResultRow({
  result,
  isTracked,
  onAdd,
  isAdding,
}: {
  result: SearchResult;
  isTracked: boolean;
  onAdd: (id: string) => void;
  isAdding: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-2">
      <SearchImage result={result} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{result.name}</p>
        <p className="truncate text-sm text-muted-foreground">{result.set_name}</p>
      </div>
      {isTracked ? (
        <Badge variant="secondary" className="shrink-0 gap-1">
          <Check className="h-3 w-3" />
          Tracked
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1"
          onClick={() => onAdd(result.id)}
          disabled={isAdding}
        >
          {isAdding ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Add
        </Button>
      )}
    </div>
  );
}

// -- Main search component --------------------------------------------------

export default function WatchlistSearch({
  watchlistIds,
}: {
  watchlistIds: Set<string>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data, isLoading, isFetching, isError } = useSearchCards(deferredQuery, 20);
  const addMutation = useAddToWatchlist();
  const refreshMutation = useRefreshPrices();

  const results = data?.cards ?? [];
  const showResults = deferredQuery.length >= 2;
  const isSearching = isFetching && deferredQuery.length >= 2;

  function handleAdd(cardId: string) {
    setAddingId(cardId);
    addMutation.mutate(
      { card_id: cardId },
      {
        onSuccess: () => {
          refreshMutation.mutate(undefined);
          setAddingId(null);
        },
        onError: () => setAddingId(null),
      },
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="watchlist-search-panel"
      >
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Search &amp; Add Cards</span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div id="watchlist-search-panel" className="space-y-3 border-t px-4 pb-4 pt-3">
          <div className="relative">
            <Input
              id="watchlist-search"
              aria-label="Search cards"
              placeholder="Search by card name (min 2 characters)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-8"
            />
            {isSearching && (
              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Results */}
          {showResults && (
            <div className="max-h-[400px] space-y-2 overflow-y-auto" role="list">
              {isError ? (
                <p className="py-4 text-center text-sm text-destructive">
                  Search failed. Try again.
                </p>
              ) : isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-md border p-2">
                    <Skeleton className="h-[60px] w-[42px] rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))
              ) : results.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No cards found for &ldquo;{deferredQuery}&rdquo;
                </p>
              ) : (
                results.map((result) => (
                  <SearchResultRow
                    key={result.id}
                    result={result}
                    isTracked={watchlistIds.has(result.id)}
                    onAdd={handleAdd}
                    isAdding={addingId === result.id}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
