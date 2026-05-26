import { useCallback, useEffect, useState } from "react";
import { getActiveAds } from "../ApiService/adsApiService";

export const usePlacementAds = (placement, type) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getActiveAds(placement, type);
      setAds(res?.ads || []);
    } catch {
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [placement, type]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ads, loading, refresh, primary: ads[0] || null };
};
