from flask import Flask, request, jsonify
import json
import hashlib
import time
import os
from datetime import datetime, timedelta

app = Flask(__name__)

# 用户数据存储
USERS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'users.json')
JWT_SECRET = 'acg-platform-secret-key-2024'
TOKEN_EXPIRE_HOURS = 24

def load_users():
    """加载用户数据"""
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_users(users):
    """保存用户数据"""
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)

def hash_password(password):
    """密码加密"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_jwt(user_id, username):
    """生成JWT token"""
    import base64
    import hmac
    
    header = json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(',', ':'))
    
    expire_time = int((datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)).timestamp())
    payload = json.dumps({
        "user_id": user_id,
        "username": username,
        "exp": expire_time,
        "iat": int(datetime.utcnow().timestamp())
    }, separators=(',', ':'))
    
    header_b64 = base64.urlsafe_b64encode(header.encode()).decode().rstrip('=')
    payload_b64 = base64.urlsafe_b64encode(payload.encode()).decode().rstrip('=')
    
    signature = hmac.new(
        JWT_SECRET.encode(),
        f"{header_b64}.{payload_b64}".encode(),
        hashlib.sha256
    ).digest()
    signature_b64 = base64.urlsafe_b64encode(signature).decode().rstrip('=')
    
    return f"{header_b64}.{payload_b64}.{signature_b64}"

def verify_jwt(token):
    """验证JWT token"""
    try:
        import base64
        import hmac
        
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature_b64 = parts
        
        # 验证签名
        expected_signature = hmac.new(
            JWT_SECRET.encode(),
            f"{header_b64}.{payload_b64}".encode(),
            hashlib.sha256
        ).digest()
        expected_signature_b64 = base64.urlsafe_b64encode(expected_signature).decode().rstrip('=')
        
        if signature_b64 != expected_signature_b64:
            return None
        
        # 解码payload
        payload_json = base64.urlsafe_b64decode(payload_b64 + '==').decode()
        payload = json.loads(payload_json)
        
        # 检查过期时间
        if payload.get('exp', 0) < int(datetime.utcnow().timestamp()):
            return None
        
        return payload
    except Exception as e:
        print(f'JWT验证失败: {e}')
        return None

@app.route('/api/user/register', methods=['POST'])
def register():
    """用户注册"""
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        email = data.get('email', '').strip()
        
        if not username or not password:
            return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
        
        if len(username) < 3 or len(username) > 20:
            return jsonify({'success': False, 'message': '用户名长度需在3-20个字符之间'}), 400
        
        if len(password) < 6:
            return jsonify({'success': False, 'message': '密码长度至少6个字符'}), 400
        
        users = load_users()
        
        # 检查用户名是否已存在
        for user in users.values():
            if user['username'] == username:
                return jsonify({'success': False, 'message': '用户名已存在'}), 400
            if email and user.get('email') == email:
                return jsonify({'success': False, 'message': '邮箱已被注册'}), 400
        
        # 创建新用户
        user_id = f"user_{int(time.time() * 1000)}"
        users[user_id] = {
            'id': user_id,
            'username': username,
            'password': hash_password(password),
            'email': email,
            'created_at': datetime.utcnow().isoformat(),
            'interests': [],
            'favorites': []
        }
        
        save_users(users)
        
        # 生成token
        token = generate_jwt(user_id, username)
        
        return jsonify({
            'success': True,
            'message': '注册成功',
            'data': {
                'user_id': user_id,
                'username': username,
                'token': token
            }
        })
    except Exception as e:
        print(f'注册失败: {e}')
        return jsonify({'success': False, 'message': f'注册失败: {str(e)}'}), 500

@app.route('/api/user/login', methods=['POST'])
def login():
    """用户登录"""
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
        if not username or not password:
            return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400
        
        users = load_users()
        
        # 查找用户
        user = None
        for u in users.values():
            if u['username'] == username:
                user = u
                break
        
        if not user:
            return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
        
        # 验证密码
        if user['password'] != hash_password(password):
            return jsonify({'success': False, 'message': '用户名或密码错误'}), 401
        
        # 生成token
        token = generate_jwt(user['id'], user['username'])
        
        return jsonify({
            'success': True,
            'message': '登录成功',
            'data': {
                'user_id': user['id'],
                'username': user['username'],
                'email': user.get('email', ''),
                'interests': user.get('interests', []),
                'token': token
            }
        })
    except Exception as e:
        print(f'登录失败: {e}')
        return jsonify({'success': False, 'message': f'登录失败: {str(e)}'}), 500

@app.route('/api/user/profile', methods=['GET'])
def get_profile():
    """获取用户信息"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': '未提供有效的认证信息'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_jwt(token)
        
        if not payload:
            return jsonify({'success': False, 'message': '登录已过期，请重新登录'}), 401
        
        user_id = payload.get('user_id')
        users = load_users()
        user = users.get(user_id)
        
        if not user:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        return jsonify({
            'success': True,
            'data': {
                'user_id': user['id'],
                'username': user['username'],
                'email': user.get('email', ''),
                'interests': user.get('interests', []),
                'favorites': user.get('favorites', []),
                'created_at': user.get('created_at', '')
            }
        })
    except Exception as e:
        print(f'获取用户信息失败: {e}')
        return jsonify({'success': False, 'message': f'获取用户信息失败: {str(e)}'}), 500

