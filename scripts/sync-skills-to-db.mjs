import mysql from "mysql2/promise";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PROJECT_ROOT, "skills");

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    console.error(
      `缺少环境变量 ${name}。请先设置以下变量（例如写入 ~/.zshrc 后 source）：\n` +
        `  SKILL_HUB_HOST / SKILL_HUB_USER / SKILL_HUB_PASSWORD / SKILL_HUB_DATABASE\n` +
        `  可选：SKILL_HUB_PORT（默认 3306）/ SKILL_HUB_SPACE_ID / SKILL_HUB_CATEGORY_ID`,
    );
    process.exit(1);
  }
  return v;
}

const DB_CONFIG = {
  host: requireEnv("SKILL_HUB_HOST"),
  port: Number(process.env.SKILL_HUB_PORT || 3306),
  user: requireEnv("SKILL_HUB_USER"),
  password: requireEnv("SKILL_HUB_PASSWORD"),
  database: requireEnv("SKILL_HUB_DATABASE"),
};

const SPACE_ID = Number(requireEnv("SKILL_HUB_SPACE_ID"));
const CATEGORY_ID = Number(requireEnv("SKILL_HUB_CATEGORY_ID"));

const VALID_STATUS = new Set(["draft", "beta", "stable", "deprecated"]);
const SKIP_FILES = new Set([".DS_Store"]);

