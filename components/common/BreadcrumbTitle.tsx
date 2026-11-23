"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Setter = (title: string | null) => void;

const BreadcrumbTitleContext = createContext<{
  title: string | null;
  setTitle: Setter;
}>({ title: null, setTitle: () => {} });

export function BreadcrumbTitleProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState<string | null>(null);
  return (
    <BreadcrumbTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </BreadcrumbTitleContext.Provider>
  );
}

/** Layout side: current dynamic title set by the page, if any. */
export function useBreadcrumbTitleValue() {
  return useContext(BreadcrumbTitleContext).title;
}

/** Page side: sets the last crumb label; cleared on unmount. */
export function useBreadcrumbTitle(title?: string | null) {
  const { setTitle } = useContext(BreadcrumbTitleContext);
  const value = title?.trim() || null;
  useEffect(() => {
    setTitle(value);
    return () => setTitle(null);
  }, [value, setTitle]);
}
