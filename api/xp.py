from flask import Flask, request, jsonify
import json
import os
import random

app = Flask(__name__)

# 文章数据文件
ARTICLES_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'articles.json')

# XP标签分类
XP_CATEGORIES = {
    'emotion': {
        'name': '情感基调',
        'tags': ['甜宠', '虐恋', '酸甜', '治愈', '温馨', '虐心', '救赎', '成长', '轻松', '沉重']
    },
    'ending': {
        'name': '结局类型',
        'tags': ['HE', 'BE', 'OE', '开放式结局', '圆满', '遗憾', '反转', '悬念']
    },
    'relationship': {
        'name': '人物关系',
        'tags': ['强强', '弱强', '年上', '年下', '养成', '破镜重圆', '先婚后爱', '暗恋', '双向奔赴', '追妻火葬场', '替身', '白月光']
    },
    'plot': {
        'name': '剧情元素',
        'tags': ['权谋', '宫斗', '宅斗', '商战', '悬疑', '推理', '冒险', '穿越', '重生', '系统', '快穿', '无限流']
    },
    'worldview': {
        'name': '世界观',
        'tags': ['现代', '古代', '民国', '星际', '末世', '玄幻', '仙侠', '武侠', '西幻', '东方幻想']
    },
    'special': {
        'name': '特殊设定',
        'tags': ['ABO', '哨向', '兽人', '人外', '机甲', '异能', '魔法', '修仙', '种田', '基建', '娱乐圈', '校园']
    }
}

def load_articles():
    """加载文章数据"""
    if os.path.exists(ARTICLES_FILE):
        with open(ARTICLES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def match_xp_tags(article, selected_tags, match_mode='any'):
    """匹配XP标签"""
    article_tags = article.get('xp_tags', [])
    
    if not selected_tags:
        return True
    
    if match_mode == 'all':
        # 必须包含所有选中的标签
        return all(tag in article_tags for tag in selected_tags)
    else:
        # 包含任意一个选中的标签
        return any(tag in article_tags for tag in selected_tags)

@app.route('/api/xp/categories', methods=['GET'])
def get_xp_categories():
    """获取XP标签分类"""
    return jsonify({
        'success': True,
        'data': XP_CATEGORIES
    })

@app.route('/api/xp/search', methods=['GET'])
def xp_search():
    """XP标签检索"""
    try:
        xp_tags = request.args.get('tags', '')
        match_mode = request.args.get('match_mode', 'any')  # 'any' 或 'all'
        platform = request.args.get('platform', 'all')
        content_type = request.args.get('type', 'all')
        sort_by = request.args.get('sort', 'popularity')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # 解析选中的标签
        selected_tags = [tag.strip() for tag in xp_tags.split(',') if xp_tags.strip()]
        
        # 加载文章
        articles = load_articles()
        
        # 筛选文章
        results = []
        for article in articles:
            # XP标签匹配
            if selected_tags and not match_xp_tags(article, selected_tags, match_mode):
                continue
            
            # 平台筛选
            if platform != 'all' and article.get('platform') != platform:
                continue
            
            # 类型筛选
            if content_type != 'all' and article.get('content_type') != content_type:
                continue
            
            results.append(article)
        
        # 排序
        if sort_by == 'popularity':
            results.sort(key=lambda x: x.get('heat', 0), reverse=True)
        elif sort_by == 'date':
            results.sort(key=lambda x: x.get('publish_date', ''), reverse=True)
        elif sort_by == 'title':
            results.sort(key=lambda x: x.get('title', ''))
        
        # 分页
        total = len(results)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_results = results[start_idx:end_idx]
        
        return jsonify({
            'success': True,
            'data': {
                'results': paginated_results,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page,
                'selected_tags': selected_tags,
                'match_mode': match_mode
            }
        })
    except Exception as e:
        print(f'XP检索失败: {e}')
        return jsonify({'success': False, 'message': f'检索失败: {str(e)}'}), 500

@app.route('/api/xp/hot', methods=['GET'])
def get_hot_xp_tags():
    """获取热门XP标签"""
    try:
        articles = load_articles()
        
        # 统计标签热度
        tag_count = {}
        for article in articles:
            for tag in article.get('xp_tags', []):
                tag_count[tag] = tag_count.get(tag, 0) + 1
        
        # 排序并返回前20个
        hot_tags = sorted(tag_count.items(), key=lambda x: x[1], reverse=True)[:20]
        
        return jsonify({
            'success': True,
            'data': {
                'hot_tags': [{'tag': tag, 'count': count} for tag, count in hot_tags]
            }
        })
    except Exception as e:
        print(f'获取热门标签失败: {e}')
        return jsonify({'success': False, 'message': f'获取失败: {str(e)}'}), 500

@app.route('/api/xp/recommend', methods=['GET'])
def get_xp_recommendations():
    """根据XP标签推荐文章"""
    try:
        article_id = request.args.get('article_id')
        limit = int(request.args.get('limit', 5))
        
        if not article_id:
            return jsonify({'success': False, 'message': '文章ID不能为空'}), 400
        
        articles = load_articles()
        
        # 找到目标文章
        target_article = None
        for article in articles:
            if str(article.get('id')) == str(article_id):
                target_article = article
                break
        
        if not target_article:
            return jsonify({'success': False, 'message': '文章不存在'}), 404
        
        target_tags = set(target_article.get('xp_tags', []))
        
        # 计算相似度
        similarities = []
        for article in articles:
            if str(article.get('id')) == str(article_id):
                continue
            
            article_tags = set(article.get('xp_tags', []))
            if not article_tags:
                continue
            
            # Jaccard相似度
            intersection = len(target_tags & article_tags)
            union = len(target_tags | article_tags)
            similarity = intersection / union if union > 0 else 0
            
            if similarity > 0:
                similarities.append((article, similarity))
        
        # 排序并返回最相似的
        similarities.sort(key=lambda x: x[1], reverse=True)
        recommendations = [item[0] for item in similarities[:limit]]
        
        return jsonify({
            'success': True,
            'data': {
                'recommendations': recommendations,
                'based_on': target_article.get('title'),
                'common_tags': list(target_tags)
            }
        })
    except Exception as e:
        print(f'推荐失败: {e}')
        return jsonify({'success': False, 'message': f'推荐失败: {str(e)}'}), 500

# Vercel serverless handler
from http.server import BaseHTTPRequestHandler

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = json.dumps({'status': 'XP API is running'})
        self.wfile.write(response.encode())
    
    def do_POST(self):
        self.do_GET()

if __name__ == '__main__':
    app.run(debug=True, port=5003)
