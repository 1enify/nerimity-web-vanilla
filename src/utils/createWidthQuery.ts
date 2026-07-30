type WidthMode = "min" | "max";

interface WidthQuery {
  readonly matches: boolean;
  onModeChange(
    callback: (matches: boolean) => void,
    signal?: AbortSignal,
  ): void;
}

export function createWidthQuery(
  px: number,
  mode: WidthMode = "min",
): WidthQuery {
  const mql = window.matchMedia(`(${mode}-width: ${px}px)`);

  return {
    get matches() {
      return mql.matches;
    },
    onModeChange(callback, signal) {
      const handler = (e: MediaQueryListEvent) => callback(e.matches);
      mql.addEventListener("change", handler, { signal });
    },
  };
}
