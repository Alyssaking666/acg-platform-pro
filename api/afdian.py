"""
爱发电爬虫API - 获取创作者和作品信息
"""
from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
import re
from datetime import datetime

app = Flask(__name__)

@app.route('/api/afdian', methods=['GET'])
def search_afdian():
    """搜索爱发电创作者"""
    keyword = request.args.get('keyword', '')
    page = request.args.get('page', 1)
    
    if not keyword:
        return jsonify({'success': False, 'error': 'Keyword is required'}), 400
    
    try:
        # 爱发电搜索
        search_url = f'https://afdian.net/search?q={keyword}&page={page}'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://afdian.net/'
        }
        
        response = requests.get(search_url, headers=headers, timeout=20)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        creators = []
        
        # 解析创作者列表
        creator_elems = soup.select('.creator-item, .user-item, .result-item')
        
        for elem in creator_elems:
            try:
                creator = parse_creator_item(elem)
                if creator:
                    creators.append(creator)
            except Exception as e:
                print(f'Error parsing creator: {e}')
                continue
        
        # 如果没有找到，尝试备用解析
        if not creators:
            creators = parse_afdian_alternative(soup, keyword)
        
        return jsonify({
            'success': True,
            'keyword': keyword,
            'page': page,
            'count': len(creators),
            'creators': creators
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def parse_creator_item(elem):
    """解析单个创作者元素"""
    try:
        # 头像
        avatar_elem = elem.select_one('.avatar img, .user-avatar img')
        avatar = avatar_elem.get('src', '') if avatar_elem else ''
        
        # 名称
        name_elem = elem.select_one('.name, .user-name, h3 a, .title')
        if not name_elem:
            return None
        
        name = name_elem.text.strip()
        
        # 链接
        url_elem = elem.select_one('a')
        url = ''
        if url_elem:
            url = url_elem.get('href', '')
            if url and not url.startswith('http'):
                url = 'https://afdian.net' + url
        
        # 简介
        desc_elem = elem.select_one('.desc, .description, .bio')
        description = desc_elem.text.strip()[:150] if desc_elem else ''
        
        # 粉丝数
        fans = 0
        fans_elem = elem.select_one('.fans, .followers')
        if fans_elem:
            fans_text = fans_elem.text
            match = re.search(r'(\d+)', fans_text.replace(',', ''))
            if match:
                fans = int(match.group(1))
        
        # 作品数
        works_count = 0
        works_elem = elem.select_one('.works, .posts')
        if works_elem:
            works_text = works_elem.text
            match = re.search(r'(\d+)', works_text.replace(',', ''))
            if match:
                works_count = int(match.group(1))
        
        # 标签/分类
        tags = []
        tag_elems = elem.select('.tag, .category')
        for t in tag_elems:
            tags.append(t.text.strip())
        
        # 热度
        popularity = fans * 10 + works_count
        
        return {
            'name': name,
            'avatar': avatar,
            'url': url,
            'platform': 'afdian',
            'content_type': 'creator',
            'description': description,
            'fans': fans,
            'works_count': works_count,
            'popularity': popularity,
            'tags': tags if tags else ['创作者']
        }
        
    except Exception as e:
        print(f'Error in parse_creator_item: {e}')
        return None

def parse_afdian_alternative(soup, keyword):
    """备用解析方式"""
    results = []
    
    # 尝试其他选择器
    selectors = [
        '.search-result .item',
        '.creator-list .item',
        '.user-list .card'
    ]
    
    for selector in selectors:
        items = soup.select(selector)
        for item in items:
            try:
                name = item.get_text()[:30] if item else 'Unknown'
                link = item.find('a')
                url = link.get('href', '') if link else ''
                if url and not url.startswith('http'):
                    url = 'https://afdian.net' + url
                
                results.append({
                    'name': name,
                    'url': url,
                    'platform': 'afdian',
                    'content_type': 'creator',
                    'description': f'爱发电创作者: {name}',
                    'fans': 0,
                    'works_count': 0,
                    'popularity': 0,
                    'tags': ['创作者', keyword]
                })
            except:
                continue
        
        if results:
            break
    
    return results

@app.route('/api/afdian/creator/<creator_id>', methods=['GET'])
def get_creator_detail(creator_id):
    """获取创作者详情"""
    try:
        creator_url = f'https://afdian.net/a/{creator_id}'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
        
        response = requests.get(creator_url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 解析创作者信息
        name_elem = soup.select_one('.creator-name, .user-name, h1')
        name = name_elem.text.strip() if name_elem else creator_id
        
        # 简介
        desc_elem = soup.select_one('.creator-desc, .user-bio, .description')
        description = desc_elem.text.strip() if desc_elem else ''
        
        # 头像
        avatar_elem = soup.select_one('.creator-avatar img, .user-avatar img')
        avatar = avatar_elem.get('src', '') if avatar_elem else ''
        
        # 统计信息
        stats = {}
        stat_elems = soup.select('.stat-item, .stat')
        for stat in stat_elems:
            label = stat.select_one('.label, .name')
            value = stat.select_one('.value, .num')
            if label and value:
                stats[label.text.strip()] = value.text.strip()
        
        # 作品列表
        works = []
        work_elems = soup.select('.work-item, .post-item, .content-item')
        
        for work in work_elems[:10]:
            try:
                title_elem = work.select_one('.title, h3, h4')
                title = title_elem.text.strip() if title_elem else 'Untitled'
                
                link_elem = work.select_one('a')
                work_url = link_elem.get('href', '') if link_elem else ''
                if work_url and not work_url.startswith('http'):
                    work_url = 'https://afdian.net' + work_url
                
                # 价格
                price_elem = work.select_one('.price, .amount')
                price = price_elem.text.strip() if price_elem else ''
                
                # 摘要
                summary_elem = work.select_one('.summary, .desc')
                summary = summary_elem.text.strip()[:100] if summary_elem else ''
                
                works.append({
                    'title': title,
                    'url': work_url,
                    'price': price,
                    'summary': summary
                })
            except:
                continue
        
        return jsonify({
            'success': True,
            'creator_id': creator_id,
            'name': name,
            'avatar': avatar,
            'description': description,
            'stats': stats,
            'works_count': len(works),
            'works': works
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/afdian/explore', methods=['GET'])
def explore_creators():
    """探索热门创作者"""
    try:
        explore_url = 'https://afdian.net/explore'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
        
        response = requests.get(explore_url, headers=headers, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        creators = []
        creator_elems = soup.select('.creator-card, .hot-creator, .featured-user')
        
        for elem in creator_elems[:20]:
            try:
                creator = parse_creator_item(elem)
                if creator:
                    creators.append(creator)
            except:
                continue
        
        return jsonify({
            'success': True,
            'count': len(creators),
            'creators': creators
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Vercel handler
def handler(request):
    with app.request_context(request.environ):
        return app(request.environ, lambda status, headers: None)

if __name__ == '__main__':
    app.run(debug=True, port=5006)