function parseFrontmatter(raw) {
  const m = raw.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const body = m[1];
  const lines = body.split(/\r?\n/);
  const result = {};

  const unquote = (v) => {
    let s = v.trim();
    if (
      (s.startsWith('"') && s.endsWith('"')) ||
      (s.startsWith("'") && s.endsWith("'"))
    ) {
      s = s.slice(1, -1);
    }
    return s;
  };

  const scalarKeys = ["name", "description", "version", "status"];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const key of scalarKeys) {
      const re = new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`);
      const km = line.match(re);
      if (km && result[key] === undefined) {
        const val = unquote(km[1]);
        if (val !== "") result[key] = val;
      }
    }
    if (/^\s*tags:\s*$/.test(line)) {
      const tags = [];
      const baseIndent = line.match(/^(\s*)/)[1].length;
      for (let j = i + 1; j < lines.length; j++) {
        const item = lines[j].match(/^(\s*)-\s*(.+?)\s*$/);
        if (item && item[1].length > baseIndent) {
          tags.push(unquote(item[2]));
        } else if (lines[j].trim() === "") {
          continue;
        } else {
          break;
        }
      }
      if (tags.length && result.tags === undefined) result.tags = tags;
    }
    const inline = line.match(/^\s*tags:\s*\[(.+)\]\s*$/);
    if (inline && result.tags === undefined) {
      result.tags = inline[1]
        .split(",")
        .map((s) => unquote(s))
        .filter(Boolean);
    }
  }

  if (result.status && !VALID_STATUS.has(result.status)) {
    delete result.status;
  }
  return result;
}

async function collectFiles(dir, baseDir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (SKIP_FILES.has(ent.name)) continue;
    const abs = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      out.push(...(await collectFiles(abs, baseDir)));
    } else if (ent.isFile()) {
      const rel = path.relative(baseDir, abs).split(path.sep).join("/");
      if (rel === "SKILL.md") continue;
      out.push({ relPath: rel, absPath: abs });
    }
  }
  return out;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (dryRun) console.log("[dry-run] 仅预览，不写入数据库\n");

  const dirEntries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
  const skillNames = dirEntries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  console.log(`本地 skills 目录：${skillNames.length} 个 skill\n`);

  const conn = await mysql.createConnection(DB_CONFIG);
  console.log(`已连接数据库 ${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
  console.log(`目标 space_id=${SPACE_ID}, category_id=${CATEGORY_ID}\n`);

  let inserted = 0;
  let updated = 0;
  let fileInserted = 0;
  let fileUpdated = 0;
  let fileDeleted = 0;
  const skipped = [];

  if (!dryRun) await conn.beginTransaction();

  try {
    for (const name of skillNames) {
      const skillDir = path.join(SKILLS_DIR, name);
      const skillMdPath = path.join(skillDir, "SKILL.md");

      let content;
      try {
        content = await fs.readFile(skillMdPath, "utf-8");
      } catch {
        skipped.push(`${name}（无 SKILL.md）`);
        continue;
      }

      const fm = parseFrontmatter(content);
      const skillName = fm.name || name;
      if (fm.name && fm.name !== name) {
        console.log(`  [warn] ${name}: frontmatter name="${fm.name}" 与目录名不一致，以 frontmatter 为准`);
      }
      const description = fm.description ?? "";
      const version = fm.version || "1.0.0";

      const [existRows] = await conn.query(
        "SELECT id FROM skills WHERE space_id=? AND category_id=? AND name=?",
        [SPACE_ID, CATEGORY_ID, skillName],
      );

      let skillId;
      if (existRows.length > 0) {
        skillId = existRows[0].id;
        const sets = ["description=?", "content=?", "version=?"];
        const vals = [description, content, version];
        if (fm.status !== undefined) {
          sets.push("status=?");
          vals.push(fm.status);
        }
        if (fm.tags !== undefined) {
          sets.push("tags=?");
          vals.push(JSON.stringify(fm.tags));
        }
        vals.push(skillId);
        if (!dryRun) {
          await conn.query(`UPDATE skills SET ${sets.join(", ")} WHERE id=?`, vals);
        }
        updated++;
        console.log(`  [update] ${skillName} (id=${skillId}) v${version}`);
      } else {
        if (!dryRun) {
          const [res] = await conn.query(
            `INSERT INTO skills
               (name, description, content, space_id, category_id,
                author_name, author_open_id, team, status, version, tags, sort_order)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [
              skillName,
              description,
              content,
              SPACE_ID,
              CATEGORY_ID,
              "",
              "",
              "",
              fm.status || "draft",
              version,
              fm.tags ? JSON.stringify(fm.tags) : null,
              0,
            ],
          );
          skillId = res.insertId;
        }
        inserted++;
        console.log(`  [insert] ${skillName} (${dryRun ? "dry-run" : "id=" + skillId}) v${version}`);
      }

      const files = await collectFiles(skillDir, skillDir);
      const localPaths = new Set(files.map((f) => f.relPath));

      let dbPaths = new Set();
      if (skillId) {
        const [dbFileRows] = await conn.query(
          "SELECT file_path FROM skill_files WHERE skill_id=?",
          [skillId],
        );
        dbPaths = new Set(dbFileRows.map((r) => r.file_path));
      }

      for (const f of files) {
        const fileContent = await fs.readFile(f.absPath, "utf-8");
        const isUpdate = dbPaths.has(f.relPath);
        if (!dryRun && skillId) {
          await conn.query(
            `INSERT INTO skill_files (skill_id, file_path, content)
             VALUES (?,?,?)
             ON DUPLICATE KEY UPDATE content=VALUES(content)`,
            [skillId, f.relPath, fileContent],
          );
        }
        if (isUpdate) fileUpdated++;
        else fileInserted++;
      }

      const toDelete = [...dbPaths].filter((p) => !localPaths.has(p));
      if (toDelete.length > 0) {
        if (!dryRun && skillId) {
          const ph = toDelete.map(() => "?").join(",");
          await conn.query(
            `DELETE FROM skill_files WHERE skill_id=? AND file_path IN (${ph})`,
            [skillId, ...toDelete],
          );
        }
        fileDeleted += toDelete.length;
      }

      console.log(
        `           ↳ 附加文件 本地 ${files.length} 个（新增 ${
          files.filter((f) => !dbPaths.has(f.relPath)).length
        } / 更新 ${files.filter((f) => dbPaths.has(f.relPath)).length} / 删除 ${toDelete.length}）`,
      );
    }

    if (!dryRun) await conn.commit();
  } catch (err) {
    if (!dryRun) await conn.rollback();
    throw err;
  } finally {
    await conn.end();
  }

  console.log(
    `\n完成：skill 新增 ${inserted} / 更新 ${updated}；` +
      `附加文件 新增 ${fileInserted} / 更新 ${fileUpdated} / 删除 ${fileDeleted}${dryRun ? "（dry-run，未写库）" : ""}`,
  );
  if (skipped.length) console.log(`跳过：${skipped.join("、")}`);
}

main().catch((err) => {
  console.error("上传失败:", err);
  process.exit(1);
});
