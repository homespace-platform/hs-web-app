"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DASHBOARD_ROLE_HOME,
  type DashboardRole,
  inferRoleFromPath,
  readStoredDashboardRole,
  writeStoredDashboardRole,
} from "@/lib/dashboard-role";

type DashboardRoleContextValue = {
  role: DashboardRole | null;
  hydrated: boolean;
  isRolePickerOpen: boolean;
  openRolePicker: () => void;
  closeRolePicker: () => void;
  selectRole: (role: DashboardRole, options?: { navigate?: boolean }) => void;
  homePath: string | null;
};

const DashboardRoleContext = createContext<DashboardRoleContextValue | null>(null);

export function DashboardRoleProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<DashboardRole | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);

  useEffect(() => {
    setRole(readStoredDashboardRole());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !pathname?.startsWith("/dashboard")) return;
    const inferred = inferRoleFromPath(pathname);
    if (inferred && inferred !== role) {
      setRole(inferred);
      writeStoredDashboardRole(inferred);
    }
  }, [hydrated, pathname, role]);

  const openRolePicker = useCallback(() => setIsRolePickerOpen(true), []);
  const closeRolePicker = useCallback(() => setIsRolePickerOpen(false), []);

  const selectRole = useCallback(
    (next: DashboardRole, options?: { navigate?: boolean }) => {
      setRole(next);
      writeStoredDashboardRole(next);
      setIsRolePickerOpen(false);
      if (options?.navigate !== false) {
        router.push(DASHBOARD_ROLE_HOME[next]);
      }
    },
    [router]
  );

  const value = useMemo<DashboardRoleContextValue>(
    () => ({
      role,
      hydrated,
      isRolePickerOpen,
      openRolePicker,
      closeRolePicker,
      selectRole,
      homePath: role ? DASHBOARD_ROLE_HOME[role] : null,
    }),
    [role, hydrated, isRolePickerOpen, openRolePicker, closeRolePicker, selectRole]
  );

  return (
    <DashboardRoleContext.Provider value={value}>{children}</DashboardRoleContext.Provider>
  );
}

export function useDashboardRole(): DashboardRoleContextValue {
  const ctx = useContext(DashboardRoleContext);
  if (!ctx) {
    throw new Error("useDashboardRole must be used within DashboardRoleProvider");
  }
  return ctx;
}
