# ACG兴趣聚合平台

一个可部署到Vercel的ACG兴趣聚合平台，聚合AO3、Lofter、微博、B站等平台内容，支持AI文案生成，为同人创作者提供一站式内容发现与创作工具。

![ACG聚合平台](https://img.shields.io/badge/ACG-%E8%81%9A%E5%90%88%E5%B9%B3%E5%8F%B0-blueviolet)
![Vercel](https://img.shields.io/badge/Vercel-Ready-black)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![Flask](https://img.shields.io/badge/Flask-2.3.3-green)

## ✨ 功能特性

### 🔍 聚合搜索
- **多平台聚合**：支持AO3、Lofter、微博、B站、爱发电等平台
- **智能搜索**：本地数据库 + 实时爬虫，获取最新内容
- **热门IP推荐**：内置150+热门IP数据，快速发现好内容

### ✨ AI文案生成
- **多种文案类型**：应援文案、生日祝福、宣传推广、周年纪念
- **多种风格**：甜美、酷炫、优雅三种风格可选
- **一键复制**：生成文案一键复制，直接用于设计

### 🎨 物料制作
- **设计平台跳转**：一键跳转到Canva、稿定设计
- **多种物料类型**：小卡、海报、手幅、票根
- **风格模板**：简约、梦幻、古风、赛博朋克

### 🎭 热门IP覆盖
- **188男团系列**：谁把谁当真、针锋对决等
- **墨香三部曲**：魔道祖师、天官赐福
- **热门原耽**：某某、二哈和他的白猫师尊、撒野、破云等
- **真人CP**：博君一肖等

## 🚀 快速部署

### 一键部署到Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/acg-platform-pro)

### 手动部署

1. **克隆项目**
```bash
git clone https://github.com/yourusername/acg-platform-pro.git
cd acg-platform-pro
```

2. **安装Vercel CLI**
```bash
npm i -g vercel
```

3. **部署**
```bash
vercel --prod
```

## 📁 项目结构

```
acg-platform-pro/
├── api/                          # Vercel Serverless Functions
│   ├── search.py                 # 聚合搜索API
│   ├── ai-copy.py                # AI文案生成API
│   ├── ao3.py                    # AO3爬虫
│   ├── lofter.py                 # Lofter爬虫
│   ├── weibo.py                  # 微博爬虫
│   ├── bilibili.py               # B站爬虫
│   └── afdian.py                 # 爱发电爬虫
├── frontend/                     # 前端代码
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── data/                         # 文章数据库
│   └── articles.json             # 150+经典同人文数据
├── vercel.json                   # Vercel配置
├── requirements.txt              # Python依赖
└── README.md                     # 项目文档
```

## 📡 API文档

### 搜索API

```http
GET /api/search?keyword={keyword}&platform={platform}&type={type}
```

**参数：**
- `keyword` (required): 搜索关键词
- `platform` (optional): 平台筛选 (all|ao3|lofter|weibo|bilibili|afdian)
- `type` (optional): 内容类型 (all|article|video|image)

**响应示例：**
```json
{
  "success": true,
  "keyword": "魔道祖师",
  "total": 30,
  "results": [
    {
      "id": 51,
      "title": "魔道祖师经典同人文",
      "ip": "魔道祖师",
      "author": "经典文整理",
      "platform": "lofter",
      "content_type": "article",
      "content_url": "https://lofter.com/51",
      "summary": "魏无羡和蓝忘机的经典故事...",
      "popularity": 120000,
      "tags": ["忘羡", "古风", "修仙"]
    }
  ]
}
```

### AI文案生成API

```http
POST /api/ai-copy
Content-Type: application/json

{
  "type": "support",
  "keyword": "王一博",
  "userInput": "祝王一博生日快乐",
  "style": "sweet",
  "count": 3
}
```

**响应示例：**
```json
{
  "success": true,
  "optimized": "祝王一博生日快乐！愿你被世界温柔以待，星光永远为你闪耀✨",
  "alternatives": [
    "王一博，新的一岁继续做最耀眼的存在，我们永远支持你💫",
    "生日快乐！愿王一博的每一天都充满阳光和笑容🎂"
  ],
  "type": "support",
  "style": "sweet",
  "keyword": "王一博"
}
```

### 各平台API

#### AO3
```http
GET /api/ao3?keyword={keyword}&sort={sort}&page={page}
```

#### Lofter
```http
GET /api/lofter?keyword={keyword}&type={type}&page={page}
```

#### 微博
```http
GET /api/weibo?keyword={keyword}&type={type}&page={page}
GET /api/weibo/hot
```

#### B站
```http
GET /api/bilibili?keyword={keyword}&type={type}&page={page}
GET /api/bilibili/hot
GET /api/bilibili/ranking
```

#### 爱发电
```http
GET /api/afdian?keyword={keyword}&page={page}
GET /api/afdian/explore
```

## 🛠️ 本地开发

### 环境要求
- Python 3.9+
- Node.js 16+ (用于Vercel CLI)

### 安装依赖

```bash
# 安装Python依赖
pip install -r requirements.txt
```

### 运行开发服务器

```bash
# 使用Flask开发服务器
python api/search.py

# 或使用Vercel本地开发
vercel dev
```

### 访问
- 前端页面: http://localhost:3000
- API接口: http://localhost:3000/api/search

## 📝 数据来源

### 本地数据库 (data/articles.json)
包含150+条精选文章数据，覆盖以下IP：

| IP | 数量 | 类型 |
|-----|------|------|
| 谁把谁当真 | 30+ | 同人文、合集、番外 |
| 针锋对决 | 30+ | 同人文、合集、番外 |
| 魔道祖师 | 30+ | 同人文、合集、番外 |
| 博君一肖 | 30+ | 同人文、视频、图文 |
| 天官赐福 | 20+ | 同人文、合集 |
| 某某 | 20+ | 同人文、合集 |
| 二哈和他的白猫师尊 | 20+ | 同人文、合集 |
| 其他热门IP | 各10-15条 | 撒野、破云、默读、杀破狼等 |

### 实时爬虫
- **AO3**: 爬取Archive of Our Own的同人文作品
- **Lofter**: 获取Lofter平台的同人文和图文
- **微博**: 获取微博热搜和相关内容
- **B站**: 获取B站视频、专栏内容
- **爱发电**: 获取创作者信息

## 🎨 界面预览

### 首页
- 动态Typewriter效果
- 热门IP快速入口
- 统计数据动画

### 搜索页
- 多平台聚合搜索
- 热门搜索标签
- 结果卡片展示

### 物料制作
- AI文案生成弹窗
- 设计平台一键跳转
- 多种风格模板

## ⚙️ 配置说明

### 环境变量
在Vercel控制台或 `.env` 文件中设置：

```env
# 可选：设置爬虫超时时间
REQUEST_TIMEOUT=15

# 可选：设置用户代理
USER_AGENT=Mozilla/5.0...
```

### 自定义配置

修改 `vercel.json` 可调整：
- API路由规则
- 缓存策略
- CORS设置

## 🐛 常见问题

### Q: 爬虫无法获取数据？
A: 部分平台（如微博）可能需要登录或特殊处理。项目已内置本地数据库作为备选方案。

### Q: 如何添加新的IP数据？
A: 编辑 `data/articles.json` 文件，按照现有格式添加新的文章数据。

### Q: 如何修改文案模板？
A: 编辑 `api/ai-copy.py` 中的 `COPY_TEMPLATES` 字典。

### Q: 部署后页面空白？
A: 检查 `vercel.json` 中的路由配置是否正确，确保前端资源路径正确。

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 开源协议

本项目采用 [MIT](LICENSE) 协议开源。

## 🙏 致谢

- [Flask](https://flask.palletsprojects.com/) - Web框架
- [BeautifulSoup](https://www.crummy.com/software/BeautifulSoup/) - HTML解析
- [Vercel](https://vercel.com/) - 部署平台
- [Canva](https://www.canva.com/) - 设计平台
- [稿定设计](https://www.gaoding.com/) - 设计平台

## 📮 联系方式

如有问题或建议，欢迎通过以下方式联系：

- 提交 [Issue](https://github.com/yourusername/acg-platform-pro/issues)
- 发送邮件至: your-email@example.com

---

<p align="center">Made with 💜 for ACG lovers</p>
