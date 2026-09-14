const express = require('express');
const db = require('./db');

const router = express.Router();

const GRADE_CONFIG = {
  grade7: { name: '初一', subjects: ['语文', '数学', '英语', '道德与法治', '历史', '地理', '生物'] },
  grade8: { name: '初二', subjects: ['语文', '数学', '英语', '物理', '道德与法治', '历史', '地理', '生物'] },
  grade9: { name: '初三', subjects: ['语文', '数学', '英语', '物理', '化学', '道德与法治', '历史'] }
};
const EXAM_TYPES = { weekly: 1, monthly: 2, midterm: 3, final: 4, mock: 5 };
const SCORE_MAP = { '语文': 120, '数学': 120, '英语': 120, '物理': 70, '化学': 50, '道德与法治': 70, '历史': 50, '生物': 50, '地理': 50 };
const SUBJECT_ORDER = ['语文', '数学', '英语', '物理', '化学', '道德与法治', '历史', '地理', '生物'];

function isOptionalRank(value) {
  return value === null || value === undefined || value === '' || (Number.isInteger(Number(value)) && Number(value) > 0);
}

function numberOrNull(value) {
  return value === null || value === undefined || value === '' ? null : Number(value);
}

function maxScore(subject) {
  return SCORE_MAP[subject];
}

function orderSubjects(scores) {
  return [...scores].sort((a, b) => SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject));
}

function normalizePayload(payload) {
  const { exam_type, exam_type_id, exam_date, exam_name, grade, scores, total_class_rank, total_grade_rank } = payload;
  const type = exam_type || Object.keys(EXAM_TYPES).find((key) => EXAM_TYPES[key] === Number(exam_type_id));
  if (!type || !GRADE_CONFIG[grade] || !/^\d{4}-\d{2}-\d{2}$/.test(exam_date || '') || !String(exam_name || '').trim()) {
    throw new Error('请提供有效的考试类型、年级、日期和考试名称');
  }
  if (type === 'mock' && grade !== 'grade9') {
    throw new Error('模拟考仅适用于初三');
  }
  if (!scores || typeof scores !== 'object' || Array.isArray(scores)) {
    throw new Error('请至少提供一项科目成绩');
  }
  if (!isOptionalRank(total_class_rank) || !isOptionalRank(total_grade_rank)) {
    throw new Error('名次必须是正整数');
  }
  if (type === 'weekly' && total_grade_rank !== null && total_grade_rank !== undefined && total_grade_rank !== '') {
    throw new Error('周测不支持年级名次');
  }

  const allowedSubjects = type === 'weekly' ? ['语文', '数学', '英语'] : GRADE_CONFIG[grade].subjects;
  const normalizedScores = Object.entries(scores).map(([subject, item]) => {
    if (!allowedSubjects.includes(subject) || !item || typeof item !== 'object') {
      throw new Error('包含无效的科目成绩');
    }
    const score = Number(item.score);
    const itemMaxScore = type === 'weekly' ? Number(item.max_score) : maxScore(subject);
    if (!Number.isFinite(score) || score < 0 || !Number.isFinite(itemMaxScore) || itemMaxScore <= 0 || score > itemMaxScore) {
      throw new Error(`${subject}的得分或满分无效`);
    }
    if (!isOptionalRank(item.class_rank) || !isOptionalRank(item.grade_rank)) {
      throw new Error(`${subject}的名次必须是正整数`);
    }
    if (type === 'weekly' && item.grade_rank !== null && item.grade_rank !== undefined && item.grade_rank !== '') {
      throw new Error('周测不支持年级名次');
    }
    return { subject, score, max_score: itemMaxScore, class_rank: numberOrNull(item.class_rank), grade_rank: type === 'weekly' ? null : numberOrNull(item.grade_rank) };
  });
  if (!normalizedScores.length) throw new Error('请至少提供一项科目成绩');

  const total_score = normalizedScores.reduce((sum, item) => sum + item.score, 0);
  const total_max_score = normalizedScores.reduce((sum, item) => sum + item.max_score, 0);
  return { type, exam_type_id: EXAM_TYPES[type], exam_date, exam_name: exam_name.trim(), grade, scores: normalizedScores, total_score, total_max_score, total_class_rank: numberOrNull(total_class_rank), total_grade_rank: type === 'weekly' ? null : numberOrNull(total_grade_rank) };
}

async function listExams(where = '', params = []) {
  const exams = await db.all(`SELECT er.*, et.name AS exam_type_name, et.type
    FROM exam_records er JOIN exam_types et ON et.id = er.exam_type_id ${where}
    ORDER BY er.exam_date DESC, er.id DESC`, params);
  if (!exams.length) return exams;
  const scores = await db.all(`SELECT * FROM subject_scores WHERE exam_record_id IN (${exams.map(() => '?').join(',')})`, exams.map((exam) => exam.id));
  const scoresByExam = new Map();
  scores.forEach((score) => {
    const items = scoresByExam.get(score.exam_record_id) || [];
    items.push(score);
    scoresByExam.set(score.exam_record_id, items);
  });
  return exams.map((exam) => ({ ...exam, scores: orderSubjects(scoresByExam.get(exam.id) || []) }));
}

