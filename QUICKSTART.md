# 🚀 快速开始指南

## 在群晖NAS上部署

### 前置条件
- 群晖NAS已安装Docker套件
- NAS网络可访问

### 步骤1：下载项目

在NAS上打开Terminal（SSH），执行：

```bash
# 进入NAS的共享文件夹或自定义目录
cd /volume1/docker

# 克隆项目
git clone https://github.com/shyily/student-score-tracker.git
cd student-score-tracker
```

### 步骤2：启动服务

```bash
# 使用Docker Compose启动
docker-compose up -d

# 查看运行日志
docker-compose logs -f student-score-tracker
```

### 步骤3：访问系统

打开浏览器，访问：
```
http://您的NAS-IP:3000
```

例如：`http://192.168.1.100:3000`

---

## 本地开发运行

### 前置条件
- 安装 Node.js 18+
- 安装 npm 或 yarn

### 步骤

```bash
# 1. 克隆项目
git clone https://github.com/shyily/student-score-tracker.git
cd student-score-tracker

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev

# 或生产模式
npm start
```

访问 `http://localhost:3000`

---

## 📊 使用示例

### 示例1：录入周测成绩

1. 选择标签页「➕ 录入成绩」
2. **考试类型**: 选择「周测」
3. **考试日期**: 2026-09-13
4. **考试名称**: 第1周周测
5. **成绩与本次试卷满分**:
   - 语文: 49 / 65
   - 数学: 88 / 100
   - 英语: 92 / 100
6. 填写总分和各科的班级名次
7. 点击「✅ 保存成绩」

> 总分和总满分自动计算为：49 + 88 + 92 = **229 / 265分**

### 示例2：录入月考成绩

1. **考试类型**: 选择「月考」
2. **考试日期**: 2026-09-20
3. **考试名称**: 9月月考
4. **成绩**（按所选年级显示固定科目满分）:
   - 语文: 115
   - 数学: 108
   - 英语: 112
   - 物理: 65
   - 化学: 48
   - 道德与法治: 68
   - 历史: 48
   - 生物: 45
   - 地理: 42
5. 填写总分和各科班级名次；年级名次可选
6. 点击「✅ 保存成绩」

> 总分自动计算为：**591分**

### 示例3：查看成绩趋势

1. 选择标签页「📈 数据分析」
2. 在「单科成绩趋势」选择「数学」
3. 查看数学成绩的曲线变化

> 模拟考选项仅在选择「初三」后显示。

---

## 📁 项目结构

```
student-score-tracker/
├── server/                 # 后端代码
│   ├── app.js            # Express应用主文件
│   ├── db.js             # SQLite数据库模块
│   └── api.js            # API路由定义
├── public/                # 前��代码
│   ├── index.html        # 主页面
│   ├── style.css         # 样式文件
│   └── app.js            # Vue 3应用
├── data/                  # 数据存储（首次启动时自动创建）
│   └── scores.db         # SQLite数据库文件
├── package.json          # Node.js依赖配置
├── docker-compose.yml    # Docker Compose配置
├── .gitignore           # Git忽略文件
└── README.md            # 项目文档
```

---

## 💾 数据备份与恢复

### 备份数据

```bash
# 复制数据库文件到安全位置
cp ./data/scores.db ~/backup/scores_$(date +%Y%m%d).db
```

### 恢复数据

```bash
# 停止服务
docker-compose down

# 恢复数据库文件
cp ~/backup/scores_20240913.db ./data/scores.db

# 重启服务
docker-compose up -d
```

---

## 🔧 常见问题

### Q1: 无法访问系统
**A**: 检查以下几点：
- NAS IP地址是否正确
- Docker容器是否运行：`docker-compose ps`
- 防火墙是否阻止3000端口
- 查看日志：`docker-compose logs app`

### Q2: 数据丢失了
**A**: 
- 确保 `./data/scores.db` 文件存在
- 从备份恢复：参考「数据备份与恢复」
- 不要删除 `data` 文件夹

### Q3: 如何修改访问端口
**A**: 编辑 `docker-compose.yml`，将 `3000:3000` 改为 `你的端口:3000`：

```yaml
services:
  app:
    ports:
      - "8080:3000"  # 改为8080
```

然后重启：`docker-compose restart`

### Q4: 如何更新代码
**A**:
```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose up -d --build
```

### Q5: 支持多个学生吗
**A**: 目前系统设计为单个学生。如需多生管理，可以：
- 分别为每个学生建立独立的容器实例，使用不同端口
- 或后续版本升级支持

---

## 🎓 学年配置说明

系统已预置以下年级配置：

### 初一（7年级）
- 科目：语文、数学、英语、物理、化学、政治、历史、生物、地理
- 考试类型：周测、月考、期中考、期末考、模拟考

### 初二（8年级）
- 变化：加入物理，移除生物和地理
- 科目：语文、数学、英语、物理、化学、政治、历史

### 初三（9年级）
- 变化：加入化学，移除生物和地理
- 科目：语文、数学、英语、物理、化学、政治、历史

> 系统默认配置为初一所有科目，后续可根据需要调整

---

## 🌟 功能对比

| 功能 | 周测 | 月考/期中/期末 |
|------|------|----------------|
| 科目数 | 3科（语数英） | 9科 |
| 总分 | 自动计算（不固定） | 600分 |
| 语文满分 | 120 | 120 |
| 数学满分 | 120 | 120 |
| 英语满分 | 120 | 120 |
| 物理满分 | - | 70 |
| 化学满分 | - | 50 |
| 政治满分 | - | 70 |
| 历史满分 | - | 50 |
| 生物满分 | - | 50 |
| 地理满分 | - | 50 |

---

## 📞 技术支持

如遇到问题，请：
1. 查看日志：`docker-compose logs -f app`
2. 检查 [GitHub Issues](https://github.com/shyily/student-score-tracker/issues)
3. 提交新Issue描述问题

---

## 📝 更新日志

### v1.0.0 (2026-09-13)
- ✅ 初始版本发布
- ✅ 支持5种考试类型
- ✅ 完整的数据可视化
- ✅ Docker部署方案
- ✅ 响应式设计

---

**祝您使用愉快！🎉**
