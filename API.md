# API 文档

## 基础信息

- **基础URL**: `http://localhost:3000/api` (本地) 或 `http://your-nas-ip:3000/api` (NAS)
- **请求格式**: JSON
- **响应格式**: JSON
- **认证**: 无需认证（本地系统）

---

## 成绩管理 API

### 1️⃣ 获取所有成绩记录

**请求**
```http
GET /api/exams
```

**响应示例**
```json
[
  {
    "id": 1,
    "exam_type_id": 1,
    "exam_name": "第1周周测",
    "exam_date": "2024-09-13",
    "type": "weekly",
    "exam_type_name": "周测",
    "grade": "grade7",
    "total_score": 229,
    "total_max_score": 265,
    "class_rank": 3,
    "grade_rank": null,
    "created_at": "2024-09-13 10:30:00",
    "scores": [
      {
        "id": 1,
        "exam_record_id": 1,
        "subject": "语文",
        "score": 49,
        "max_score": 65,
        "class_rank": 2,
        "grade_rank": null
      },
      {
        "id": 2,
        "exam_record_id": 1,
        "subject": "数学",
        "score": 88,
        "max_score": 120
      },
      {
        "id": 3,
        "exam_record_id": 1,
        "subject": "英语",
        "score": 92,
        "max_score": 120
      }
    ]
  }
]
```

---

### 2️⃣ 获取单个成绩记录详情

**请求**
```http
GET /api/exams/:id
```

**参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 成绩记录ID |

**响应示例**
```json
{
  "id": 1,
  "exam_type": "weekly",
  "grade": "grade7",
  "exam_name": "第1周周测",
  "exam_date": "2024-09-13",
  "type": "weekly",
  "total_score": 275,
  "scores": [
    {
      "id": 1,
      "subject": "语文",
      "score": 95,
      "max_score": 120
    }
  ]
}
```

---

### 3️⃣ 创建新的成绩记录

**请求**
```http
POST /api/exams
Content-Type: application/json
```

**请求体**
```json
{
  "exam_type_id": 1,
  "exam_date": "2024-09-13",
  "exam_name": "第1周周测",
  "total_class_rank": 3,
  "scores": {
    "语文": { "score": 49, "max_score": 65, "class_rank": 2 },
    "数学": { "score": 88, "max_score": 100, "class_rank": 4 },
    "英语": { "score": 92, "max_score": 100, "class_rank": 3 }
  }
}
```

**参数说明**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| exam_type | string | ✅ | `weekly`、`monthly`、`midterm`、`final` 或 `mock` |
| grade | string | ✅ | `grade7`、`grade8` 或 `grade9` |
| exam_date | string | ✅ | 考试日期 (格式: YYYY-MM-DD) |
| exam_name | string | ✅ | 考试名称 |
| scores | object | ✅ | 科目成绩对象，值包含得分、班级名次及可选年级名次；周测还必须给出各科 `max_score` |

**考试类型ID对应**
```
1 = 周测 (weekly)
2 = 月考 (monthly)
3 = 期中考 (midterm)
4 = 期末考 (final)
5 = 模拟考 (mock)
```

**科目名称**
```
周测: "语文", "数学", "英语"（每科满分由本次请求的 `max_score` 决定）
其他: 根据年级使用固定科目和满分；年级名次可省略
```

**响应示例**
```json
{
  "id": 1,
  "exam_name": "第1周周测",
  "exam_date": "2024-09-13",
  "total_score": 275
}
```

---

### 4️⃣ 更新成绩记录

**请求**
```http
PUT /api/exams/:id
Content-Type: application/json
```

**请求体**
```json
{
  "exam_date": "2024-09-13",
  "exam_name": "第1周周测（修改）",
  "scores": {
    "语文": 96,
    "数学": 89,
    "英语": 93
  }
}
```

**响应示例**
```json
{
  "success": true
}
```

---

### 5️⃣ 删除成绩记录

**请求**
```http
DELETE /api/exams/:id
```

**参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| id | number | 成绩记录ID |

**响应示例**
```json
{
  "success": true
}
```

---

## 统计分析 API

### 6️⃣ 获取成绩趋势数据

用于生成单科成绩的趋势曲线图。

**请求**
```http
GET /api/stats/trends?subject=数学
```

**查询参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| subject | string | 科目名称 (可选，不指定则返回所有) |
| exam_type | string | 考试类型 (weekly/monthly/midterm/final/mock，可选) |

