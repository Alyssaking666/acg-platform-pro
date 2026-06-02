"""
AI文案生成API - Vercel Serverless Function
支持生成应援文案、生日祝福、宣传语等
"""
from flask import Flask, request, jsonify
import random
import json

app = Flask(__name__)

# 文案模板库
COPY_TEMPLATES = {
    'birthday': {
        'sweet': [
            '祝{keyword}生日快乐！愿你被世界温柔以待，星光永远为你闪耀✨',
            '{keyword}，新的一岁继续做最耀眼的存在，我们永远支持你💫',
            '生日快乐！愿{keyword}的每一天都充满阳光和笑容🎂',
            '亲爱的{keyword}，愿你永远保持热爱，奔赴山海🌊',
            '祝{keyword}生日快乐！愿所有美好都如约而至💝',
            '{keyword}，愿你前程似锦，未来可期🌟',
            '生日快乐！{keyword}永远是我们心中的光✨',
            '愿{keyword}在新的一岁里，收获更多的爱与快乐🎉',
            '{keyword}，愿你被温柔包围，被幸福环绕💕',
            '祝{keyword}生日快乐！愿你永远年轻，永远热泪盈眶🎂'
        ],
        'cool': [
            '{keyword}生日快乐！继续做最酷的自己，不被定义🔥',
            '祝{keyword}生日快乐！自由、热烈、永远做自己💪',
            '{keyword}，新的一岁继续酷下去，打破所有界限⚡',
            '生日快乐！{keyword}就是要与众不同🚀',
            '{keyword}，愿你永远自由如风，无畏前行🔥',
            '祝{keyword}生日快乐！做自己世界的王👑',
            '{keyword}，继续用你的方式改变世界💥',
            '生日快乐！{keyword}永远是最独特的存在⚡',
            '{keyword}，愿你永远热血，永远少年🔥',
            '祝{keyword}生日快乐！打破常规，创造传奇💪'
        ],
        'elegant': [
            '祝{keyword}生辰快乐，愿岁月温柔以待，时光不负🌸',
            '{keyword}，愿你在新的一岁里，优雅从容，淡定自若🎋',
            '生辰之际，祝{keyword}前程似锦，岁月静好🌙',
            '愿{keyword}如星辰般璀璨，如月光般温柔✨',
            '祝{keyword}生辰快乐，愿你所求皆如愿，所行皆坦途🌹'
        ]
    },
    'support': {
        'sweet': [
            '永远支持{keyword}！你的每一步都有我们陪伴❤️',
            '{keyword}加油！我们永远是你最坚强的后盾！',
            '无论风雨，我们都会陪伴{keyword}走下去💕',
            '{keyword}，你的努力我们都看在眼里，继续加油！',
            '支持{keyword}！你的光芒值得被所有人看见✨',
            '我们会一直陪着{keyword}，见证你的每一个精彩瞬间💫',
            '{keyword}，放心追梦，我们永远在你身后🌟',
            '支持{keyword}！你的未来一定会更加精彩💖',
            '无论发生什么，我们都会坚定地支持{keyword}❤️',
            '{keyword}，你的坚持让我们感动，继续发光吧！'
        ],
        'cool': [
            '{keyword}冲鸭！用实力证明一切！',
            '支持{keyword}！做最好的自己！',
            '{keyword}，用你的实力让所有人闭嘴🔥',
            '冲啊{keyword}！打破质疑，创造辉煌💪',
            '支持{keyword}！强者不需要解释⚡',
            '{keyword}，用作品说话，让实力证明一切💥',
            '力挺{keyword}！你的努力终将被看见🔥',
            '{keyword}，继续用你的方式征服世界💪',
            '支持{keyword}！无畏前行，所向披靡⚡',
            '{keyword}，让所有人看到你的光芒💫'
        ],
        'elegant': [
            '愿与{keyword}同行，共赏这一路风景🌸',
            '支持{keyword}，愿你的每一步都走得坚定从容🎋',
            '愿{keyword}的才华被世界看见，愿你的努力不被辜负🌙',
            '与{keyword}同行，是我们最大的幸运✨',
            '愿{keyword}在追梦的路上，永远有我们相伴🌹'
        ]
    },
    'promotion': {
        'sweet': [
            '快来支持{keyword}！绝对不会让你失望✨',
            '{keyword}值得所有人的喜爱！一起来支持吧💕',
            '发现宝藏{keyword}！快来一起入坑吧🌟',
            '{keyword}真的太棒了！推荐给大家💖',
            '不允许还有人不知道{keyword}！快来了解✨'
        ],
        'cool': [
            '{keyword}，值得所有人的关注🔥',
            '不吹不黑，{keyword}是真的强💪',
            '{keyword}，入股不亏，快来了解⚡',
            '实力说话，{keyword}绝对值得💥',
            '{keyword}，让所有人见证你的实力🔥'
        ]
    },
    'anniversary': {
        'sweet': [
            '祝{keyword}周年快乐！感谢一路有你✨',
            '{keyword}周年快乐！未来我们继续一起走💕',
            '庆祝{keyword}周年！感恩相遇，珍惜陪伴🌟',
            '{keyword}，周年快乐！愿未来更加精彩💖',
            '祝{keyword}周年快乐！我们的故事还在继续✨'
        ],
        'cool': [
            '{keyword}周年快乐！继续创造传奇🔥',
            '庆祝{keyword}周年！这只是开始💪',
            '{keyword}，周年快乐！未来无可限量⚡',
            '{keyword}周年，一起走向更高的巅峰💥',
            '祝{keyword}周年快乐！传奇仍在继续🔥'
        ]
    }
}

