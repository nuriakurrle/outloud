import { NavLink } from "react-router";
import logoSrc from "../../assets/logo/Letter.svg";

const NAV_ITEMS = [
  { label: "Home", to: "/" },
  { label: "Interactive", to: "/interactive" },
  { label: "Poster Maker", to: "/poster-maker" },
  { label: "Merch", to: "/merch" },
] as const;

export function Navbar() {
  return (
    <nav style={S.nav}>
      <img src={logoSrc} alt="Вголос!" style={S.logo} />

      <div style={S.right}>
        {NAV_ITEMS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            style={({ isActive }) =>
              isActive ? { ...S.link, ...S.linkActive } : S.link
            }
          >
            {label}
          </NavLink>
        ))}

        <div style={S.lang}>DE&nbsp;&nbsp;EN&nbsp;&nbsp;UA</div>
      </div>
    </nav>
  );
}

const S = {
  nav: {
    height: 48,
    flexShrink: 0,
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px 0 20px",
    zIndex: 100,
  } as React.CSSProperties,

  logo: {
    height: 44,
    width: "auto",
    filter: "brightness(0) invert(1)",
  } as React.CSSProperties,

  right: {
    display: "flex",
    alignItems: "stretch",
    height: "100%",
  } as React.CSSProperties,

  link: {
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    textDecoration: "none",
    fontSize: 13,
    fontFamily: "'Inria Sans', system-ui, sans-serif",
    fontWeight: 400,
    color: "#fff",
    background: "transparent",
    letterSpacing: "0.03em",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  linkActive: {
    background: "#fff",
    color: "#000",
    fontWeight: 600,
  } as React.CSSProperties,

  lang: {
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    fontSize: 12,
    fontFamily: "'Inria Sans', system-ui, sans-serif",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: "0.06em",
    borderLeft: "1px solid rgba(255,255,255,0.12)",
    marginLeft: 8,
  } as React.CSSProperties,
};
