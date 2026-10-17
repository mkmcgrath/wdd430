"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Renders a date in the viewer's own time zone and locale. The server can't
 * know the viewer's time zone, so it renders a UTC date and the browser
 * swaps in the local one after hydration.
 */
export function LocalTime({ date, withTime = false }: { date: string | Date; withTime?: boolean }) {
  const iso = typeof date === "string" ? date : date.toISOString();
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const options: Intl.DateTimeFormatOptions = withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "medium" };
  const text = new Intl.DateTimeFormat(isClient ? undefined : "en-US", {
    ...options,
    ...(isClient ? {} : { timeZone: "UTC" }),
  }).format(new Date(iso));
  return <time dateTime={iso}>{text}</time>;
}
