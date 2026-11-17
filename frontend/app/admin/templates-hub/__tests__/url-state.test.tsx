import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const routeState = vi.hoisted(() => ({
  search: "",
  replace: vi.fn(),
  push: vi.fn(),
  params: new Map<string, URLSearchParams>(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routeState.push,
    replace: routeState.replace,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => {
    const key = routeState.search;
    const cached = routeState.params.get(key);
    if (cached) return cached;
    const params = new URLSearchParams(key);
    routeState.params.set(key, params);
    return params;
  },
}));

vi.mock("@/contexts/OrganizationContext", () => ({
  useOrganization: () => ({
    directorates: [],
    divisions: [],
    departments: [],
    isSyncing: false,
  }),
}));

vi.mock("@/hooks/use-org-users", () => ({
  useOrgUsers: () => ({ users: [], loading: false }),
}));

vi.mock("@/hooks/use-current-user", () => ({
  useCurrentUser: () => ({
    currentUser: { id: "user-1", name: "Admin User", isSuperuser: true },
    hydrated: true,
  }),
}));

vi.mock("@/hooks/use-user-permissions", () => ({
  useUserPermissions: () => ({
    canAccessAdministration: true,
    canManageOrgStructure: true,
  }),
}));

vi.mock("@/lib/api/document-templates", () => ({
  loadTemplates: vi.fn(async () => []),
  saveTemplate: vi.fn(),
  createTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));

vi.mock("@/lib/api/workflow", () => ({
  getWorkflowTemplates: vi.fn(async () => []),
  deleteWorkflowTemplate: vi.fn(),
  updateWorkflowTemplate: vi.fn(),
}));

vi.mock("@/lib/api/forms", () => ({
  getFormTemplates: vi.fn(async () => []),
  deleteFormTemplate: vi.fn(),
  cloneFormTemplate: vi.fn(),
  createFormTemplate: vi.fn(),
}));

vi.mock("@/lib/api/cases", () => ({
  getCaseTemplates: vi.fn(async () => []),
}));

vi.mock("@/lib/api/reference-schemes", () => ({
  listReferenceSchemes: vi.fn(async () => ({ count: 0, results: [] })),
}));

vi.mock("@/components/ui/sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/shared/AdminPageShell", () => ({
  AdminPageShell: ({
    title,
    subtitle,
    actions,
    stats,
    tabs,
    children,
  }: {
    title: string;
    subtitle: string;
    actions?: React.ReactNode;
    stats?: React.ReactNode;
    tabs?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {actions}
      {stats}
      {tabs}
      {children}
    </div>
  ),
}));

vi.mock("@/components/ClientErrorBoundary", () => ({
  ClientErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/help/ContextualHelp", () => ({
  ContextualHelp: () => null,
}));

vi.mock("@/components/dms/RichTextEditor", () => ({
  RichTextEditor: () => <textarea aria-label="Rich text editor" />,
}));

vi.mock("@/components/cases/CaseTemplatesPanel", () => ({
  CASE_TEMPLATE_TYPE_FILTERS: [
    { value: "all", label: "All types" },
    { value: "complaint", label: "Complaint" },
    { value: "legal", label: "Legal" },
  ],
  CaseTemplatesPanel: () => <div>Case templates panel</div>,
}));

vi.mock("@/components/templates/ReferencePanel", () => ({
  ReferencePanel: () => <div>Reference panel</div>,
}));

import TemplatesHubPage from "../page";

const replaceTarget = () => routeState.replace.mock.calls.at(-1)?.[0] as string | undefined;

const precedes = (earlier: Element, later: Element) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

async function renderAt(search: string) {
  routeState.search = search;
  render(<TemplatesHubPage />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Template Hub" })).toBeDefined());
}

describe("Template Hub URL state", () => {
  beforeEach(() => {
    routeState.search = "";
    routeState.replace.mockClear();
    routeState.push.mockClear();
    routeState.params.clear();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  });

  it("keeps summary statistics and page actions above the tab strip", async () => {
    await renderAt("tab=documents");

    const stats = screen.getByRole("group", { name: "Summary statistics" });
    const [headerAction] = screen.getAllByRole("button", { name: "New document template" });
    const tabList = screen.getByRole("tablist");

    expect(precedes(stats, tabList)).toBe(true);
    expect(precedes(headerAction, tabList)).toBe(true);
  });

  it("restores the Forms tab, category, and search from the URL", async () => {
    await renderAt("tab=forms&category=finance&q=budget");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Forms" }).getAttribute("aria-selected")).toBe(
        "true"
      );
    });
    expect(screen.getByRole("combobox", { name: "Form category" }).textContent).toContain(
      "Finance"
    );
    expect(
      (screen.getByRole("textbox", { name: "Search form templates" }) as HTMLInputElement).value
    ).toBe("budget");
  });

  it("restores the Cases tab and type from the URL", async () => {
    await renderAt("tab=cases&case_type=legal");

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Cases" }).getAttribute("aria-selected")).toBe(
        "true"
      );
    });
    expect(screen.getByRole("combobox", { name: "Case type" }).textContent).toContain("Legal");
  });

  it("writes the Forms category to the URL and removes it for All", async () => {
    const user = userEvent.setup();
    await renderAt("tab=forms");

    await user.click(screen.getByRole("combobox", { name: "Form category" }));
    await user.click(await screen.findByRole("option", { name: "Audit" }));

    await waitFor(() => {
      expect(replaceTarget()).toBe("/admin/templates-hub?tab=forms&category=audit");
    });

    await user.click(screen.getByRole("combobox", { name: "Form category" }));
    await user.click(await screen.findByRole("option", { name: "All" }));

    await waitFor(() => {
      expect(replaceTarget()).toBe("/admin/templates-hub?tab=forms");
    });
  });

  it("writes the Cases type to the URL", async () => {
    const user = userEvent.setup();
    await renderAt("tab=cases");

    await user.click(screen.getByRole("combobox", { name: "Case type" }));
    await user.click(await screen.findByRole("option", { name: "Legal" }));

    await waitFor(() => {
      expect(replaceTarget()).toBe("/admin/templates-hub?tab=cases&case_type=legal");
    });
  });

  it("writes search to the URL", async () => {
    const user = userEvent.setup();
    await renderAt("tab=forms");

    await user.type(screen.getByRole("textbox", { name: "Search form templates" }), "budget");

    await waitFor(
      () => {
        expect(replaceTarget()).toBe("/admin/templates-hub?tab=forms&q=budget");
      },
      { timeout: 2000 }
    );
  });

  it("switches tabs and pushes the new tab to the URL", async () => {
    const user = userEvent.setup();
    await renderAt("tab=documents");

    await user.click(screen.getByRole("tab", { name: "Forms" }));

    expect(routeState.push).toHaveBeenCalledWith("/admin/templates-hub?tab=forms", {
      scroll: false,
    });
  });
});
