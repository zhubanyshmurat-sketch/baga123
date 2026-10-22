import fs from "node:fs";
import path from "node:path";
import { generateSeed } from "./seed-sql";

const out = path.resolve(__dirname, "../supabase/seed.sql");
fs.writeFileSync(out, generateSeed());
console.log("wrote", path.relative(process.cwd(), out));
