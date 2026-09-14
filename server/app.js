const express = require('express');
const cors = require('cors');
const db = require('./db');
const api = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api', api);
app.get('/', (req, res) => res.sendFile(`${__dirname}/../public/index.html`));

async function start() {
  await db.init();
  return app.listen(PORT, () => {
    console.log(`📊 学生成绩管理系统运行在 http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('数据库初始化失败：', err);
    process.exit(1);
  });
}

module.exports = { app, start };
