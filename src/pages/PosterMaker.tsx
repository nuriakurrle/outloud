import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrushStroke, getAllBrushes, getBrush } from "svg-brush";
import type { Point } from "svg-brush";
import { Pencil, Plus, Redo2, Shuffle, Trash2, Undo2 } from "lucide-react";

const W = 560;
const H = 792; // A4

const COLORS = [
  "#FFFFFF",
  "#f5e6a3",
  "#e8a0b4",
  "#8cb8d4",
  "#9cc4a0",
  "#e8b87a",
  "#c45c5c",
  "#b89ad4",
  "#000000",
];

type Stroke = { id: string; d: string; color: string; opacity: number };

function genStrokes(
  brushName: string,
  count: number,
  direction: number,
  strokeWidth: number,
  color: string,
  seed: number
): Stroke[] {
  let s = seed | 0;
  const rand = () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
  const angle = (direction * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const span = Math.sqrt(W * W + H * H) * 0.78;
  const brush = getBrush(brushName);
  const result: Stroke[] = [];

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const perp = (t - 0.5) * Math.max(W, H) * 1.35 + (rand() - 0.5) * 80;
    const startX = W / 2 - cos * span + -sin * perp;
    const startY = H / 2 - sin * span + cos * perp;

    const nPts = 7 + Math.floor(rand() * 8);
    const pts: Point[] = [];
    for (let j = 0; j <= nPts; j++) {
      const jt = j / nPts;
      const wb = (rand() - 0.5) * 55;
      pts.push({
        x: startX + cos * jt * span * 2 + -sin * wb,
        y: startY + sin * jt * span * 2 + cos * wb,
      });
    }

    try {
      const d = createBrushStroke(pts, { brush, strokeWidth });
      if (d) result.push({ id: `g${seed}-${i}`, d, color, opacity: 0.5 + rand() * 0.45 });
    } catch {}
  }
  return result;
}

