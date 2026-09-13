const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/scores.db');
const db = new sqlite3.Database(dbPath);

// 初始化数据库
function init() {
  db.serialize(() => {
    // 考试配置表
    db.run(`
      CREATE TABLE IF NOT EXISTS exam_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        subjects TEXT NOT NULL,
        total_score INTEGER
      )
    `);

    // 成绩记录表
    db.run(`
      CREATE TABLE IF NOT EXISTS exam_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_type_id INTEGER NOT NULL,
        exam_date TEXT NOT NULL,
        exam_name TEXT NOT NULL,
        total_score INTEGER,
        class_rank INTEGER,
        grade_rank INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(exam_type_id) REFERENCES exam_types(id)
      )
    `);

    // 单科成绩表
    db.run(`
      CREATE TABLE IF NOT EXISTS subject_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_record_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        score REAL,
        max_score INTEGER,
        class_rank INTEGER,
        grade_rank INTEGER,
        FOREIGN KEY(exam_record_id) REFERENCES exam_records(id)
      )
    `);

    // 插入默认考试类型
    db.run(`INSERT OR IGNORE INTO exam_types (name, type, subjects, total_score) VALUES 
      ('周测', 'weekly', 'JSON', NULL),
      ('月考', 'monthly', 'JSON', 600),
      ('期中考', 'midterm', 'JSON', 600),
      ('期末考', 'final', 'JSON', 600),
      ('模拟考', 'mock', 'JSON', 600)
    `);
  });
}

// 辅助函数
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

module.exports = {
  db,
  init,
  run,
  get,
  all
};