"""
Bilibili爬虫API - 获取B站视频、番剧等内容
"""
from flask import Flask, request, jsonify
import requests
from datetime import datetime

app = Flask(__name__)

# B站API基础URL
BILI_API_BASE = 'https://api.bilibili.com'
SEARCH_API = 'https://api.bilibili.com/x/web-interface/search/all'
VIDEO_API = 'https://api.bilibili.com/x/web-interface/view'

@app.route('/api/bilibili', methods=['GET'])
def search_bilibili():
    """搜索B站内容"""
    keyword = request.args.get('keyword', '')
    search_type = request.args.get('type', 'all')  # all, video, bangumi, article, live
    page = request.args.get('page', 1)
    order = request.args.get('order', 'totalrank')  # totalrank, click, pubdate, dm, stow
    
    if not keyword:
        return jsonify({'success': False, 'error': 'Keyword is required'}), 400
    
    try:
        results = []
        
        # 搜索视频
        if search_type in ['all', 'video']:
            videos = search_videos(keyword, page, order)
            results.extend(videos)
        
        # 搜索番剧
        if search_type in ['all', 'bangumi']:
            bangumis = search_bangumi(keyword, page)
            results.extend(bangumis)
        
        # 搜索专栏
        if search_type in ['all', 'article']:
            articles = search_articles(keyword, page)
            results.extend(articles)
        
        # 按热度排序
        results.sort(key=lambda x: x.get('popularity', 0), reverse=True)
        
        return jsonify({
            'success': True,
            'keyword': keyword,
            'type': search_type,
            'page': page,
            'count': len(results),
            'results': results
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def search_videos(keyword, page=1, order='totalrank'):
    """搜索视频"""
    try:
        url = f'{BILI_API_BASE}/x/web-interface/search/all'
        params = {
            'keyword': keyword,
            'page': page
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://search.bilibili.com/'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=15)
        data = response.json()
        
        videos = []
        if data.get('data', {}).get('result', []):
            for result in data['data']['result']:
                if result.get('result_type') == 'video':
                    for item in result.get('data', []):
                        try:
                            video = {
                                'title': item.get('title', '').replace('<em class="keyword">', '').replace('</em>', ''),
                                'bvid': item.get('bvid', ''),
                                'aid': item.get('aid', ''),
                                'url': f"https://www.bilibili.com/video/{item.get('bvid', '')}/?spm_id_from=333.337.search-card.all.click",
                                'description': item.get('description', ''),
                                'cover': item.get('pic', ''),
                                'author': item.get('author', ''),
                                'mid': item.get('mid', ''),
                                'platform': 'bilibili',
                                'content_type': 'video',
                                'duration': item.get('duration', ''),
                                'views': item.get('play', 0),
                                'danmaku': item.get('video_review', 0),
                                'likes': item.get('like', 0),
                                'favorites': item.get('favorites', 0),
                                'popularity': item.get('play', 0) + item.get('like', 0) * 2,
                                'published_at': datetime.fromtimestamp(item.get('pubdate', 0)).isoformat() if item.get('pubdate') else '',
                                'tags': item.get('tag', '').split(',') if item.get('tag') else []
                            }
                            videos.append(video)
                        except Exception as e:
                            print(f'Error parsing video: {e}')
                            continue
        
        return videos
    except Exception as e:
        print(f'Error searching videos: {e}')
        return []

def search_bangumi(keyword, page=1):
    """搜索番剧"""
    try:
        url = f'{BILI_API_BASE}/x/web-interface/search/type'
        params = {
            'keyword': keyword,
            'search_type': 'media_bangumi',
            'page': page
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://search.bilibili.com/'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=15)
        data = response.json()
        
        bangumis = []
        if data.get('data', {}).get('result', []):
            for item in data['data']['result']:
                try:
                    bangumi = {
                        'title': item.get('title', '').replace('<em class="keyword">', '').replace('</em>', ''),
                        'media_id': item.get('media_id', ''),
                        'season_id': item.get('season_id', ''),
                        'url': item.get('url', ''),
                        'cover': item.get('cover', ''),
                        'description': item.get('desc', ''),
                        'platform': 'bilibili',
                        'content_type': 'bangumi',
                        'areas': item.get('areas', []),
                        'styles': item.get('styles', []),
                        'score': item.get('score', 0),
                        'votes': item.get('vote', 0),
                        'popularity': item.get('score', 0) * 1000 + item.get('vote', 0),
                        'tags': ['番剧', '动画']
                    }
                    bangumis.append(bangumi)
                except Exception as e:
                    print(f'Error parsing bangumi: {e}')
                    continue
        
        return bangumis
    except Exception as e:
        print(f'Error searching bangumi: {e}')
        return []

def search_articles(keyword, page=1):
    """搜索专栏文章"""
    try:
        url = f'{BILI_API_BASE}/x/web-interface/search/type'
        params = {
            'keyword': keyword,
            'search_type': 'article',
            'page': page
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://search.bilibili.com/'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=15)
        data = response.json()
        
        articles = []
        if data.get('data', {}).get('result', []):
            for item in data['data']['result']:
                try:
                    article = {
                        'title': item.get('title', '').replace('<em class="keyword">', '').replace('</em>', ''),
                        'id': item.get('id', ''),
                        'url': f"https://www.bilibili.com/read/cv{item.get('id', '')}",
                        'summary': item.get('desc', ''),
                        'cover': item.get('image', ''),
                        'author': item.get('nickname', ''),
                        'mid': item.get('mid', ''),
                        'platform': 'bilibili',
                        'content_type': 'article',
                        'views': item.get('view', 0),
                        'likes': item.get('like', 0),
                        'replies': item.get('reply', 0),
                        'popularity': item.get('view', 0) + item.get('like', 0) * 2,
                        'published_at': datetime.fromtimestamp(item.get('pub_time', 0)).isoformat() if item.get('pub_time') else '',
                        'category': item.get('category_name', ''),
                        'tags': ['专栏', '文章']
                    }
                    articles.append(article)
                except Exception as e:
                    print(f'Error parsing article: {e}')
                    continue
        
        return articles
    except Exception as e:
        print(f'Error searching articles: {e}')
        return []

@app.route('/api/bilibili/video/<bvid>', methods=['GET'])
def get_video_detail(bvid):
    """获取视频详情"""
    try:
        url = f'{BILI_API_BASE}/x/web-interface/view'
        params = {'bvid': bvid}
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': f'https://www.bilibili.com/video/{bvid}'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=15)
        data = response.json()
        
        if data.get('code') == 0:
            video_data = data['data']
            
            result = {
                'success': True,
                'bvid': bvid,
                'title': video_data.get('title', ''),
                'description': video_data.get('desc', ''),
                'cover': video_data.get('pic', ''),
                'duration': video_data.get('duration', 0),
                'owner': {
                    'name': video_data.get('owner', {}).get('name', ''),
                    'mid': video_data.get('owner', {}).get('mid', '')
                },
                'stats': {
                    'views': video_data.get('stat', {}).get('view', 0),
                    'danmaku': video_data.get('stat', {}).get('danmaku', 0),
                    'likes': video_data.get('stat', {}).get('like', 0),
                    'coins': video_data.get('stat', {}).get('coin', 0),
                    'favorites': video_data.get('stat', {}).get('favorite', 0),
                    'shares': video_data.get('stat', {}).get('share', 0),
                    'replies': video_data.get('stat', {}).get('reply', 0)
                },
                'published_at': datetime.fromtimestamp(video_data.get('pubdate', 0)).isoformat() if video_data.get('pubdate') else '',
                'tags': [t.get('tag_name', '') for t in video_data.get('tags', [])]
            }
            
            return jsonify(result)
        else:
            return jsonify({
                'success': False,
                'error': data.get('message', 'Unknown error')
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/bilibili/hot', methods=['GET'])
def get_hot_videos():
    """获取热门视频"""
    try:
        url = f'{BILI_API_BASE}/x/web-interface/popular'
        params = {'ps': 50}
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.bilibili.com'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=15)
        data = response.json()
        
        if data.get('code') == 0:
            videos = []
            for item in data['data'].get('list', []):
                try:
                    video = {
                        'title': item.get('title', ''),
                        'bvid': item.get('bvid', ''),
                        'url': f"https://www.bilibili.com/video/{item.get('bvid', '')}",
                        'description': item.get('desc', ''),
                        'cover': item.get('pic', ''),
                        'owner': item.get('owner', {}).get('name', ''),
                        'views': item.get('stat', {}).get('view', 0),
                        'danmaku': item.get('stat', {}).get('danmaku', 0),
                        'likes': item.get('stat', {}).get('like', 0),
                        'popularity': item.get('stat', {}).get('view', 0)
                    }
                    videos.append(video)
                except Exception as e:
                    print(f'Error parsing hot video: {e}')
                    continue
            
            return jsonify({
                'success': True,
                'count': len(videos),
                'videos': videos
            })
        else:
            return jsonify({
                'success': False,
                'error': data.get('message', 'Unknown error')
            }), 400
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/bilibili/ranking', methods=['GET'])
def get_ranking():
    """获取排行榜"""
    try:
        rid = request.args.get('rid', 0)  # 分区ID
        day = request.args.get('day', 3)  # 3: 日榜, 7: 周榜, 30: 月榜
        
        url = f'{BILI_API_BASE}/x/web-interface/ranking'
        params = {
            'rid': rid,
            'day': day,
            'type': 1
        }
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=15)
        data = response.json()
        
        if data.get('code') == 0:
            videos = []
            for item in data['data'].get('list', []):
                try:
                    video = {
                        'rank': item.get('rank', 0),
                        'title': item.get('title', ''),
                        'bvid': item.get('bvid', ''),
                        'url': f"https://www.bilibili.com/video/{item.get('bvid', '')}",
                        'cover': item.get('pic', ''),
                        'owner': item.get('owner', {}).get('name', ''),
                        'points': item.get('pts', 0),
                        'views': item.get('stat', {}).get('view', 0)
                    }
                    videos.append(video)
                except Exception as e:
                    print(f'Error parsing ranking: {e}')
                    continue
            
            return jsonify({
                'success': True,
                'count': len(videos),
                'videos': videos
            })
        else:
            return jsonify({
                'success': False,
                'error': data.get('message', 'Unknown error')
            }), 400
            
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
    app.run(debug=True, port=5005)