@app.route('/api/user/interests', methods=['POST'])
def update_interests():
    """更新用户兴趣"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': '未提供有效的认证信息'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_jwt(token)
        
        if not payload:
            return jsonify({'success': False, 'message': '登录已过期，请重新登录'}), 401
        
        user_id = payload.get('user_id')
        data = request.json
        interests = data.get('interests', [])
        
        users = load_users()
        if user_id not in users:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        users[user_id]['interests'] = interests
        save_users(users)
        
        return jsonify({
            'success': True,
            'message': '兴趣更新成功',
            'data': {'interests': interests}
        })
    except Exception as e:
        print(f'更新兴趣失败: {e}')
        return jsonify({'success': False, 'message': f'更新兴趣失败: {str(e)}'}), 500

@app.route('/api/user/favorites', methods=['GET', 'POST', 'DELETE'])
def manage_favorites():
    """管理用户收藏"""
    try:
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'message': '未提供有效的认证信息'}), 401
        
        token = auth_header.split(' ')[1]
        payload = verify_jwt(token)
        
        if not payload:
            return jsonify({'success': False, 'message': '登录已过期，请重新登录'}), 401
        
        user_id = payload.get('user_id')
        users = load_users()
        
        if user_id not in users:
            return jsonify({'success': False, 'message': '用户不存在'}), 404
        
        if request.method == 'GET':
            # 获取收藏列表
            return jsonify({
                'success': True,
                'data': {'favorites': users[user_id].get('favorites', [])}
            })
        
        elif request.method == 'POST':
            # 添加收藏
            data = request.json
            article_id = data.get('article_id')
            
            if not article_id:
                return jsonify({'success': False, 'message': '文章ID不能为空'}), 400
            
            favorites = users[user_id].get('favorites', [])
            if article_id not in favorites:
                favorites.append(article_id)
                users[user_id]['favorites'] = favorites
                save_users(users)
            
            return jsonify({
                'success': True,
                'message': '收藏成功',
                'data': {'favorites': favorites}
            })
        
        elif request.method == 'DELETE':
            # 取消收藏
            data = request.json
            article_id = data.get('article_id')
            
            favorites = users[user_id].get('favorites', [])
            if article_id in favorites:
                favorites.remove(article_id)
                users[user_id]['favorites'] = favorites
                save_users(users)
            
            return jsonify({
                'success': True,
                'message': '取消收藏成功',
                'data': {'favorites': favorites}
            })
    except Exception as e:
        print(f'收藏操作失败: {e}')
        return jsonify({'success': False, 'message': f'操作失败: {str(e)}'}), 500

# Vercel serverless handler
from http.server import BaseHTTPRequestHandler
from io import BytesIO

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        response = json.dumps({'status': 'User API is running'})
        self.wfile.write(response.encode())
    
    def do_POST(self):
        self.do_GET()

if __name__ == '__main__':
    app.run(debug=True, port=5002)