router.get('/config/grades', (req, res) => res.json(GRADE_CONFIG));
router.get('/config/subjects', (req, res) => res.json(SCORE_MAP));

router.get('/exams', async (req, res) => {
  try { res.json(await listExams()); } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/exams/:id', async (req, res) => {
  try {
    const [exam] = await listExams('WHERE er.id = ?', [req.params.id]);
    if (!exam) return res.status(404).json({ error: 'Exam record not found' });
    return res.json(exam);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

async function saveExam(payload, id = null) {
  const exam = normalizePayload(payload);
  await db.run('BEGIN');
  try {
    if (id) {
      const existing = await db.get('SELECT id FROM exam_records WHERE id = ?', [id]);
      if (!existing) {
        const error = new Error('Exam record not found'); error.status = 404; throw error;
      }
      await db.run(`UPDATE exam_records SET exam_type_id = ?, exam_date = ?, exam_name = ?, grade = ?, total_score = ?, total_max_score = ?, class_rank = ?, grade_rank = ? WHERE id = ?`,
        [exam.exam_type_id, exam.exam_date, exam.exam_name, exam.grade, exam.total_score, exam.total_max_score, exam.total_class_rank, exam.total_grade_rank, id]);
      await db.run('DELETE FROM subject_scores WHERE exam_record_id = ?', [id]);
    } else {
      const result = await db.run(`INSERT INTO exam_records (exam_type_id, exam_date, exam_name, grade, total_score, total_max_score, class_rank, grade_rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [exam.exam_type_id, exam.exam_date, exam.exam_name, exam.grade, exam.total_score, exam.total_max_score, exam.total_class_rank, exam.total_grade_rank]);
      id = result.lastID;
    }
    for (const score of exam.scores) {
      await db.run(`INSERT INTO subject_scores (exam_record_id, subject, score, max_score, class_rank, grade_rank) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, score.subject, score.score, score.max_score, score.class_rank, score.grade_rank]);
    }
    await db.run('COMMIT');
    return { id, ...exam };
  } catch (err) {
    await db.run('ROLLBACK').catch(() => {});
    throw err;
  }
}

router.post('/exams', async (req, res) => {
  try { const exam = await saveExam(req.body); res.status(201).json(exam); }
  catch (err) { res.status(err.status || 400).json({ error: err.message }); }
});
router.put('/exams/:id', async (req, res) => {
  try { res.json(await saveExam(req.body, req.params.id)); }
  catch (err) { res.status(err.status || 400).json({ error: err.message }); }
});
router.delete('/exams/:id', async (req, res) => {
  try {
    const result = await db.run('DELETE FROM exam_records WHERE id = ?', [req.params.id]);
    if (!result.changes) return res.status(404).json({ error: 'Exam record not found' });
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.get('/stats/trends', async (req, res) => {
  try {
    const { exam_type, subject } = req.query;
    const clauses = []; const params = [];
    if (exam_type) { clauses.push('et.type = ?'); params.push(exam_type); }
    if (subject) { clauses.push('ss.subject = ?'); params.push(subject); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await db.all(`SELECT er.id AS exam_id, er.exam_date, er.exam_name, et.type, er.total_score, er.total_max_score, ss.subject, ss.score, ss.max_score
      FROM exam_records er JOIN exam_types et ON et.id = er.exam_type_id JOIN subject_scores ss ON er.id = ss.exam_record_id ${where}
      ORDER BY er.exam_date ASC, er.id ASC`, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/stats/rankings/:exam_id', async (req, res) => {
  try {
    const exam = await db.get('SELECT class_rank, grade_rank FROM exam_records WHERE id = ?', [req.params.exam_id]);
    if (!exam) return res.status(404).json({ error: 'Exam record not found' });
    const scores = orderSubjects(await db.all('SELECT subject, class_rank, grade_rank FROM subject_scores WHERE exam_record_id = ?', [req.params.exam_id]));
    const classRankings = [...scores.map((score) => ({ subject: score.subject, rank: score.class_rank })), { subject: '总分', rank: exam.class_rank }]
      .filter((item) => item.rank !== null && item.rank !== undefined);
    const gradeRankings = [...scores.map((score) => ({ subject: score.subject, rank: score.grade_rank })), { subject: '总分', rank: exam.grade_rank }]
      .filter((item) => item.rank !== null && item.rank !== undefined);
    return res.json({ classRankings, gradeRankings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
