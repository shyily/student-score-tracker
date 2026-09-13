const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./db');
const api = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 初始化数据库
db.init();

// API 路由
app.use('/api', api);

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../public/index.html');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`📊 学生成绩管理系统运行在 http://localhost:${PORT}`);
});

module.exports = app;