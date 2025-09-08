import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import pgPromise from "pg-promise";
import { readFile } from "node:fs/promises";
import { CreateItemSchema, ItemRowSchema } from "../lib/itemModels";

const pgp = pgPromise({});
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");
export const db = pgp(connectionString);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

async function ensureSchema() {
  const raw = await readFile("./schema.sql", "utf8");
  if (raw.trim().length === 0) return;
  await db.none(raw); // execute sql, expect no return value
}

app.post("/api/items", async (req, res, next) => {
  try {
    const parsed = CreateItemSchema.parse(req.body);
    const { name, quantity } = parsed;
    const row = await db.one(
      `INSERT INTO item(name, quantity) VALUES($1, $2)
       RETURNING id, name, quantity, created_at`,
      [name, quantity]
    );
    const item = ItemRowSchema.parse(row);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

app.get("/api/items", async (_req, res, next) => {
  try {
    const rows = await db.manyOrNone(
      `SELECT id, name, quantity, created_at FROM item ORDER BY id DESC LIMIT 100`
    );

    const ItemsArraySchema = z.array(ItemRowSchema);
    const items = ItemsArraySchema.parse(rows);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

async function start() {
  await ensureSchema();
  const port = 4444;
  app.listen(port, () =>
    console.log(`API listening on port ${port}`)
  );
}

start().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});
