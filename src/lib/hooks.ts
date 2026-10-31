import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { ApiProblem, type FieldErrors } from "./api";

/**
 * URL query parameters, or null until the island mounts. The first render has
 * to match the HTML built ahead of time, which has no query string.
 */
export function useUrlParams(): URLSearchParams | null {
  const [params, setParams] = useState<URLSearchParams | null>(null);
  useEffect(() => setParams(new URLSearchParams(location.search)), []);
  return params;
}

/** Whole number from a query parameter, or undefined. */
export function idFrom(params: URLSearchParams, name: string): number | undefined {
  const value = params.get(name) ?? "";
  return /^[1-9]\d*$/.test(value) ? Number(value) : undefined;
}

type Resource<T> = {
  data?: T;
  error?: ApiProblem;
  reload: () => void;
  setData: (update: (current: T) => T) => void;
};

/** Loads data when `key` changes. Pass null to wait. Late responses are dropped. */
export function useResource<T>(key: string | null, load: () => Promise<T>): Resource<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<ApiProblem>();
  const [version, setVersion] = useState(0);
  const latest = useRef(0);
  const loader = useRef(load);
  loader.current = load;

  useEffect(() => {
    if (key === null) return;
    const request = ++latest.current;
    loader
      .current()
      .then((result) => {
        if (request !== latest.current) return;
        setDataState(result);
        setError(undefined);
      })
      .catch((problem: ApiProblem) => {
        if (request === latest.current) setError(problem);
      });
  }, [key, version]);

  return {
    data,
    error,
    reload: useCallback(() => setVersion((current) => current + 1), []),
    setData: useCallback((update) => setDataState((current) => (current === undefined ? current : update(current))), []),
  };
}

/** Tracks a form submission: pending state plus field errors from the API. */
export function useSubmit() {
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>();

  async function submit(action: () => Promise<void>) {
    setPending(true);
    setErrors(undefined);
    try {
      await action();
    } catch (error) {
      const problem = error as ApiProblem;
      setErrors(problem.errors ?? { form: [problem.message] });
    } finally {
      setPending(false);
    }
  }

  return { pending, errors, setErrors, submit };
}

/** Warns before leaving with unsaved edits. Call the returned function before a deliberate redirect. */
export function useUnsavedChanges(dirty: boolean): () => void {
  const released = useRef(false);
  const guarded = useRef(dirty);
  guarded.current = dirty && !released.current;

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (guarded.current) event.preventDefault();
    };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, []);

  return () => {
    released.current = true;
    guarded.current = false;
  };
}