export default function PosterMaker() {
  const brushes = useMemo(() => getAllBrushes(), []);
  const [selBrush, setSelBrush] = useState(brushes[0].name);
  const [color, setColor] = useState("#FFFFFF");
  const [strokeWidth, setStrokeWidth] = useState(1.5);
  const [count, setCount] = useState(8);
  const [direction, setDirection] = useState(135);

  const [strokes, setStrokes] = useState<Stroke[]>(() =>
    genStrokes(brushes[0].name, 8, 135, 1.5, "#FFFFFF", 42)
  );
  const strokesRef = useRef(strokes);
  useEffect(() => { strokesRef.current = strokes; });

  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const commit = useCallback((next: Stroke[]) => {
    setPast(p => [...p.slice(-49), strokesRef.current]);
    setFuture([]);
    setStrokes(next);
  }, []);

  const undo = useCallback(() => {
    setPast(p => {
      if (!p.length) return p;
      const prev = p[p.length - 1];
      setFuture(f => [strokesRef.current, ...f]);
      setStrokes(prev);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(f => {
      if (!f.length) return f;
      const next = f[0];
      setPast(p => [...p, strokesRef.current]);
      setStrokes(next);
      return f.slice(1);
    });
  }, []);

  const handleGenerate = () =>
    commit(genStrokes(selBrush, count, direction, strokeWidth, color, (Math.random() * 999999) | 0));

  const handleAdd = () =>
    commit([
      ...strokesRef.current,
      ...genStrokes(selBrush, Math.max(1, Math.ceil(count / 2)), direction, strokeWidth, color, (Math.random() * 999999) | 0),
    ]);

  // Drawing
  const [mode, setMode] = useState<"move" | "draw">("move");
  const [liveD, setLiveD] = useState("");
  const drawPtsRef = useRef<Point[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);

  const getSVGPt = (e: React.PointerEvent): Point => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const t = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return { x: t.x, y: t.y };
  };

  const onDown = (e: React.PointerEvent) => {
    if (mode !== "draw") return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drawPtsRef.current = [getSVGPt(e)];
    setLiveD("");
  };

  const onMove = (e: React.PointerEvent) => {
    if (mode !== "draw" || !drawPtsRef.current.length) return;
    drawPtsRef.current = [...drawPtsRef.current, getSVGPt(e)];
    const pts = drawPtsRef.current;
    if (pts.length > 2) {
      try {
        setLiveD(createBrushStroke(pts, { brush: getBrush(selBrush), strokeWidth }));
      } catch {}
    }
  };

  const onUp = () => {
    if (mode !== "draw") return;
    if (liveD) {
      commit([...strokesRef.current, { id: `d${Date.now()}`, d: liveD, color, opacity: 1 }]);
    }
    drawPtsRef.current = [];
    setLiveD("");
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") undo();
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) redo();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo]);

  return (
    <div style={{ display: "flex", height: "100%", background: "#111", color: "#ccc", fontFamily: "'Inria Sans', system-ui, sans-serif", overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>

        <div style={S.group}>
          <div style={S.groupLabel}>Farbe</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 22, height: 22, borderRadius: "50%", background: c, padding: 0, cursor: "pointer",
                border: color === c ? "2.5px solid #fff" : "2px solid rgba(255,255,255,0.18)",
                boxShadow: c === "#000000" && color === c ? "0 0 0 1px #555" : undefined,
              }} />
            ))}
          </div>
        </div>

        <div style={S.group}>
          <div style={{ ...S.groupLabel, display: "flex", justifyContent: "space-between" }}>
            <span>Stärke</span><span style={{ color: "#666" }}>{strokeWidth.toFixed(1)}</span>
          </div>
          <input type="range" min={0.3} max={6} step={0.1} value={strokeWidth}
            onChange={e => setStrokeWidth(+e.target.value)} style={S.range} />
        </div>

        <div style={S.group}>
          <div style={S.groupLabel}>Generierung</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <div>
              <div style={{ ...S.sublabel, display: "flex", justifyContent: "space-between" }}>
                <span>Striche</span><span>{count}</span>
              </div>
              <input type="range" min={1} max={30} step={1} value={count}
                onChange={e => setCount(+e.target.value)} style={S.range} />
            </div>
            <div>
              <div style={{ ...S.sublabel, display: "flex", justifyContent: "space-between" }}>
                <span>Richtung</span><span>{direction}°</span>
              </div>
              <input type="range" min={0} max={360} step={1} value={direction}
                onChange={e => setDirection(+e.target.value)} style={S.range} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button onClick={handleGenerate} style={S.btnPrimary}>
              <Shuffle size={13} /><span>Generieren</span>
            </button>
            <button onClick={handleAdd} title="Striche hinzufügen" style={S.btnIcon}>
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div style={{ ...S.group, flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div style={S.groupLabel}>Brush</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 6, overflowY: "auto", flex: 1 }}>
            {brushes.map(b => (
              <button key={b.name} onClick={() => setSelBrush(b.name)} style={{
                textAlign: "left", padding: "6px 10px", borderRadius: 5, cursor: "pointer",
                background: selBrush === b.name ? "rgba(255,255,255,0.1)" : "transparent",
                border: selBrush === b.name ? "1px solid rgba(255,255,255,0.18)" : "1px solid transparent",
                color: selBrush === b.name ? "#fff" : "#777",
                fontSize: 12, fontFamily: "'Inria Sans', system-ui, sans-serif",
              }}>
                {b.name.replace("Figma ", "")}
              </button>
            ))}
          </div>
        </div>

      </aside>

      {/* ── Canvas + toolbar ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: 20 }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            style={{
              background: "#1e1e1e",
              maxWidth: "100%", maxHeight: "100%", display: "block",
              cursor: mode === "draw" ? "crosshair" : "default",
              touchAction: "none",
              boxShadow: "0 8px 48px rgba(0,0,0,0.7)",
            }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            {strokes.map(s => (
              <path key={s.id} d={s.d} fill={s.color} fillOpacity={s.opacity} />
            ))}
            {liveD && <path d={liveD} fill={color} fillOpacity={0.9} />}
          </svg>
        </div>

        {/* Toolbar */}
        <div style={S.toolbar}>
          <Btn
            active={mode === "draw"}
            title={mode === "draw" ? "Zeichnen aus" : "Zeichnen"}
            onClick={() => setMode(m => m === "draw" ? "move" : "draw")}
          >
            <Pencil size={15} />
          </Btn>

          <div style={S.divider} />

          <Btn disabled={!canUndo} title="Rückgängig (Strg+Z)" onClick={undo}>
            <Undo2 size={15} />
          </Btn>
          <Btn disabled={!canRedo} title="Wiederholen (Strg+Y)" onClick={redo}>
            <Redo2 size={15} />
          </Btn>

          <div style={S.divider} />

          <Btn title="Alles löschen" onClick={() => commit([])}>
            <Trash2 size={15} />
          </Btn>
        </div>
      </div>
    </div>
  );
}

function Btn({ children, active, disabled, title, onClick }: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: 7, cursor: disabled ? "not-allowed" : "pointer",
        background: active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
        color: disabled ? "#444" : active ? "#fff" : "#aaa",
        transition: "background 0.12s, border-color 0.12s",
      }}
    >
      {children}
    </button>
  );
}

const S = {
  sidebar: {
    width: 220,
    flexShrink: 0,
    background: "#181818",
    borderRight: "1px solid #252525",
    display: "flex",
    flexDirection: "column",
    padding: "14px 12px",
    gap: 18,
    overflow: "hidden",
  } as React.CSSProperties,
  group: {} as React.CSSProperties,
  groupLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: "#555",
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    borderBottom: "1px solid #252525",
    paddingBottom: 5,
    marginBottom: 2,
  } as React.CSSProperties,
  sublabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 2,
  } as React.CSSProperties,
  range: {
    width: "100%",
    accentColor: "#fff",
    display: "block",
    marginTop: 4,
    cursor: "pointer",
  } as React.CSSProperties,
  btnPrimary: {
    flex: 1,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: "7px 10px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: 6, color: "#ddd", fontSize: 12, fontWeight: 600, cursor: "pointer",
    fontFamily: "'Inria Sans', system-ui, sans-serif",
  } as React.CSSProperties,
  btnIcon: {
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "7px 10px",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 6, color: "#777", cursor: "pointer",
  } as React.CSSProperties,
  toolbar: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    padding: "10px 20px",
    background: "#141414",
    borderTop: "1px solid #222",
  } as React.CSSProperties,
  divider: {
    width: 1, height: 22, background: "#2a2a2a", margin: "0 6px",
  } as React.CSSProperties,
};
