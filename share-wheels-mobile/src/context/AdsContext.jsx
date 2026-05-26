import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getActiveAds } from "../ApiService/adsApiService";

const AdsContext = createContext({
  adsByPlacement: {},
  loading: true,
  error: null,
  refreshAds: () => {},
  getAdForPlacement: () => null,
  getAdsForPlacement: () => [],
});

export const AdsProvider = ({ children }) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getActiveAds();
      setAds(Array.isArray(res?.ads) ? res.ads : []);
      if (__DEV__) {
        console.log("[Ads] loaded", res?.count ?? 0, "active ad(s)");
      }
    } catch (err) {
      setAds([]);
      setError(err?.message || "Failed to load ads");
      if (__DEV__) {
        console.warn("[Ads] fetch failed:", err?.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAds();
  }, [refreshAds]);

  const adsByPlacement = useMemo(() => {
    const map = {};
    ads.forEach((ad) => {
      if (!ad?.placement) return;
      if (!map[ad.placement]) map[ad.placement] = [];
      map[ad.placement].push(ad);
    });
    return map;
  }, [ads]);

  const getAdsForPlacement = useCallback(
    (placement) => adsByPlacement[placement] || [],
    [adsByPlacement]
  );

  const getAdForPlacement = useCallback(
    (placement) => getAdsForPlacement(placement)[0] || null,
    [getAdsForPlacement]
  );

  const value = useMemo(
    () => ({
      adsByPlacement,
      loading,
      error,
      refreshAds,
      getAdForPlacement,
      getAdsForPlacement,
    }),
    [adsByPlacement, loading, error, refreshAds, getAdForPlacement, getAdsForPlacement]
  );

  return <AdsContext.Provider value={value}>{children}</AdsContext.Provider>;
};

export const useAds = () => useContext(AdsContext);
