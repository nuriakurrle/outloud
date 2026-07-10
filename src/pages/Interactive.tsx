import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import { X, Webcam, Image as ImageIcon, Pencil, SprayCan, ChevronLeft } from "lucide-react";
import { useT } from "../i18n";
import {
  startBodySegmentation,
  type SegmentationHandle,
} from "../lib/bodySegmentation";
import {
  renderChalkFrame,
  DEFAULT_CHALK_ENGINE_CONFIG,
  type ChalkEngineConfig,
} from "../lib/chalkEngine";
import {
  renderStencilLive,
  renderStencilToCtx,
} from "../lib/stencilize";

type SourceMode = "upload" | "live";
type RenderMode = "chalk" | "stencil";

interface UploadedImage {
  url: string;
  img: HTMLImageElement;
  brightness: Float32Array;
  w: number;
  h: number;
}

interface StencilConfig { blockSize: number; c: number }

const DPR = 2;
const MAX_UPLOAD_DIM = 800;

function brightnessFromImageData(data: Uint8ClampedArray, n: number): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) / 255;
  }
  return out;
}

export default function Interactive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const segRef = useRef<SegmentationHandle | null>(null);
  const frameCounter = useRef(0);
  const brightnessBuf = useRef<Float32Array | null>(null);

  const [source, setSource] = useState<SourceMode>("upload");
  const [renderMode, setRenderMode] = useState<RenderMode>("chalk");
  const [config, setConfig] = useState<ChalkEngineConfig>({ ...DEFAULT_CHALK_ENGINE_CONFIG });
  const [stencilConfig, setStencilConfig] = useState<StencilConfig>({ blockSize: 300, c: 0 });
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState({ w: 640, h: 480 });
  const { t } = useT();

  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);
  const stencilConfigRef = useRef(stencilConfig);
  useEffect(() => { stencilConfigRef.current = stencilConfig; }, [stencilConfig]);
  const renderModeRef = useRef(renderMode);
  useEffect(() => { renderModeRef.current = renderMode; }, [renderMode]);

  const setCfg = useCallback(
    (patch: Partial<ChalkEngineConfig>) => setConfig((c) => ({ ...c, ...patch })),
    []
  );

  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const compute = () => {
      const r = area.getBoundingClientRect();
      const m = 24;
      const availW = Math.max(120, r.width - m * 2);
      const availH = Math.max(120, r.height - m * 2);
      const aspect = 4 / 3;
      let w = availW;
      let h = w / aspect;
      if (h > availH) { h = availH; w = h * aspect; }
      setSize({ w: Math.round(w), h: Math.round(h) });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(area);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size.w * DPR;
    canvas.height = size.h * DPR;
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, size.w, size.h);
    }
  }, [size]);

  useEffect(() => {
    if (source !== "upload" || !uploadedImage || renderMode !== "chalk") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    renderChalkFrame(ctx, uploadedImage.brightness, uploadedImage.w, uploadedImage.h, size.w, size.h, config, 0, false);
    ctx.restore();
  }, [config, uploadedImage, source, size, renderMode]);

  useEffect(() => {
    if (source !== "upload" || !uploadedImage || renderMode !== "stencil") return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    renderStencilToCtx(ctx, uploadedImage.img, stencilConfig.blockSize, stencilConfig.c, size.w, size.h);
    ctx.restore();
  }, [stencilConfig, uploadedImage, source, size, renderMode]);

  useEffect(() => () => segRef.current?.stop(), []);

  const handleImageUpload = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    // Handler VOR src setzen + onerror behandeln, sonst hängt ein nicht
    // dekodierbares Bild (z.B. HEIC) endlos und "es kommt nichts raus".
    const loaded = new Promise<boolean>((res) => {
      img.onload = () => res(true);
      img.onerror = () => res(false);
    });
    img.src = url;
    let ok = true;
    try { await img.decode(); } catch { ok = await loaded; }
    if (!ok || !img.naturalWidth) {
      URL.revokeObjectURL(url);
      setError("Bild konnte nicht geladen werden. Bitte JPG oder PNG verwenden.");
      return;
    }
    setError(null);
    const s = Math.min(1, MAX_UPLOAD_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.floor(img.naturalWidth * s));
    const h = Math.max(1, Math.floor(img.naturalHeight * s));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const brightness = brightnessFromImageData(imgData.data, w * h);
    setUploadedImage((prev) => { if (prev) URL.revokeObjectURL(prev.url); return { url, img, brightness, w, h }; });
  }, []);

  const clearUpload = useCallback(() => {
    setUploadedImage((prev) => { if (prev) URL.revokeObjectURL(prev.url); return null; });
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, size.w, size.h);
    }
  }, [size]);

  const handleStopLive = useCallback(() => {
    segRef.current?.stop();
    segRef.current = null;
    setIsLiveRunning(false);
  }, []);

  const startLive = useCallback(() => {
    const video = videoRef.current;
    if (!video || segRef.current) return;
    setError(null);
    frameCounter.current = 0;
    setIsLiveRunning(true);
    segRef.current = startBodySegmentation(
      video,
      (result) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;
        const cw = canvas.width / DPR;
        const ch = canvas.height / DPR;
        ctx.save();
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        if (renderModeRef.current === "stencil") {
          renderStencilLive(ctx, result.videoFrame.data, result.mask.data, result.width, result.height, cw, ch, stencilConfigRef.current.blockSize, stencilConfigRef.current.c);
        } else {
          const n = result.width * result.height;
          let brightness = brightnessBuf.current;
          if (!brightness || brightness.length !== n) { brightness = new Float32Array(n); brightnessBuf.current = brightness; }
          const d = result.videoFrame.data;
          const mask = result.mask.data;
          for (let i = 0; i < n; i++) {
            brightness[i] = mask[i * 4] < 128 ? 0 : (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
          }
          renderChalkFrame(ctx, brightness, result.width, result.height, cw, ch, configRef.current, frameCounter.current++, true);
        }
        ctx.restore();
      },
      (err) => { console.error("Kamera-Fehler:", err); setError(t.cameraError); handleStopLive(); }
    );
  }, [handleStopLive]);

  const switchSource = useCallback(
    (next: SourceMode) => { handleStopLive(); setSource(next); },
    [handleStopLive]
  );

  const savePNG = useCallback(() => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.download = `outloud-chalk-${Date.now()}.png`;
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
      } else if (e.key === "h" || e.key === "H") {
        setShowUI((u) => !u);
      } else if (e.key === "s" || e.key === "S") {
        savePNG();
      } else if (e.key === " " && source === "live") {
        e.preventDefault();
        if (isLiveRunning) handleStopLive();
        else startLive();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [source, isLiveRunning, savePNG, startLive, handleStopLive]);

  const liveDisabled = source !== "live";
  const isStencil = renderMode === "stencil";

  return (
    <div className="chalk-ui" style={S.root}>
      <div ref={areaRef} style={S.canvasArea}>
        <canvas ref={canvasRef} style={S.canvas} />
        {source === "upload" && !uploadedImage && (
          <div style={S.placeholder}>{t.pickImage}</div>
        )}
      </div>

      <video ref={videoRef} style={{ display: "none" }} playsInline muted />

      {showUI && (
        <aside style={S.sidebar}>
          <div>
            <div style={S.sectionLabel}>{t.source}</div>
            <div style={S.toggle}>
              <button onClick={() => switchSource("live")} style={S.toggleBtn(source === "live")}><Webcam size={16}/> Live</button>
              <button onClick={() => switchSource("upload")} style={S.toggleBtn(source === "upload")}><ImageIcon size={16}/> Upload</button>
            </div>
          </div>

          <div>
            <div style={S.sectionLabel}>{t.mode}</div>
            <div style={S.toggle}>
              <button onClick={() => setRenderMode("chalk")} style={S.toggleBtn(!isStencil)}><Pencil size={16}/> {t.chalk}</button>
              <button onClick={() => setRenderMode("stencil")} style={S.toggleBtn(isStencil)}><SprayCan size={16}/> {t.stencil}</button>
            </div>
          </div>

          {source === "upload" &&
            (uploadedImage ? (
              <div style={S.thumbRow}>
                <img src={uploadedImage.url} style={S.thumb} alt="" />
                <button onClick={clearUpload} style={S.thumbX}><X size={14} /></button>
              </div>
            ) : (
              <label style={S.fileLabel} data-chalk>
                {t.pickImage}
                <input type="file" accept="image/*" hidden onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                }} />
              </label>
            ))}

          {source === "live" && (
            <button onClick={isLiveRunning ? handleStopLive : startLive} style={S.liveBtn(isLiveRunning)}>
              {isLiveRunning ? t.cameraStop : t.cameraStart}
            </button>
          )}

          {error && <div style={S.error}>{error}</div>}
          <div style={S.divider} />

          {isStencil ? (
            <>
              <Slider label="Blocksize" value={stencilConfig.blockSize} min={3} max={800} step={1}
                onChange={(v) => setStencilConfig(prev => ({ ...prev, blockSize: v }))} fmt={(v) => String(v)} />
              <Slider label="C" value={stencilConfig.c} min={-50} max={50} step={1}
                onChange={(v) => setStencilConfig(prev => ({ ...prev, c: v }))} fmt={(v) => String(v)} />
            </>
          ) : (
            <>
              <Slider label={t.scale} value={config.scale} min={0.1} max={1} step={0.05} onChange={(v) => setCfg({ scale: v })} fmt={(v) => v.toFixed(2)} />
              <Slider label={t.resolution} value={config.resolution} min={2} max={20} step={1} onChange={(v) => setCfg({ resolution: v })} fmt={(v) => String(v)} />
              <Slider label={t.chalkDensity} value={config.density} min={0.1} max={1} step={0.05} onChange={(v) => setCfg({ density: v })} fmt={(v) => v.toFixed(2)} />
              <Slider label={t.threshold} value={config.threshold} min={0} max={1} step={0.02} onChange={(v) => setCfg({ threshold: v })} fmt={(v) => v.toFixed(2)} />
              <Slider label={t.noise} value={config.noise} min={0} max={1} step={0.02} onChange={(v) => setCfg({ noise: v })} fmt={(v) => v.toFixed(2)} />
              <Slider label={t.strokeDir} value={config.direction} min={0} max={360} step={1} onChange={(v) => setCfg({ direction: v })} fmt={(v) => `${v}°`} />
              <Slider label={t.strokeWeight} value={config.strokeWeight} min={1} max={8} step={0.5} onChange={(v) => setCfg({ strokeWeight: v })} fmt={(v) => v.toFixed(1)} />
              <Slider label={t.trail} value={config.trail} min={0} max={1} step={0.02} onChange={(v) => setCfg({ trail: v })} fmt={(v) => v.toFixed(2)} disabled={liveDisabled} />
              <Slider label={t.shimmer} value={config.shimmer} min={0} max={1} step={0.05} onChange={(v) => setCfg({ shimmer: v })} fmt={(v) => v.toFixed(2)} disabled={liveDisabled} />
            </>
          )}

          <div style={S.divider} />
          <button style={S.saveBtn} onClick={savePNG}>{t.savePng}</button>
          <Link to="/poster-maker" style={S.editorLink} data-chalk><ChevronLeft size={14}/>{t.backToEditor}</Link>
        </aside>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt, disabled = false }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; fmt: (v: number) => string; disabled?: boolean;
}) {
  return (
    <div style={{ ...S.sliderRow, opacity: disabled ? 0.4 : 1 }}>
      <div style={S.sliderLabel}>
        <span>{label}</span>
        <span style={S.sliderValue}>{fmt(value)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))} style={S.range} />
    </div>
  );
}

