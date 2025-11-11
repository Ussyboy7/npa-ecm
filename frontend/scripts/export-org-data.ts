import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const structureModule = await import(
  pathToFileURL(path.resolve(__dirname, "../lib/npa-structure.ts")).href
);

const { GRADE_LEVELS } = structureModule;

const outputPath = path.resolve(__dirname, "../../backend/scripts/organization_data.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify({ GRADE_LEVELS }, null, 2)
);
console.log(`Wrote organization data to ${outputPath}`);