**响应示例**
```json
[
  {
    "exam_date": "2024-09-13",
    "exam_name": "第1周周测",
    "total_score": 275,
    "subject": "数学",
    "score": 88,
    "max_score": 120
  },
  {
    "exam_date": "2024-09-20",
    "exam_name": "9月月考",
    "total_score": 591,
    "subject": "数学",
    "score": 108,
    "max_score": 120
  }
]
```

---

### 7️⃣ 获取单次考试成绩排名

用于生成单次考试各科成绩对比柱状图。

**请求**
```http
GET /api/stats/rankings/:exam_id
```

**参数**
| 参数 | 类型 | 说明 |
|------|------|------|
| exam_id | number | 成绩记录ID |

**响应示例**
```json
[
  {
    "id": 1,
    "exam_record_id": 1,
    "subject": "数学",
    "score": 88,
    "max_score": 120
  },
  {
    "id": 2,
    "exam_record_id": 1,
    "subject": "英语",
    "score": 92,
    "max_score": 120
  },
  {
    "id": 3,
    "exam_record_id": 1,
    "subject": "语文",
    "score": 95,
    "max_score": 120
  }
]
```

---

## 使用示例

### 示例1：使用cURL创建成绩记录

```bash
curl -X POST http://localhost:3000/api/exams \
  -H "Content-Type: application/json" \
  -d '{
    "exam_type_id": 1,
    "exam_date": "2024-09-13",
    "exam_name": "第1周周测",
    "scores": {
      "语文": 95,
      "数学": 88,
      "英语": 92
    }
  }'
```

### 示例2：使用JavaScript (Fetch API)

```javascript
// 创建成绩
const response = await fetch('http://localhost:3000/api/exams', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    exam_type_id: 2,
    exam_date: '2024-09-20',
    exam_name: '9月月考',
    scores: {
      '语文': 115,
      '数学': 108,
      '英语': 112,
      '物理': 65,
      '化学': 48,
      '政治': 68,
      '历史': 48,
      '生物': 45,
      '地理': 42
    }
  })
});

const data = await response.json();
console.log(data);
```

### 示例3：使用Python

```python
import requests
import json

# 创建成绩记录
url = 'http://localhost:3000/api/exams'
payload = {
    'exam_type_id': 1,
    'exam_date': '2024-09-13',
    'exam_name': '第1周周测',
    'scores': {
        '语文': 95,
        '数学': 88,
        '英语': 92
    }
}

response = requests.post(url, json=payload)
print(response.json())

# 获取所有成绩
response = requests.get('http://localhost:3000/api/exams')
exams = response.json()
for exam in exams:
    print(f"{exam['exam_name']}: {exam['total_score']}分")
```

### 示例4：使用Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// 创建成绩
async function createExam() {
  try {
    const response = await api.post('/exams', {
      exam_type_id: 1,
      exam_date: '2024-09-13',
      exam_name: '第1周周测',
      scores: {
        '语文': 95,
        '数学': 88,
        '英语': 92
      }
    });
    console.log('成绩已保存:', response.data);
  } catch (error) {
    console.error('错误:', error.response.data);
  }
}

// 获取趋势数据
async function getTrends() {
  try {
    const response = await api.get('/stats/trends', {
      params: { subject: '数学' }
    });
    console.log('趋势数据:', response.data);
  } catch (error) {
    console.error('错误:', error);
  }
}

createExam();
```

---

## 错误处理

### 常见错误响应

**400 - 请求参数错误**
```json
{
  "error": "Missing required field: exam_type_id"
}
```

**404 - 资源不存在**
```json
{
  "error": "Exam record not found"
}
```

**500 - 服务器错误**
```json
{
  "error": "Database error: ..."
}
```

---

## 性能建议

1. **批量操作**: 建议逐条创建成绩记录，不支持批量API
2. **缓存**: 前端已实现数据缓存，无需重复请求
3. **查询**: 大量数据查询时，建议按日期范围过滤

---

## 数据库字段限制

| 字段 | 类型 | 长度 | 说明 |
|------|------|------|------|
| exam_name | TEXT | 255 | 考试名称 |
| exam_date | TEXT | 10 | 日期(YYYY-MM-DD) |
| score | REAL | - | 支持小数，如99.5 |
| total_score | INTEGER | - | 总分 |

---

**API版本**: v1.0.0
**最后更新**: 2024-09-13