const S = {
  root: { display: "flex", height: "100%", background: "var(--surface-page)", overflow: "hidden" } as React.CSSProperties,
  canvasArea: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", minWidth: 0 } as React.CSSProperties,
  canvas: { boxShadow: "var(--shadow-float)", background: "var(--black)", display: "block" } as React.CSSProperties,
  placeholder: { position: "absolute", color: "var(--text-muted)", fontSize: 13, pointerEvents: "none" } as React.CSSProperties,
  sidebar: { width: 260, flexShrink: 0, background: "var(--surface-panel)", borderLeft: "1px solid var(--border-faint)", padding: "24px 20px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" } as React.CSSProperties,
  sectionLabel: { fontSize: 16, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 } as React.CSSProperties,
  toggle: { display: "flex", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border-subtle)" } as React.CSSProperties,
  toggleBtn: (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
    background: active ? "var(--btn-primary-bg)" : "var(--surface-raised)",
    color: active ? "var(--btn-primary-text)" : "var(--text-secondary)",
    border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer",
  }),
  fileLabel: { display: "block", padding: 14, textAlign: "center", background: "var(--surface-raised)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 14, color: "var(--text-secondary)" } as React.CSSProperties,
  thumbRow: { display: "flex", alignItems: "center", gap: 8, padding: 8, background: "var(--surface-raised)", borderRadius: "var(--radius-sm)" } as React.CSSProperties,
  thumb: { width: 48, height: 48, objectFit: "cover", borderRadius: "var(--radius-xs)" } as React.CSSProperties,
  thumbX: { marginLeft: "auto", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 14 } as React.CSSProperties,
  liveBtn: (running: boolean): React.CSSProperties => ({
    width: "100%", padding: 10,
    background: running ? "var(--surface-hover)" : "var(--btn-primary-bg)",
    color: running ? "var(--text-secondary)" : "var(--btn-primary-text)",
    border: "none", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer",
  }),
  error: { fontSize: 12, color: "var(--text-body)", lineHeight: 1.4 } as React.CSSProperties,
  divider: { height: 1, background: "var(--border-faint)" } as React.CSSProperties,
  sliderRow: { display: "flex", flexDirection: "column", gap: 3 } as React.CSSProperties,
  sliderLabel: { display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text-body)" } as React.CSSProperties,
  sliderValue: { color: "var(--text-secondary)", fontWeight: 600, fontVariantNumeric: "tabular-nums" } as React.CSSProperties,
  range: { width: "100%", accentColor: "var(--white)", height: 2 } as React.CSSProperties,
  saveBtn: { width: "100%", padding: 11, background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, cursor: "pointer" } as React.CSSProperties,
  editorLink: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "10px 12px", marginTop: 4, background: "var(--state-inactive-bg)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: 13, fontWeight: 600, textDecoration: "none", letterSpacing: "0.02em" } as React.CSSProperties,
};
