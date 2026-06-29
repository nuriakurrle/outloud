import { useDesignerContext } from "./context";

const SIDES = ["top", "right", "bottom", "left"] as const;

export function MarginPanel() {
  const { margins, setMargins } = useDesignerContext();
  const set = (k: keyof typeof margins) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setMargins(prev => ({ ...prev, [k]: Math.max(0, Math.min(49, Number(e.target.value))) }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
      {SIDES.map(k => (
        <label key={k} style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 12, color: "#999", textTransform: "capitalize" }}>
          {k}
          <input
            type="number" min={0} max={49} value={margins[k]}
            onChange={set(k)}
            style={{ background: "#252525", border: "1px solid #3a3a3a", color: "#ddd", borderRadius: 4, padding: "4px 6px", fontSize: 13, fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
          />
        </label>
      ))}
    </div>
  );
}
