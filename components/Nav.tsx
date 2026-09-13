"use client";

// Navbar sticky + menú móvil, portado de resources/templates/nav.jsx.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/lib/session-context";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { session, logout } = useSession();

  const isHome = pathname === "/";
  const isBiblioteca = pathname === "/biblioteca" || pathname.startsWith("/juego");
  const isSalon = pathname === "/salon";
  const isAcercaDe = pathname === "/acerca-de";
  const isAuth = pathname === "/auth";
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={close}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isHome ? "active" : ""}>Inicio</Link>
          <Link href="/biblioteca" className={isBiblioteca ? "active" : ""}>Biblioteca</Link>
          <Link href="/salon" className={isSalon ? "active" : ""}>Salón de la Fama</Link>
          <Link href="/acerca-de" className={isAcercaDe ? "active" : ""}>Acerca de</Link>
        </div>
        <div className="spacer" />
        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>
        {session ? (
          <button className="btn ghost auth-btn" onClick={logout}>{session.name} ▾</button>
        ) : (
          <Link href="/auth" className="btn auth-btn">Iniciar Sesión</Link>
        )}
        <button className="btn ghost hamburger" onClick={() => setOpen(true)} aria-label="Menú">≡</button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close} />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <Link href="/" className={isHome ? "active" : ""} onClick={close}>Inicio</Link>
        <Link href="/biblioteca" className={isBiblioteca ? "active" : ""} onClick={close}>Biblioteca</Link>
        <Link href="/salon" className={isSalon ? "active" : ""} onClick={close}>Salón de la Fama</Link>
        <Link href="/acerca-de" className={isAcercaDe ? "active" : ""} onClick={close}>Acerca de</Link>
        <Link href="/auth" className={isAuth ? "active" : ""} onClick={close}>{session ? "Cuenta" : "Iniciar Sesión"}</Link>
        <div style={{ flex: 1 }} />
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>CRÉDITOS · 03</div>
      </aside>
    </>
  );
}
