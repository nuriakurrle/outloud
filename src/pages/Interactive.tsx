import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import { X } from "lucide-react";
import { useT } from "../i18n";
import {
  renderChalkFrame,
  DEFAULT_CHALK_ENGINE_CONFIG,
  type ChalkEngineConfig,
} from "../lib/chalkEngine";

interface UploadedImage {
  url: string;
  brightness: Float32Array;
  w: number;
  h: number;
}

const DPR = 2;
const MAX_UPLOAD_DIM = 800;

function brightnessFromImageData(data: Uint8ClampedArray, n: number): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] =
      (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) /
      255;
  }
  return out;
}

export default function Interactive() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<ChalkEngineConfig>({
    ...DEFAULT_CHALK_ENGINE_CONFIG,
  });
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [showUI, setShowUI] = useState(true);
  const [size, setSize] = useState({ w: 640, h: 480 });
  const { t } = useT();

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
      if (h > availH) {
        h = availH;
        w = h * aspect;
      }
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
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, size.w, size.h);
    }
  }, [size]);

  useEffect(() => {
    if (!uploadedImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    renderChalkFrame(
      ctx,
      uploadedImage.brightness,
      uploadedImage.w,
      uploadedImage.h,
      size.w,
      size.h,
      config,
      0,
      false
    );
    ctx.restore();
  }, [config, uploadedImage, size]);

  const handleImageUpload = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      await new Promise((res) => (img.onload = res));
    }
    const s = Math.min(1, MAX_UPLOAD_DIM / Math.max(img.width, img.height));
    const w = Math.max(1, Math.floor(img.width * s));
    const h = Math.max(1, Math.floor(img.height * s));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const brightness = brightnessFromImageData(imgData.data, w * h);
    setUploadedImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { url, brightness, w, h };
    });
  }, []);

  const clearUpload = useCallback(() => {
    setUploadedImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, size.w, size.h);
    }
  }, [size]);

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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [savePNG]);

  return (
    <div className="chalk-ui" style={S.root}>
      <div ref={areaRef} style={S.canvasArea}>
        <canvas ref={canvasRef} style={S.canvas} />
        {!uploadedImage && (
          <div style={S.placeholder}>{t.pickImage}</div>
        )}
      </div>

      {showUI && (
        <aside style={S.sidebar}>
          {uploadedImage ? (
            <div style={S.thumbRow}>
              <img src={uploadedImage.url} style={S.thumb} alt="" />
              <button onClick={clearUpload} style={S.thumbX}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <label style={S.fileLabel} data-chalk>
              {t.pickImage}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                }}
              />
            </label>
          )}

          <div style={S.divider} />

          <Slider label="Scale" value={config.scale} min={0.1} max={1} step={0.05}
            onChange={(v) => setCfg({ scale: v })} fmt={(v) => v.toFixed(2)} />
          <Slider label="Resolution" value={config.resolution} min={2} max={20} step={1}
            onChange={(v) => setCfg({ resolution: v })} fmt={(v) => String(v)} />
          <Slider label="Chalk-Dichte" value={config.density} min={0.1} max={1} step={0.05}
            onChange={(v) => setCfg({ density: v })} fmt={(v) => v.toFixed(2)} />
          <Slider label="Threshold" value={config.threshold} min={0} max={1} step={0.02}
            onChange={(v) => setCfg({ threshold: v })} fmt={(v) => v.toFixed(2)} />
          <Slider label="Noise" value={config.noise} min={0} max={1} step={0.02}
            onChange={(v) => setCfg({ noise: v })} fmt={(v) => v.toFixed(2)} />
          <Slider label="Strichrichtung" value={config.direction} min={0} max={360} step={1}
            onChange={(v) => setCfg({ direction: v })} fmt={(v) => `${v}°`} />
          <Slider label="Strichstärke" value={config.strokeWeight} min={1} max={8} step={0.5}
            onChange={(v) => setCfg({ strokeWeight: v })} fmt={(v) => v.toFixed(1)} />

          <div style={S.divider} />

          <button style={S.saveBtn} onClick={savePNG}>
            {t.savePng}
          </button>

          <Link to="/poster-maker" style={S.editorLink} data-chalk>
            {t.backToEditor}
          </Link>
        </aside>
      )}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <div style={S.sliderRow}>
      <div style={S.sliderLabel}>
        <span>{label}</span>
        <span style={S.sliderValue}>{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={S.range}
      />
    </div>
  );
}

const S = {
  root: {
    display: "flex",
    height: "100%",
    background: "#0a0a0a",
    overflow: "hidden",
  } as React.CSSProperties,
  canvasArea: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minWidth: 0,
  } as React.CSSProperties,
  canvas: {
    boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
    background: "#0a0a0a",
    display: "block",
  } as React.CSSProperties,
  placeholder: {
    position: "absolute",
    color: "rgba(255,255,255,0.25)",
    fontSize: 13,
    pointerEvents: "none",
  } as React.CSSProperties,
  sidebar: {
    width: 260,
    flexShrink: 0,
    background: "#111",
    borderLeft: "1px solid #1a1a1a",
    padding: "24px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflowY: "auto",
  } as React.CSSProperties,
  fileLabel: {
    display: "block",
    padding: 14,
    textAlign: "center",
    background: "#1a1a1a",
    border: "1px dashed #333",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    color: "#777",
  } as React.CSSProperties,
  thumbRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 8,
    background: "#1a1a1a",
    borderRadius: 4,
  } as React.CSSProperties,
  thumb: {
    width: 48,
    height: 48,
    objectFit: "cover",
    borderRadius: 3,
  } as React.CSSProperties,
  thumbX: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "#666",
    cursor: "pointer",
    fontSize: 14,
  } as React.CSSProperties,
  divider: { height: 1, background: "#1a1a1a" } as React.CSSProperties,
  sliderRow: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  } as React.CSSProperties,
  sliderLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#666",
  } as React.CSSProperties,
  sliderValue: {
    color: "#999",
    fontWeight: 600,
    fontVariantNumeric: "tabular-nums",
  } as React.CSSProperties,
  range: {
    width: "100%",
    accentColor: "#e0e0e0",
    height: 2,
  } as React.CSSProperties,
  saveBtn: {
    width: "100%",
    padding: 11,
    background: "#e0e0e0",
    color: "#111",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  } as React.CSSProperties,
  editorLink: {
    display: "block",
    textAlign: "center",
    padding: "10px 12px",
    marginTop: 4,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 6,
    color: "#f5f2ed",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    letterSpacing: "0.02em",
  } as React.CSSProperties,
};
