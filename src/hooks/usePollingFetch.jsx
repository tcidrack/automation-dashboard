import { useState, useEffect, useCallback, useRef } from "react";

export function usePollingFetch(fetchFn, intervalMs = 30000) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const intervalRef = useRef(null);
  const fetchFnRef = useRef(fetchFn);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const fetchData = useCallback(async (isBackground = false) => {
    if (isBackground) {
      setUpdating(true);
    } else {
      setLoading(true);
    }
    
    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
      setUpdating(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = async () => {
      await fetchData(false);
    };
    initialLoad();

    intervalRef.current = setInterval(() => {
      fetchData(true);
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMs, fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { data, loading, updating, refresh };
}