#!/bin/bash

# 学生成绩管理系统 - 停止脚本

echo "⏹️  停止学生成绩管理系统..."

docker-compose down

echo "✅ 服务已停止"
echo "💾 数据已保存在 ./data/scores.db"