// ---------------------------------------------------------------------------
// TanStack Query hooks — typed wrappers around the API client.
// ---------------------------------------------------------------------------

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "@/api/client";

// -- Query Keys (centralized to avoid typos) --------------------------------

export const queryKeys = {
  cards: ["cards"] as const,
  card: (id: string) => ["cards", id] as const,
  cardTrends: (id: string) => ["cards", id, "trends"] as const,
  prices: (cardId: string) => ["prices", cardId] as const,
  watchlist: ["watchlist"] as const,
  alerts: ["alerts"] as const,
  signalRules: ["signal-rules"] as const,
  signalOverrides: ["signal-overrides"] as const,
  search: (q: string) => ["search", q] as const,
};

// -- Card Queries -----------------------------------------------------------

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards,
    queryFn: api.getCards,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: queryKeys.card(id),
    queryFn: () => api.getCard(id),
    enabled: !!id,
  });
}

export function useCardTrends(id: string) {
  return useQuery({
    queryKey: queryKeys.cardTrends(id),
    queryFn: () => api.getCardTrends(id),
    enabled: !!id,
  });
}

// -- Price Queries ----------------------------------------------------------

export function usePrices(
  cardId: string,
  opts?: { variant?: string; source?: string; days?: number },
) {
  return useQuery({
    queryKey: [...queryKeys.prices(cardId), opts],
    queryFn: () => api.getPrices(cardId, opts),
    enabled: !!cardId,
  });
}

// -- Search -----------------------------------------------------------------

export function useSearchCards(query: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => api.searchCards(query, limit),
    enabled: query.length >= 2,
  });
}

// -- Watchlist --------------------------------------------------------------

export function useWatchlist() {
  return useQuery({
    queryKey: queryKeys.watchlist,
    queryFn: api.getWatchlist,
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addToWatchlist,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.watchlist });
      void qc.invalidateQueries({ queryKey: queryKeys.cards });
    },
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.removeFromWatchlist,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.watchlist });
      void qc.invalidateQueries({ queryKey: queryKeys.cards });
    },
  });
}

// -- Alerts -----------------------------------------------------------------

export function useAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts,
    queryFn: api.getAlerts,
  });
}

export function useAddAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addAlert,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function useRemoveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.removeAlert,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

// -- Signal Rules -----------------------------------------------------------

export function useSignalRules() {
  return useQuery({
    queryKey: queryKeys.signalRules,
    queryFn: api.getSignalRules,
  });
}

export function useUpdateSignalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.updateSignalRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.signalRules });
    },
  });
}

// -- Signal Overrides -------------------------------------------------------

export function useSignalOverrides() {
  return useQuery({
    queryKey: queryKeys.signalOverrides,
    queryFn: api.getSignalOverrides,
  });
}

export function useAddSignalOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addSignalOverride,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.signalOverrides });
    },
  });
}

export function useRemoveSignalOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.removeSignalOverride,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.signalOverrides });
    },
  });
}

// -- Actions ----------------------------------------------------------------

export function useRefreshPrices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.refreshPrices,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.cards });
      void qc.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });
}

export function useRecomputeSignals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.recomputeSignals,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.cards });
    },
  });
}
