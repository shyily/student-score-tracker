const { createApp } = Vue;
const SUBJECT_ORDER = ['语文', '数学', '英语', '物理', '化学', '道德与法治', '历史', '地理', '生物'];

const app = createApp({
  data() {
    return {
      currentTab: 'input', exams: [], expandedExamId: null, filterType: '', selectedSubject: '', subjectTrendMode: 'standard', charts: {},
      gradeConfig: {}, scoreMap: {}, currentSubjects: [], editingId: null,
      form: { exam_type: '', exam_date: '', exam_name: '', grade: 'grade7', scores: {}, total_class_rank: null, total_grade_rank: null }
    };
  },
  computed: {
    filteredExams() { return this.filterType ? this.exams.filter((exam) => exam.type === this.filterType) : this.exams; },
    allSubjects() { return [...new Set(this.exams.flatMap((exam) => exam.scores.map((score) => score.subject)))].sort((a, b) => SUBJECT_ORDER.indexOf(a) - SUBJECT_ORDER.indexOf(b)); },
    examFilters() { return [{ value: '', label: '📊 全部考试' }, { value: 'weekly', label: '📝 周测' }, { value: 'monthly', label: '🗓️ 月考' }, { value: 'midterm', label: '📌 期中考' }, { value: 'final', label: '🏁 期末考' }, { value: 'mock', label: '🎯 模拟考' }]; },
    isWeekly() { return this.form.exam_type === 'weekly'; },
    availableExamTypes() {
      const types = [
        { value: 'weekly', label: '周测' }, { value: 'monthly', label: '月考' },
        { value: 'midterm', label: '期中考' }, { value: 'final', label: '期末考' }
      ];
      return this.form.grade === 'grade9' ? [...types, { value: 'mock', label: '模拟考' }] : types;
    }
  },
  methods: {
    async loadConfig() {
      const [grades, subjects] = await Promise.all([fetch('/api/config/grades'), fetch('/api/config/subjects')]);
      this.gradeConfig = await grades.json(); this.scoreMap = await subjects.json();
    },
    emptyForm() { return { exam_type: '', exam_date: '', exam_name: '', grade: 'grade7', scores: {}, total_class_rank: null, total_grade_rank: null }; },
    updateSubjects() {
      if (!this.form.exam_type) {
        this.currentSubjects = [];
        this.form.scores = {};
        return;
      }
      const subjects = this.isWeekly ? ['语文', '数学', '英语'] : (this.gradeConfig[this.form.grade]?.subjects || []);
      const existing = this.form.scores;
      this.currentSubjects = subjects;
      this.form.scores = Object.fromEntries(subjects.map((subject) => [subject, existing[subject] || { score: null, max_score: this.scoreMap[subject], class_rank: null, grade_rank: null }]));
      if (!this.isWeekly) this.form.total_grade_rank ??= null;
    },
    getSubjectMaxScore(subject) { return this.isWeekly ? (this.form.scores[subject]?.max_score || 0) : this.scoreMap[subject] || 0; },
    getTotalScore() { return this.currentSubjects.reduce((sum, subject) => sum + (Number(this.form.scores[subject]?.score) || 0), 0); },
    getTotalMaxScore() { return this.currentSubjects.reduce((sum, subject) => sum + (Number(this.getSubjectMaxScore(subject)) || 0), 0); },
    formatScoreRate(score, maxScore) {
      const denominator = Number(maxScore);
      return denominator > 0 ? `${((Number(score) || 0) / denominator * 100).toFixed(1)}%` : '—';
    },
    getGradeName(grade) { return this.gradeConfig[grade]?.name || grade; },
    getExamTypeName(type) { return ({ weekly: '周测', monthly: '月考', midterm: '期中考', final: '期末考', mock: '模拟考' })[type] || type; },
    async loadExams(expandLatest = false) {
      const response = await fetch('/api/exams');
      if (!response.ok) throw new Error('无法读取成绩记录');
      this.exams = await response.json();
      if (expandLatest) this.expandedExamId = this.exams[0]?.id || null;
    },
    async submitExam() {
      if (!this.form.exam_type || !this.form.exam_date || !this.form.exam_name || !this.currentSubjects.length) return alert('请填写考试类型、日期、名称和成绩');
      if (!this.getTotalScore()) return alert('请至少输入一项大于 0 的成绩');
      try {
        const response = await fetch(this.editingId ? `/api/exams/${this.editingId}` : '/api/exams', { method: this.editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(this.form) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '保存失败');
        alert(this.editingId ? '✅ 成绩已更新！' : '✅ 成绩保存成功！');
        this.form = this.emptyForm(); this.currentSubjects = []; this.editingId = null; await this.loadExams();
      } catch (err) { alert(`❌ ${err.message}`); }
    },
    editExam(exam) {
      this.editingId = exam.id;
      this.form = { exam_type: exam.type, exam_date: exam.exam_date, exam_name: exam.exam_name, grade: exam.grade, total_class_rank: exam.class_rank, total_grade_rank: exam.grade_rank, scores: Object.fromEntries(exam.scores.map((score) => [score.subject, { score: score.score, max_score: score.max_score, class_rank: score.class_rank, grade_rank: score.grade_rank }])) };
      this.updateSubjects(); this.currentTab = 'input'; window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    toggleExamDetails(id) { this.expandedExamId = this.expandedExamId === id ? null : id; },
    async deleteExam(id) {
      if (!confirm('确定要删除这条成绩记录吗？')) return;
      const response = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      if (!response.ok) return alert('❌ 删除失败');
      await this.loadExams(true);
    },
    async updateSubjectChart() {
      if (!this.selectedSubject) return;
      const data = await (await fetch(`/api/stats/trends?subject=${encodeURIComponent(this.selectedSubject)}`)).json();
      const isWeekly = this.subjectTrendMode === 'weekly';
      const filtered = data.filter((item) => isWeekly ? item.type === 'weekly' : item.type !== 'weekly');
      const values = filtered.map((item) => isWeekly ? this.getScoreRate(item.score, item.max_score) : item.score);
      const maxValues = filtered.map((item) => isWeekly ? 100 : item.max_score);
      this.drawChart('subject', 'subjectScoreChart', 'line', filtered.map((item) => item.exam_name), [{ label: `${this.selectedSubject}${isWeekly ? '得分率（%）' : '成绩'}`, data: values, borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,.1)', fill: true }, { label: isWeekly ? '满分得分率（100%）' : '满分', data: maxValues, borderColor: '#ccc', borderDash: [5, 5] }]);
    },
    getScoreRate(score, maxScore) { return Number(maxScore) > 0 ? Number(((Number(score) || 0) / Number(maxScore) * 100).toFixed(1)) : 0; },
    updateTotalScoreCharts() {
      const orderedExams = [...this.exams].reverse();
      this.drawTotalChart('weeklyTotal', 'weeklyTotalChart', orderedExams.filter((exam) => exam.type === 'weekly'), '总分得分率（%）', true);
      this.drawTotalChart('monthlyTotal', 'monthlyTotalChart', orderedExams.filter((exam) => exam.type === 'monthly'), '总分');
      this.drawTotalChart('standardTotal', 'standardTotalChart', orderedExams.filter((exam) => !['weekly', 'monthly'].includes(exam.type)), '总分');
    },
    drawTotalChart(key, id, exams, label, useRate = false) { this.drawChart(key, id, 'line', exams.map((exam) => exam.exam_name), [{ label, data: exams.map((exam) => useRate ? this.getScoreRate(exam.total_score, exam.total_max_score) : exam.total_score), borderColor: '#764ba2', backgroundColor: 'rgba(118,75,162,.1)', fill: true }]); },
    drawChart(key, id, type, labels, datasets) {
      const context = document.getElementById(id); if (!context) return;
      this.charts[key]?.destroy();
      this.charts[key] = new Chart(context, { type, data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } } });
    }
  },
  watch: {
    currentTab(tab) { if (tab === 'view') this.loadExams(true); if (tab === 'chart') this.$nextTick(() => this.updateTotalScoreCharts()); },
    'form.grade'() {
      if (this.form.grade !== 'grade9' && this.form.exam_type === 'mock') this.form.exam_type = '';
      if (this.form.exam_type) this.updateSubjects();
    },
    'form.exam_type'() { this.updateSubjects(); }
  },
  async mounted() { try { await this.loadConfig(); await this.loadExams(); } catch (err) { console.error(err); alert('无法连接服务器，请检查服务是否启动'); } }
});

app.mount('#app');
