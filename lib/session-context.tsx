"use client";

// Estado de sesión en memoria (sin localStorage): se pierde al recargar la
// página. Alimenta la navbar y la fila "TU MEJOR MARCA" del Salón de la Fama.

import { createContext, useContext, useState, type ReactNode } from "react";

export interface Session {
  name: string;
  guest: boolean;
}

interface SessionContextValue {
  session: Session | null;
  login: (name: string) => void;
  loginGuest: () => void;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const login = (name: string) => {
    setSession({ name: (name || "PLAYER1").toUpperCase().slice(0, 10), guest: false });
  };
  const loginGuest = () => setSession({ name: "INVITADO", guest: true });
  const logout = () => setSession(null);

  return (
    <SessionContext.Provider value={{ session, login, loginGuest, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
