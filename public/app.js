const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            currentTab: 'input',
            form: {
                exam_type: '',
                exam_date: '',
                exam_name: '',
                grade: 'grade7',
                scores: {}
            },
            exams: [],
            expandedExamId: null,
            filterType: '',
            selectedSubject: '',
            selectedExamForRanking: '',
            currentSubjects: [],
            allSubjects: [],
            charts: {},
            gradeConfig: {}
        };
    },
    computed: {
        filteredExams() {
            if (!this.filterType) {
                return this.exams;
            }
            return this.exams.filter(exam => exam.type === this.filterType);
        }
    },
    methods: {
        async loadGradeConfig() {
            try {
                const response = await fetch('/api/config/grades');
                this.gradeConfig = await response.json();
            } catch (err) {
                console.error('Error loading grade config:', err);
            }
        },

        updateSubjects() {
            // 根据年级和考试类型确定科目
            const gradeSubjects = {
                'grade7': ['语文', '数学', '英语', '道德与法治', '历史', '生物', '地理'],
                'grade8': ['语文', '数学', '英语', '物理', '道德与法治', '历史', '生物', '地理'],
                'grade9': ['语文', '数学', '英语', '物理', '化学', '道德与法治', '历史']
            };

            // 周测只考语文、数学、英语
            if (this.form.exam_type === 'weekly') {
                this.currentSubjects = ['语文', '数学', '英语'];
            } else {
                // 其他考试根据年级选择
                this.currentSubjects = gradeSubjects[this.form.grade] || [];
            }

            this.form.scores = {};
            this.currentSubjects.forEach(subject => {
                this.$set(this.form.scores, subject, null);
            });
        },

        getMaxScore(subject) {
            const scoreMap = {
                '语文': 120,
                '数学': 120,
                '英语': 120,
                '物理': 70,
                '化学': 50,
                '道德与法治': 70,
                '历史': 50,
                '生物': 50,
                '地理': 50
            };
            return scoreMap[subject] || 100;
        },

        getTotalScore() {
            return Object.values(this.form.scores).reduce((sum, score) => {
                return sum + (score || 0);
            }, 0);
        },

        async submitExam() {
            if (!this.form.exam_type || !this.form.exam_date || !this.form.exam_name) {
                alert('❌ 请填写考试类型、日期和名称');
                return;
            }

            if (this.getTotalScore() === 0) {
                alert('❌ 请至少输入一个科目成绩');
                return;
            }

            try {
                const examTypeMap = {
                    'weekly': 1,
                    'monthly': 2,
                    'midterm': 3,
                    'final': 4,
                    'mock': 5
                };

                const response = await fetch('/api/exams', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        exam_type_id: examTypeMap[this.form.exam_type],
                        exam_date: this.form.exam_date,
                        exam_name: this.form.exam_name,
                        grade: this.form.grade,
                        scores: this.form.scores
                    })
                });

                if (response.ok) {
                    alert('✅ 成绩保存成功！');
                    this.form = {
                        exam_type: '',
                        exam_date: '',
                        exam_name: '',
                        grade: 'grade7',
                        scores: {}
                    };
                    this.currentSubjects = [];
                    this.loadExams();
                } else {
                    alert('❌ 保存失败，请重试');
                }
            } catch (err) {
                console.error('Error:', err);
                alert('❌ 出错：' + err.message);
            }
        },

        async loadExams() {
            try {
                const response = await fetch('/api/exams');
                const data = await response.json();
                this.exams = data.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));

                // 收集所有科目
                const subjects = new Set();
                data.forEach(exam => {
                    if (exam.scores) {
                        exam.scores.forEach(score => {
                            subjects.add(score.subject);
                        });
                    }
                });
                this.allSubjects = Array.from(subjects).sort();
            } catch (err) {
                console.error('Error loading exams:', err);
            }
        },

        toggleExamDetails(examId) {
            if (this.expandedExamId === examId) {
                this.expandedExamId = null;
            } else {
                this.expandedExamId = examId;
            }
        },

        async deleteExam(examId) {
            if (!confirm('⚠️ 确定要删除这条成绩记录吗？')) {
                return;
            }

            try {
                const response = await fetch(`/api/exams/${examId}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    alert('✅ 已删除');
                    this.loadExams();
                }
            } catch (err) {
                console.error('Error:', err);
                alert('❌ 删除失败');
            }
        },

        getExamTypeName(type) {
            const nameMap = {
                'weekly': '周测',
                'monthly': '月考',
                'midterm': '期中考',
                'final': '期末考',
                'mock': '模拟考'
            };
            return nameMap[type] || type;
        },

        getGradeName(grade) {
            const nameMap = {
                'grade7': '初一',
                'grade8': '初二',
                'grade9': '初三'
            };
            return nameMap[grade] || grade;
        },

        async updateSubjectChart() {
            if (!this.selectedSubject) {
                return;
            }

            try {
                const response = await fetch(`/api/stats/trends?subject=${this.selectedSubject}`);
                const data = await response.json();

                const labels = [];
                const scores = [];
                const maxScores = [];

                data.forEach(item => {
                    if (item.subject === this.selectedSubject) {
                        labels.push(item.exam_name);
                        scores.push(item.score);
                        maxScores.push(item.max_score);
                    }
                });

                this.drawSubjectChart(labels, scores, maxScores);
            } catch (err) {
                console.error('Error:', err);
            }
        },

        drawSubjectChart(labels, scores, maxScores) {
            const ctx = document.getElementById('subjectScoreChart');
            if (!ctx) return;

            if (this.charts.subject) {
                this.charts.subject.destroy();
            }

            this.charts.subject = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: this.selectedSubject + '成绩',
                            data: scores,
                            borderColor: '#667eea',
                            backgroundColor: 'rgba(102, 126, 234, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 6,
                            pointBackgroundColor: '#667eea'
                        },
                        {
                            label: '满分',
                            data: maxScores,
                            borderColor: '#ccc',
                            borderDash: [5, 5],
                            tension: 0.4,
                            pointRadius: 4,
                            pointBackgroundColor: '#ccc'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: Math.max(...maxScores) || 150
                        }
                    }
                }
            });
        },

        async updateRankingChart() {
            if (!this.selectedExamForRanking) {
                return;
            }

            try {
                const response = await fetch(`/api/stats/rankings/${this.selectedExamForRanking}`);
                const data = await response.json();

                const subjects = data.map(item => item.subject);
                const scores = data.map(item => item.score || 0);
                const maxScores = data.map(item => item.max_score || 100);

                this.drawRankingChart(subjects, scores, maxScores);
            } catch (err) {
                console.error('Error:', err);
            }
        },

        drawRankingChart(subjects, scores, maxScores) {
            const ctx = document.getElementById('rankingChart');
            if (!ctx) return;

            if (this.charts.ranking) {
                this.charts.ranking.destroy();
            }

            this.charts.ranking = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: subjects,
                    datasets: [
                        {
                            label: '得分',
                            data: scores,
                            backgroundColor: '#667eea',
                            borderRadius: 6
                        },
                        {
                            label: '满分',
                            data: maxScores,
                            backgroundColor: '#e0e0e0',
                            borderRadius: 6
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        },

        async updateTotalScoreChart() {
            try {
                const response = await fetch('/api/exams');
                const exams = await response.json();

                const labels = exams.map(exam => exam.exam_name);
                const scores = exams.map(exam => exam.total_score);

                this.drawTotalScoreChart(labels, scores);
            } catch (err) {
                console.error('Error:', err);
            }
        },

        drawTotalScoreChart(labels, scores) {
            const ctx = document.getElementById('totalScoreChart');
            if (!ctx) return;

            if (this.charts.total) {
                this.charts.total.destroy();
            }

            this.charts.total = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: '总分',
                            data: scores,
                            borderColor: '#764ba2',
                            backgroundColor: 'rgba(118, 75, 162, 0.1)',
                            tension: 0.4,
                            fill: true,
                            pointRadius: 6,
                            pointBackgroundColor: '#764ba2'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    },
    watch: {
        currentTab(newTab) {
            if (newTab === 'view') {
                this.loadExams();
            } else if (newTab === 'chart') {
                this.$nextTick(() => {
                    this.updateTotalScoreChart();
                });
            }
        },
        'form.grade'() {
            this.updateSubjects();
        }
    },
    mounted() {
        this.loadGradeConfig();
        this.loadExams();
    }
});

app.mount('#app');