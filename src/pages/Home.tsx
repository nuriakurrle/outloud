import { useEffect, useRef } from "react";
import { Link } from "react-router";
import logoSrc from "../../assets/logo/Letter.svg";

export default function Home() {
  const logoRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    const PERIOD = 5000; // ms for one full swing
    const RANGE = 20;   // ±20 deg

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = (ts - startRef.current) / PERIOD;
      const deg = Math.sin(t * 2 * Math.PI) * RANGE;
      if (logoRef.current) logoRef.current.style.transform = `rotate(${deg}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={S.root}>
      <div style={S.card}>
        <div style={S.text}>
          <h1 style={S.heading}>Welcome to Outloud!</h1>
          <p style={S.body}>
            Outloud! is a Ukrainian social project based in Munich.<br />
            We host meet-ups to talk about political topics, organize<br />
            fundraisers and spread the word about the Ukrainian cause.
          </p>
          <p style={S.body}>
            More infos about the project are coming, for now checkout the{" "}
            <Link to="/poster-maker" style={S.link}>Poster Maker</Link>,{" "}
            <Link to="/interactive" style={S.link}>Interactive</Link> and{" "}
            <Link to="/merch" style={S.link}>Merch</Link>!
          </p>
        </div>
        <img ref={logoRef} src={logoSrc} alt="Вголос!" style={S.logo} />
      </div>
    </div>
  );
}

const S = {
  root: {
    height: "100%",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 6vw",
    boxSizing: "border-box",
  } as React.CSSProperties,

  card: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4vw",
    width: "100%",
  } as React.CSSProperties,

  text: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 24,
  } as React.CSSProperties,

  heading: {
    margin: 0,
    fontFamily: '"KyivType Serif", sans-serif',
    fontWeight: 700,
    fontSize: "clamp(28px, 4vw, 52px)",
    color: "#fff",
    lineHeight: 1.1,
  } as React.CSSProperties,

  body: {
    margin: 0,
    fontFamily: '"Inter", sans-serif',
    fontSize: "clamp(14px, 1.6vw, 20px)",
    color: "#fff",
    lineHeight: 1.6,
  } as React.CSSProperties,

  link: {
    color: "#fff",
    fontWeight: 700,
    textDecoration: "none",
  } as React.CSSProperties,

  logo: {
    flexShrink: 0,
    width: "clamp(160px, 22vw, 340px)",
    height: "auto",
    filter: "brightness(0) invert(1)",
    transformOrigin: "center center",
  } as React.CSSProperties,
};
