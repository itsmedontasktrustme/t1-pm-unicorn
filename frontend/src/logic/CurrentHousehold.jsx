import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listMyHouseholds } from "../api/households";
import useResident from "./useResident";

/*
 * Which households the resident belongs to and which one is open right now.
 * Shared by the header switcher and the household screens (HK-60, HK-63).
 */

const STORAGE_KEY = "homekeeper.currentHouseholdId";
const CurrentHouseholdContext = createContext(null);

function readStoredId() {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return null;
  }
}

function storeId(id) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch (error) {
    // Not critical: we fall back to the first household.
  }
}

export function CurrentHouseholdProvider({ children }) {
  const { isLoaded, user } = useResident();
  const [households, setHouseholds] = useState(null);
  const [error, setError] = useState(null);
  const [currentId, setCurrentId] = useState(readStoredId);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isLoaded || !user) {
      return undefined;
    }

    let active = true;
    setError(null);
    listMyHouseholds(user)
      .then((list) => active && setHouseholds(list))
      .catch((loadError) => active && setError(loadError));

    return () => {
      active = false;
    };
  }, [isLoaded, user, reloadKey]);

  const select = useCallback((id) => {
    setCurrentId(id);
    storeId(id);
  }, []);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  const value = useMemo(() => {
    const current = households?.find((household) => household.id === currentId) || households?.[0] || null;
    return {
      households,
      current,
      error,
      isLoading: households === null && !error,
      select,
      refresh
    };
  }, [households, currentId, error, select, refresh]);

  return <CurrentHouseholdContext.Provider value={value}>{children}</CurrentHouseholdContext.Provider>;
}

export function useCurrentHousehold() {
  return useContext(CurrentHouseholdContext);
}
