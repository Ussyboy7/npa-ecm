import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { PAGE_ACCESS_KEYS, PERMISSION_KEYS } from "../authorization";

const catalog = readFileSync(
  resolve(process.cwd(), "../backend/organization/permissions_catalog.py"),
  "utf8",
);

const readTuple = (name: string): string[] => {
  const block = catalog.match(new RegExp(`${name}[^=]*=\\s*\\(([\\s\\S]*?)\\n\\)`))?.[1];
  if (!block) throw new Error(`Could not read ${name} from the backend catalog`);
  return [...block.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
};

const readPageKeys = (): string[] => {
  const block = catalog.match(/PAGE_ACCESS_RULES[^=]*=\s*\{([\s\S]*?)\n\}/)?.[1];
  if (!block) throw new Error("Could not read PAGE_ACCESS_RULES from the backend catalog");
  return [...block.matchAll(/^ {4}"([^"]+)": \{/gm)].map((match) => match[1]);
};

describe("authorization contract", () => {
  it("keeps permission keys aligned with the backend catalog", () => {
    expect([...PERMISSION_KEYS].sort()).toEqual(readTuple("PERMISSION_KEYS").sort());
  });

  it("keeps page access keys aligned with the backend catalog", () => {
    expect([...PAGE_ACCESS_KEYS].sort()).toEqual(readPageKeys().sort());
  });
});