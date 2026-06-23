import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generisches Undo/Redo über Snapshots. `live` ist der aktuelle Zustand (wird
 * pro Render in einer Ref gespiegelt), `apply` stellt einen Snapshot wieder her.
 * `commit()` legt den aktuellen Zustand auf den Undo-Stapel (vor einer Änderung).
 */
export function useUndoRedo<T>(live: T, apply: (snapshot: T) => void) {
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  });

  const commit = useCallback(() => {
    setPast((p) => [...p, liveRef.current].slice(-50));
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [liveRef.current, ...f]);
      apply(prev);
      return p.slice(0, -1);
    });
  }, [apply]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, liveRef.current]);
      apply(next);
      return f.slice(1);
    });
  }, [apply]);

  return {
    commit,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
