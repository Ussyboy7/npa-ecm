import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import { SidebarProvider, useSidebar } from "../sidebar";

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

function SidebarStateProbe() {
  const { state } = useSidebar();
  return <span data-testid="sidebar-state">{state}</span>;
}

function clearSidebarCookie() {
  document.cookie = "sidebar:state=; path=/; max-age=0";
}

describe("SidebarProvider collapse state", () => {
  beforeEach(clearSidebarCookie);
  afterEach(() => {
    cleanup();
    clearSidebarCookie();
  });

  it("restores the collapsed state from the sidebar cookie", async () => {
    document.cookie = "sidebar:state=false; path=/";

    render(
      <SidebarProvider>
        <SidebarStateProbe />
      </SidebarProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("sidebar-state").textContent).toBe("collapsed");
    });
  });
});
