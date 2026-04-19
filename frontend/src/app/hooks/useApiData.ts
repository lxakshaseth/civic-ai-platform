"use client";

import { useEffect, useState } from "react";

type UseApiDataState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
};

export function useApiData<T>(
  fetcher: () => Promise<T>,
  dependencies: unknown[] = []
): UseApiDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextData = await fetcher();

        if (!isActive) {
          return;
        }

        setData(nextData);
      } catch (err) {
        if (!isActive) {
          return;
        }

        const message =
          err instanceof Error ? err.message : "Unable to fetch the latest data.";
        setError(message);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [reloadCount, ...dependencies]);

  return {
    data,
    error,
    loading,
    refetch: () => setReloadCount((currentValue) => currentValue + 1),
  };
}
