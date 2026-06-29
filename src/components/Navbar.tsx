import { NavLink } from "react-router";
import logoSrc from "../../assets/logo/Letter.svg";
import { useT, type Lang } from "../i18n";

const ROUTES = [
  { key: "navHome" as const, to: "/" },
  { key: "navInteractive" as const, to: "/interactive" },
  { key: "navPosterMaker" as const, to: "/poster-maker" },
  { key: "navMerch" as const, to: "/merch" },
];

const LANGS: { code: Lang; label: string }[] = [
  { code: "de", label: "DE" },
  { code: "en", label: "EN" },
  { code: "uk", label: "UA" },
];

export function Navbar() {
  const { t, lang, setLang } = useT();

  return (
    <nav style={S.nav}>
      <img src={logoSrc} alt="Вголос!" style={S.logo} />
      <div style={S.right}>
        {ROUTES.map(({ key, to }) => (
          <NavLink key={to} to={to} end={to === "/"}
            style={({ isActive }) => isActive ? { ...S.link, ...S.linkActive } : S.link}
          >
            {t[key]}
          </NavLink>
        ))}
        <div style={S.langBar}>
          {LANGS.map(({ code, label }, i) => (
            <button key={code} onClick={() => setLang(code)} style={{
              ...S.langBtn,
              color: lang === code ? "var(--white)" : "var(--text-muted)",
              fontWeight: lang === code ? 600 : 400,
              borderLeft: i === 0 ? "1px solid var(--border-subtle)" : "none",
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

const S = {
  nav: {
    height: "var(--nav-height)", flexShrink: 0, background: "var(--black)",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0 24px 0 20px", zIndex: 100,
  } as React.CSSProperties,

  logo: { height: 44, width: "auto", filter: "brightness(0) invert(1)" } as React.CSSProperties,

  right: { display: "flex", alignItems: "stretch", height: "100%" } as React.CSSProperties,

  link: {
    display: "flex", alignItems: "center", padding: "0 20px",
    textDecoration: "none", fontSize: 13,
    fontFamily: "'Inria Sans', system-ui, sans-serif",
    fontWeight: 400, color: "var(--white)", background: "transparent",
    letterSpacing: "0.03em", whiteSpace: "nowrap",
  } as React.CSSProperties,

  linkActive: { background: "var(--white)", color: "var(--black)", fontWeight: 600 } as React.CSSProperties,

  langBar: { display: "flex", alignItems: "center", marginLeft: 8 } as React.CSSProperties,

  langBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: "0 10px", height: "100%", fontSize: 12,
    fontFamily: "'Inria Sans', system-ui, sans-serif",
    letterSpacing: "0.06em",
  } as React.CSSProperties,
};
