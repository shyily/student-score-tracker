const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'scores.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

async function addColumnIfMissing(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

async function init() {
  await run('PRAGMA foreign_keys = ON');
  await run(`CREATE TABLE IF NOT EXISTS exam_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    type TEXT UNIQUE NOT NULL,
    subjects TEXT NOT NULL,
    total_score INTEGER
  )`);
  await run(`CREATE TABLE IF NOT EXISTS exam_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_type_id INTEGER NOT NULL,
    exam_date TEXT NOT NULL,
    exam_name TEXT NOT NULL,
    grade TEXT NOT NULL DEFAULT 'grade7',
    total_score REAL NOT NULL DEFAULT 0,
    total_max_score REAL,
    class_rank INTEGER,
    grade_rank INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(exam_type_id) REFERENCES exam_types(id)
  )`);
  await run(`CREATE TABLE IF NOT EXISTS subject_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_record_id INTEGER NOT NULL,
    subject TEXT NOT NULL,
    score REAL NOT NULL,
    max_score REAL NOT NULL,
    class_rank INTEGER,
    grade_rank INTEGER,
    FOREIGN KEY(exam_record_id) REFERENCES exam_records(id) ON DELETE CASCADE
  )`);

  await addColumnIfMissing('exam_records', 'grade', "grade TEXT NOT NULL DEFAULT 'grade7'");
  await addColumnIfMissing('exam_records', 'total_max_score', 'total_max_score REAL');

  await run(`INSERT OR IGNORE INTO exam_types (id, name, type, subjects, total_score) VALUES
    (1, '周测', 'weekly', 'JSON', NULL),
    (2, '月考', 'monthly', 'JSON', 600),
    (3, '期中考', 'midterm', 'JSON', 600),
    (4, '期末考', 'final', 'JSON', 600),
    (5, '模拟考', 'mock', 'JSON', 600)`);
}

module.exports = { db, init, run, get, all };
