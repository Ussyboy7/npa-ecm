import React from "react";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SidebarVisibility } from "@/hooks/use-sidebar-visibility";

const navigation = vi.hoisted(() => ({
  pathname: "/admin/organization/acting",
  search: "",
  visibility: { showOrganizationActing: true } as Partial<SidebarVisibility>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));
vi.mock("@/hooks/use-sidebar-visibility", () => ({
  useSidebarVisibility: () => navigation.visibility,
}));

import { OrganizationTabList } from "../OrganizationTabList";

beforeEach(() => {
  navigation.pathname = "/admin/organization/acting";
  navigation.search = "";
  navigation.visibility = { showOrganizationActing: true };
});

afterEach(() => cleanup());

describe("Organization Acting navigation", () => {
  it("offers a single canonical Acting tab to office members", async () => {
    render(<OrganizationTabList />);

    const acting = await screen.findByRole("tab", { name: "Acting" });
    expect(acting.getAttribute("href")).toBe("/admin/organization/acting");
    expect(acting.getAttribute("aria-selected")).toBe("true");
    expect(screen.getAllByRole("tab", { name: "Acting" })).toHaveLength(1);
    expect(screen.queryByRole("tab", { name: "Structure" })).toBeNull();
  });

  it("shows the same Acting tab alongside admin Organization tabs", async () => {
    navigation.visibility = {
      showOrganizationActing: true,
      showOrganizationOffices: true,
      showUsersRoles: true,
    };

    render(<OrganizationTabList />);

    const acting = await screen.findByRole("tab", { name: "Acting" });
    expect(acting.getAttribute("href")).toBe("/admin/organization/acting");
    expect(screen.getByRole("tab", { name: "Structure" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Offices" })).toBeTruthy();
  });

  it("shows External entities alongside Acting when both are available", async () => {
    navigation.visibility = {
      showOrganizationActing: true,
      showExternalEntities: true,
    };

    render(<OrganizationTabList />);

    const acting = await screen.findByRole("tab", { name: "Acting" });
    const entities = screen.getByRole("tab", { name: "External entities" });
    expect(acting.getAttribute("href")).toBe("/admin/organization/acting");
    expect(entities.getAttribute("href")).toBe("/admin/organization/entities");
  });

  it("points Organization tabs at pages that exist", () => {
    for (const route of [
      "app/admin/organization/page.tsx",
      "app/admin/organization/acting/page.tsx",
      "app/admin/organization/entities/page.tsx",
    ]) {
      expect(existsSync(resolve(process.cwd(), route)), route).toBe(true);
    }
  });

  it("does not show Acting when the user has no Acting access", () => {
    navigation.visibility = { showOrganizationActing: false };

    render(<OrganizationTabList />);

    expect(screen.queryByRole("tab", { name: "Acting" })).toBeNull();
  });
});