const express = require('express');
const db = require('./db');
const router = express.Router();

// 获取所有考试记录
router.get('/exams', async (req, res) => {
  try {
    const exams = await db.all(`
      SELECT er.*, et.name as exam_type_name, et.type 
      FROM exam_records er
      JOIN exam_types et ON er.exam_type_id = et.id
      ORDER BY er.exam_date DESC
    `);
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取单个考试的详细成绩
router.get('/exams/:id', async (req, res) => {
  try {
    const exam = await db.get(`
      SELECT er.*, et.name as exam_type_name, et.type 
      FROM exam_records er
      JOIN exam_types et ON er.exam_type_id = et.id
      WHERE er.id = ?
    `, [req.params.id]);

    const scores = await db.all(`
      SELECT * FROM subject_scores 
      WHERE exam_record_id = ?
      ORDER BY subject
    `, [req.params.id]);

    res.json({ ...exam, scores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建新的考试记录
router.post('/exams', async (req, res) => {
  try {
    const { exam_type_id, exam_date, exam_name, scores } = req.body;

    // 计算总分
    const total_score = Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);

    const result = await db.run(`
      INSERT INTO exam_records (exam_type_id, exam_date, exam_name, total_score)
      VALUES (?, ?, ?, ?)
    `, [exam_type_id, exam_date, exam_name, total_score]);

    const exam_record_id = result.lastID;

    // 插入单科成绩
    for (const [subject, score] of Object.entries(scores)) {
      if (score !== null && score !== '') {
        // 获取该科目的满分
        const maxScore = getMaxScore(subject, exam_type_id);
        await db.run(`
          INSERT INTO subject_scores (exam_record_id, subject, score, max_score)
          VALUES (?, ?, ?, ?)
        `, [exam_record_id, subject, score, maxScore]);
      }
    }

    res.json({ id: exam_record_id, exam_name, exam_date, total_score });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新考试记录
router.put('/exams/:id', async (req, res) => {
  try {
    const { exam_date, exam_name, scores } = req.body;
    const total_score = Object.values(scores).reduce((sum, score) => sum + (score || 0), 0);

    await db.run(`
      UPDATE exam_records 
      SET exam_date = ?, exam_name = ?, total_score = ?
      WHERE id = ?
    `, [exam_date, exam_name, total_score, req.params.id]);

    // 删除旧的单科成绩
    await db.run(`DELETE FROM subject_scores WHERE exam_record_id = ?`, [req.params.id]);

    // 插入新的单科成绩
    for (const [subject, score] of Object.entries(scores)) {
      if (score !== null && score !== '') {
        const maxScore = getMaxScore(subject);
        await db.run(`
          INSERT INTO subject_scores (exam_record_id, subject, score, max_score)
          VALUES (?, ?, ?, ?)
        `, [req.params.id, subject, score, maxScore]);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除考试记录
router.delete('/exams/:id', async (req, res) => {
  try {
    await db.run(`DELETE FROM subject_scores WHERE exam_record_id = ?`, [req.params.id]);
    await db.run(`DELETE FROM exam_records WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取统计数据
router.get('/stats/trends', async (req, res) => {
  try {
    const { exam_type, subject } = req.query;

    let sql = `
      SELECT er.exam_date, er.exam_name, er.total_score, ss.subject, ss.score, ss.max_score
      FROM exam_records er
      LEFT JOIN subject_scores ss ON er.id = ss.exam_record_id
      WHERE 1=1
    `;
    const params = [];

    if (exam_type) {
      sql += ` AND et.type = ?`;
      params.push(exam_type);
    }

    if (subject) {
      sql += ` AND ss.subject = ?`;
      params.push(subject);
    }

    sql += ` ORDER BY er.exam_date ASC`;

    const data = await db.all(sql, params);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取成绩排名
router.get('/stats/rankings/:exam_id', async (req, res) => {
  try {
    const scores = await db.all(`
      SELECT subject, score, max_score
      FROM subject_scores
      WHERE exam_record_id = ?
      ORDER BY subject
    `, [req.params.exam_id]);

    // 按成绩排序
    const rankings = scores.sort((a, b) => (b.score || 0) - (a.score || 0));
    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 辅助函数：获取科目满分
function getMaxScore(subject, exam_type_id = null) {
  const scoreMap = {
    '语文': 120,
    '数学': 120,
    '英语': 120,
    '物理': 70,
    '化学': 50,
    '政治': 70,
    '历史': 50,
    '生物': 50,
    '地理': 50
  };
  return scoreMap[subject] || 100;
}

module.exports = router;