# 优化词库
OPTIMIZATION_PATTERNS = [
    '{text} —— 献给最爱的{keyword}',
    '致{keyword}：{text}',
    '{text} ✨ {keyword}值得最好的',
    '{keyword}，{text}',
    '{text} 💫 永远支持{keyword}',
    '献给{keyword}：{text}',
    '{text} ❤️ 只为{keyword}',
    '{keyword}专属：{text}'
]

@app.route('/api/ai-copy', methods=['POST', 'GET'])
def generate_copy():
    """生成AI文案"""
    try:
        if request.method == 'POST':
            data = request.json or {}
        else:
            data = request.args.to_dict()
        
        design_type = data.get('type', 'support')
        keyword = data.get('keyword', '')
        user_input = data.get('userInput', '')
        style = data.get('style', 'sweet')
        count = int(data.get('count', 3))
        
        if not keyword:
            return jsonify({
                'success': False,
                'error': 'Keyword is required'
            }), 400
        
        # 基于用户输入优化
        if user_input:
            optimized = optimize_copy(user_input, keyword, style)
            alternatives = generate_alternatives(keyword, design_type, style, count)
            
            return jsonify({
                'success': True,
                'original': user_input,
                'optimized': optimized,
                'alternatives': alternatives,
                'type': design_type,
                'style': style,
                'keyword': keyword
            })
        else:
            # 生成全新文案
            templates = COPY_TEMPLATES.get(design_type, {}).get(style, [])
            if not templates:
                # 如果没有找到对应模板，使用support的sweet作为默认
                templates = COPY_TEMPLATES.get('support', {}).get('sweet', [])
            
            if templates:
                # 随机打乱模板顺序
                shuffled = random.sample(templates, min(len(templates), count + 1))
                main_copy = shuffled[0].format(keyword=keyword)
                alternatives = [t.format(keyword=keyword) for t in shuffled[1:count+1]]
                
                return jsonify({
                    'success': True,
                    'main': main_copy,
                    'alternatives': alternatives,
                    'type': design_type,
                    'style': style,
                    'keyword': keyword
                })
        
        return jsonify({
            'success': False,
            'error': 'No templates found'
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def optimize_copy(user_text, keyword, style):
    """AI优化用户输入的文案"""
    # 根据风格选择不同的优化模式
    if style == 'sweet':
        patterns = [
            '{text} —— 献给最爱的{keyword}',
            '致{keyword}：{text}',
            '{text} ✨ {keyword}值得最好的',
            '{keyword}，{text}',
            '{text} 💫 永远支持{keyword}'
        ]
    elif style == 'cool':
        patterns = [
            '{keyword}，{text} 🔥',
            '{text} —— {keyword}专属',
            '{keyword}：{text} 💪',
            '{text} ⚡ {keyword}',
            '{keyword}，{text}，就这么简单'
        ]
    else:  # elegant
        patterns = [
            '致{keyword}：{text}',
            '{text} —— 与{keyword}共勉',
            '愿{keyword}：{text}',
            '{text} 🌸 {keyword}',
            '{keyword}，{text}，岁月静好'
        ]
    
    pattern = random.choice(patterns)
    return pattern.format(text=user_text, keyword=keyword)

def generate_alternatives(keyword, design_type, style, count):
    """生成多个备选文案"""
    templates = COPY_TEMPLATES.get(design_type, {}).get(style, [])
    if not templates:
        templates = COPY_TEMPLATES.get('support', {}).get('sweet', [])
    
    # 随机选择不重复的模板
    selected = random.sample(templates, min(len(templates), count))
    return [t.format(keyword=keyword) for t in selected]

@app.route('/api/ai-copy/templates', methods=['GET'])
def get_templates():
    """获取所有可用的文案模板类型"""
    return jsonify({
        'success': True,
        'types': list(COPY_TEMPLATES.keys()),
        'styles': ['sweet', 'cool', 'elegant'],
        'templates': {
            k: {s: len(v) for s, v in COPY_TEMPLATES[k].items()}
            for k in COPY_TEMPLATES.keys()
        }
    })

# Vercel Serverless Function handler
def handler(request):
    """Vercel serverless function handler"""
    with app.request_context(request.environ):
        return app(request.environ, lambda status, headers: None)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
