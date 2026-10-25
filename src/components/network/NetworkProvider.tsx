"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "next-intl";
import { networkCopy, type NetworkCopy } from "@/lib/networkCopy";
import type { NetworkMe } from "@/lib/networkTypes";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function networkApi<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch("/api/network/" + path, {
    ...options,
    cache: "no-store",
    headers: {
      ...(options?.body && !(options.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...options?.headers,
    },
  });
  const data = await response.json().catch(() => ({ error: "unavailable" }));
  if (!response.ok)
    throw new ApiError(data.error || "unavailable", response.status);
  return data;
}
export const writeNetwork = <T,>(
  path: string,
  data: unknown,
  method = "POST",
) => networkApi<T>(path, { method, body: JSON.stringify(data) });
export function useNetworkCopy(): NetworkCopy {
  const locale = useLocale();
  return networkCopy[locale as keyof typeof networkCopy] || networkCopy.uz;
}
export function networkError(error: unknown, t: NetworkCopy) {
  const message = error instanceof Error ? error.message : "";
  if (message === "unauthorized") return t.loginRequired;
  if (message === "profile_required") return t.profileRequired;
  if (message === "profile_incomplete") return t.profileBasicsRequired;
  if (message === "invalid_image") return t.imageError;
  if (message === "invalid_input" || message === "too_large")
    return t.invalidInput;
  if (message === "account_blocked") return t.accountBlocked;
  if (message === "rate_limited") return t.limited;
  if (message === "not_found") return t.notFound;
  return t.unavailable;
}
const Context = createContext<{
  me: NetworkMe;
  loading: boolean;
  error: unknown;
  refresh: () => Promise<void>;
}>({
  me: { profile: null, admin: false, canLinkMentor: false, unread: 0 },
  loading: true,
  error: null,
  refresh: async () => {},
});
export function NetworkProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<NetworkMe>({
    profile: null,
    admin: false,
    canLinkMentor: false,
    unread: 0,
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState<unknown>(null);
  const refresh = useCallback(
    () =>
      networkApi<NetworkMe>("me")
        .then((result) => {
          setMe(result);
          setError(null);
        })
        .catch((failure) => setError(failure))
        .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("rahnamo-mentor-session", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("rahnamo-mentor-session", onFocus);
    };
  }, [refresh]);
  return (
    <Context.Provider value={{ me, loading, error, refresh }}>
      {children}
    </Context.Provider>
  );
}
export const useNetwork = () => useContext(Context);
