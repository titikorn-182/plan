import { readFile, writeFile } from "node:fs/promises";

const databaseTypesPath = new URL("../types/database.generated.ts", import.meta.url);
const generatedTypes = await readFile(databaseTypesPath, "utf8");
const normalizedTypes = `${generatedTypes.replaceAll("\r\n", "\n").trimEnd()}\n`;

await writeFile(databaseTypesPath, normalizedTypes, "utf8");
