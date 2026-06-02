/**
 * ACG兴趣聚合平台 - 主JavaScript文件
 * 包含搜索、AI文案生成、UI交互等功能
 */

// ========================================
// 全局状态
// ========================================
const state = {
    currentKeyword: '',
    currentPlatform: 'all',
    currentType: 'all',
    searchResults: [],
    currentDesignType: 'photocard',
    currentStyle: 'sweet',
    isLoading: false,
    // 用户相关状态
    user: null,
    token: localStorage.getItem('token') || null,
    // XP检索状态
    selectedXpTags: [],
    xpCategories: null
};

// ========================================
// 热门IP数据
// ========================================
const hotIPs = [
    { name: '谁把谁当真', icon: '💕', count: '30+' },
    { name: '针锋对决', icon: '⚔️', count: '30+' },
    { name: '魔道祖师', icon: '🏔️', count: '30+' },
    { name: '博君一肖', icon: '✨', count: '30+' },
    { name: '天官赐福', icon: '🌸', count: '20+' },
    { name: '某某', icon: '📚', count: '20+' },
    { name: '二哈和他的白猫师尊', icon: '🐕', count: '20+' },
    { name: '撒野', icon: '🏃', count: '15+' },
    { name: '破云', icon: '☁️', count: '15+' },
    { name: '默读', icon: '📖', count: '15+' },
    { name: '杀破狼', icon: '🐺', count: '15+' },
    { name: '镇魂', icon: '🔥', count: '10+' }
];

// Typewriter文字
const typewriterTexts = ['热爱', 'CP', '故事', '创作'];

// ========================================
// 初始化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initTypewriter();
    renderHotIPs();
    initEventListeners();
    initTheme();
    animateStats();
    initUser();
    initXpSection();
});

// ========================================
// Typewriter效果
// ========================================
function initTypewriter() {
    const element = document.getElementById('typewriter');
    if (!element) return;
    
    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    function type() {
        const currentText = typewriterTexts[textIndex];
        
        if (isDeleting) {
            element.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
        } else {
            element.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
        }
        
        let typeSpeed = isDeleting ? 100 : 200;
        
        if (!isDeleting && charIndex === currentText.length) {
            typeSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % typewriterTexts.length;
            typeSpeed = 500;
        }
        
        setTimeout(type, typeSpeed);
    }
    
    type();
}

// ========================================
// 渲染热门IP
// ========================================
function renderHotIPs() {
    const grid = document.getElementById('ipGrid');
    if (!grid) return;
    
    grid.innerHTML = hotIPs.map(ip => `
        <div class="ip-card" onclick="searchByKeyword('${ip.name}')">
            <div class="ip-icon">${ip.icon}</div>
            <div class="ip-name">${ip.name}</div>
            <div class="ip-count">${ip.count} 篇文章</div>
        </div>
    `).join('');
}

// ========================================
// 事件监听
// ========================================
function initEventListeners() {
    // 搜索相关
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const platformFilter = document.getElementById('platformFilter');
    const typeFilter = document.getElementById('typeFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (platformFilter) {
        platformFilter.addEventListener('change', (e) => {
            state.currentPlatform = e.target.value;
            performSearch();
        });
    }
    
    if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
            state.currentType = e.target.value;
            performSearch();
        });
    }
    
    if (sortSelect) {
        sortSelect.addEventListener('change', performSearch);
    }
    
    // 热门标签点击
    document.querySelectorAll('.hot-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            const keyword = tag.dataset.keyword;
            if (searchInput) searchInput.value = keyword;
            performSearch();
        });
    });
    
    // 主题切换
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // 文案风格选择
    document.querySelectorAll('.style-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentStyle = btn.dataset.style;
        });
    });
    
    // 登录/注册表单
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
}

// ========================================
// 搜索功能
// ========================================
function searchByKeyword(keyword) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = keyword;
    }
    performSearch();
    
    // 滚动到搜索区域
    document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' });
}

async function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const keyword = searchInput?.value.trim() || '';
    
    if (!keyword) {
        showToast('请输入搜索关键词');
        return;
    }
    
    state.currentKeyword = keyword;
    showLoading(true);
    
    try {
        const platform = document.getElementById('platformFilter')?.value || 'all';
        const type = document.getElementById('typeFilter')?.value || 'all';
        const sort = document.getElementById('sortSelect')?.value || 'popularity';
        
        const params = new URLSearchParams({
            keyword: keyword,
            platform: platform,
            type: type,
            sort: sort
        });
        
        const response = await fetch(`/api/search?${params}`);
        const data = await response.json();
        
        if (data.success) {
            displayResults(data.data.results);
            updateResultsCount(data.data.total);
        } else {
            showToast(data.message || '搜索失败');
        }
    } catch (error) {
        console.error('搜索失败:', error);
        showToast('搜索失败，请稍后重试');
    } finally {
        showLoading(false);
    }
}

function displayResults(results) {
    const grid = document.getElementById('resultsGrid');
    if (!grid) return;
    
    if (results.length === 0) {
        grid.innerHTML = `
            <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
                <h3>没有找到相关结果</h3>
                <p style="color: var(--text-secondary);">试试其他关键词吧</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = results.map(item => `
        <div class="result-card" onclick="openContent('${item.content_url || '#'}')">
            <div class="result-header">
                <span class="result-platform">${getPlatformIcon(item.platform)} ${item.platform}</span>
                <span class="result-heat">🔥 ${item.heat || '1.2k'}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <div class="result-meta">
                <span>👤 ${escapeHtml(item.author)}</span>
                <span>📅 ${item.publish_date || '2024'}</span>
            </div>
            <p class="result-summary">${escapeHtml(item.summary || '')}</p>
            <div class="result-tags">
                ${(item.tags || []).map(tag => `<span class="result-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        </div>
    `).join('');
}

function updateResultsCount(count) {
    const countElement = document.getElementById('resultsCount');
    if (countElement) {
        countElement.textContent = `找到 ${count} 条结果`;
    }
}

// ========================================
// AI文案生成
// ========================================
function optimizeWithAI() {
    const keywordInput = document.getElementById('keywordInput');
    const userCopyInput = document.getElementById('userCopyInput');
    const copyType = document.getElementById('copyType')?.value || 'support';
    
    const keyword = keywordInput?.value.trim() || 'TA';
    const userInput = userCopyInput?.value.trim() || '';
    
    // 文案模板
    const templates = {
        support: {
            sweet: [
                `永远支持${keyword}！你的每一步都有我们陪伴❤️`,
                `${keyword}加油！我们永远是你最坚强的后盾！`,
                `为${keyword}打call！你的光芒照亮了我们的世界✨`
            ],
            cool: [
                `${keyword}，继续做最酷的自己，不被定义🔥`,
                `支持${keyword}，因为你是独一无二的存在`,
                `${keyword}的未来，我们一起见证`
            ],
            elegant: [
                `愿${keyword}的每一步都走得优雅从容`,
                `时光不老，我们不散，${keyword}永远闪耀`,
                `${keyword}如星辰般璀璨，我们如月光般守护`
            ]
        },
        birthday: {
            sweet: [
                `祝${keyword}生日快乐！愿你被世界温柔以待，星光永远为你闪耀✨`,
                `${keyword}，新的一岁继续做最耀眼的存在，我们永远支持你💫`,
                `生日快乐${keyword}！愿你的每一天都如今天般美好🎂`
            ],
            cool: [
                `${keyword}生日快乐！继续做最酷的自己，不被定义🔥`,
                `又酷了一岁！${keyword}，生日快乐🎉`,
                `${keyword}的生日，我们的节日，一起嗨起来！`
            ],
            elegant: [
                `愿${keyword}岁岁年年，万喜万般宜`,
                `生辰快乐，${keyword}。愿你一生努力，一生被爱`,
                `${keyword}，愿你所求皆如愿，所行化坦途`
            ]
        },
        promotion: {
            sweet: [
                `${keyword}的新作品来啦！快来一起支持吧💕`,
                `绝对不能错过${keyword}的这部作品！`,
                `${keyword}用心创作，我们用爱支持！`
            ],
            cool: [
                `${keyword}新作上线，准备好被惊艳了吗？`,
                `这就是${keyword}的实力，不服来战！`,
                `${keyword}的作品，品质保证，值得一看`
            ],
            elegant: [
                `${keyword}携新作而来，敬请期待`,
                `品味${keyword}的匠心之作，感受艺术之美`,
                `${keyword}的新篇章，邀您共赏`
            ]
        },
        anniversary: {
            sweet: [
                `和${keyword}一起走过的每一天都是珍贵的回忆💕`,
                `${keyword}，感谢有你，周年快乐！`,
                `时光荏苒，对${keyword}的爱永不改变`
            ],
            cool: [
                `${keyword}，这是我们的纪念日，酷！`,
                `一年又一年，${keyword}依然是最棒的存在`,
                `和${keyword}的故事，还在继续书写`
            ],
            elegant: [
                `岁月如歌，与${keyword}共度的时光最为珍贵`,
                `周年快乐，${keyword}。愿未来依旧相伴`,
                `时光不老，我们不散，${keyword}周年快乐`
            ]
        }
    };
    
    const styleTemplates = templates[copyType]?.[state.currentStyle] || templates.support.sweet;
    const mainCopy = styleTemplates[0];
    const alternatives = styleTemplates.slice(1);
    
    // 如果有用户输入，进行简单优化
    let optimized = mainCopy;
    if (userInput) {
        optimized = `${userInput} —— 献给最爱的${keyword}`;
    }
    
    // 显示结果
    const aiResult = document.getElementById('aiResult');
    const optimizedText = document.getElementById('optimizedText');
    const alternativesDiv = document.getElementById('alternatives');
    const copyOptions = document.getElementById('copyOptions');
    
    if (optimizedText) optimizedText.textContent = optimized;
    if (aiResult) aiResult.style.display = 'block';
    
    if (copyOptions) {
        copyOptions.innerHTML = alternatives.map((alt, i) => `
            <div class="copy-option" onclick="selectCopy('${escapeHtml(alt)}')">
                <span class="num">${i + 1}</span>
                <p>${escapeHtml(alt)}</p>
            </div>
        `).join('');
    }
    
    if (alternativesDiv) alternativesDiv.style.display = 'block';
}

// 使用选中的文案
function useThisCopy() {
    const copy = document.getElementById('optimizedText')?.textContent;
    if (copy) {
        copyToClipboard(copy);
        showToast('文案已复制！现在去Canva/稿定设计粘贴吧~');
    }
}

// 选择备选文案
function selectCopy(text) {
    copyToClipboard(text);
    showToast('文案已复制！');
}

// ========================================
// 设计平台跳转
// ========================================
function launchCanva() {
    const templates = {
        photocard: 'https://www.canva.com/photocards/templates/',
        poster: 'https://www.canva.com/posters/templates/',
        banner: 'https://www.canva.com/banners/templates/',
        ticket: 'https://www.canva.com/tickets/templates/'
    };
    
    const url = templates[state.currentDesignType] || templates.photocard;
    window.open(url, '_blank');
    showToast('正在打开Canva...');
}

function launchGaoding() {
    const templates = {
        photocard: 'https://www.gaoding.com/templates/xiaoka',
        poster: 'https://www.gaoding.com/templates/haibao',
        banner: 'https://www.gaoding.com/templates/shoufu',
        ticket: 'https://www.gaoding.com/templates/menpiao'
    };
    
    const url = templates[state.currentDesignType] || 'https://www.gaoding.com';
    window.open(url, '_blank');
    showToast('正在打开稿定设计...');
}

// ========================================
// 弹窗控制
// ========================================
function openDesignModal(type = 'photocard') {
    state.currentDesignType = type;
    
    const typeNames = {
        photocard: '小卡',
        poster: '海报',
        banner: '手幅',
        ticket: '票根'
    };
    
    const typeNameElement = document.getElementById('designTypeName');
    if (typeNameElement) {
        typeNameElement.textContent = typeNames[type] || '小卡';
    }
    
    const modal = document.getElementById('designModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeDesignModal() {
    const modal = document.getElementById('designModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    // 重置表单
    resetModalForm();
}

function resetModalForm() {
    const aiResult = document.getElementById('aiResult');
    const alternatives = document.getElementById('alternatives');
    const keywordInput = document.getElementById('keywordInput');
    const userCopyInput = document.getElementById('userCopyInput');
    
    if (aiResult) aiResult.style.display = 'none';
    if (alternatives) alternatives.style.display = 'none';
    if (keywordInput) keywordInput.value = '';
    if (userCopyInput) userCopyInput.value = '';
}

// ========================================
// 用户系统
// ========================================
function initUser() {
    // 检查本地存储的登录状态
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        state.token = token;
        state.user = JSON.parse(user);
        updateUserUI();
    }
}

function openAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

function switchAuthTab(tab) {
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authTitle = document.getElementById('authTitle');
    
    if (tab === 'login') {
        loginTab?.classList.add('active');
        registerTab?.classList.remove('active');
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
        authTitle.textContent = '登录';
    } else {
        loginTab?.classList.remove('active');
        registerTab?.classList.add('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
        authTitle.textContent = '注册';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    
    if (!username || !password) {
        showToast('请填写用户名和密码');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/user/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.token = data.data.token;
            state.user = {
                id: data.data.user_id,
                username: data.data.username,
                email: data.data.email
            };
            
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(state.user));
            
            updateUserUI();
            closeAuthModal();
            showToast('登录成功！');
        } else {
            showToast(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录失败:', error);
        showToast('登录失败，请稍后重试');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername')?.value.trim();
    const email = document.getElementById('registerEmail')?.value.trim();
    const password = document.getElementById('registerPassword')?.value;
    const confirmPassword = document.getElementById('registerConfirmPassword')?.value;
    
    if (!username || !password) {
        showToast('请填写用户名和密码');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast('两次输入的密码不一致');
        return;
    }
    
    if (password.length < 6) {
        showToast('密码长度至少6个字符');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/api/user/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.token = data.data.token;
            state.user = {
                id: data.data.user_id,
                username: data.data.username
            };
            
            localStorage.setItem('token', data.data.token);
            localStorage.setItem('user', JSON.stringify(state.user));
            
            updateUserUI();
            closeAuthModal();
            showToast('注册成功！');
        } else {
            showToast(data.message || '注册失败');
        }
    } catch (error) {
        console.error('注册失败:', error);
        showToast('注册失败，请稍后重试');
    } finally {
        showLoading(false);
    }
}

function updateUserUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userMenu = document.getElementById('userMenu');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (state.user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userMenu) userMenu.style.display = 'flex';
        if (usernameDisplay) usernameDisplay.textContent = state.user.username;
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (userMenu) userMenu.style.display = 'none';
    }
}

function logout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    updateUserUI();
    showToast('已退出登录');
}

// ========================================
// XP检索功能
// ========================================
async function initXpSection() {
    await loadXpCategories();
    renderXpCategories();
}

async function loadXpCategories() {
    // XP标签分类数据
    state.xpCategories = {
        emotion: {
            name: '情感基调',
            tags: ['甜宠', '虐恋', '酸甜', '治愈', '温馨', '虐心', '救赎', '成长', '轻松', '沉重']
        },
        ending: {
            name: '结局类型',
            tags: ['HE', 'BE', 'OE', '开放式结局', '圆满', '遗憾', '反转', '悬念']
        },
        relationship: {
            name: '人物关系',
            tags: ['强强', '弱强', '年上', '年下', '养成', '破镜重圆', '先婚后爱', '暗恋', '双向奔赴', '追妻火葬场', '替身', '白月光']
        },
        plot: {
            name: '剧情元素',
            tags: ['权谋', '宫斗', '宅斗', '商战', '悬疑', '推理', '冒险', '穿越', '重生', '系统', '快穿', '无限流']
        },
        worldview: {
            name: '世界观',
            tags: ['现代', '古代', '民国', '星际', '末世', '玄幻', '仙侠', '武侠', '西幻', '东方幻想']
        },
        special: {
            name: '特殊设定',
            tags: ['ABO', '哨向', '兽人', '人外', '机甲', '异能', '魔法', '修仙', '种田', '基建', '娱乐圈', '校园']
        }
    };
}

function renderXpCategories() {
    const container = document.getElementById('xpCategories');
    if (!container || !state.xpCategories) return;
    
    container.innerHTML = Object.entries(state.xpCategories).map(([key, category]) => `
        <div class="xp-category">
            <div class="xp-category-title">${category.name}</div>
            <div class="xp-tags">
                ${category.tags.map(tag => `
                    <span class="xp-tag ${state.selectedXpTags.includes(tag) ? 'selected' : ''}" 
                          data-tag="${tag}" 
                          onclick="toggleXpTag(this)">${tag}</span>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function toggleXpTag(element) {
    const tag = element.dataset.tag;
    
    if (state.selectedXpTags.includes(tag)) {
        state.selectedXpTags = state.selectedXpTags.filter(t => t !== tag);
        element.classList.remove('selected');
    } else {
        state.selectedXpTags.push(tag);
        element.classList.add('selected');
    }
    
    updateSelectedXpTags();
}

function updateSelectedXpTags() {
    const container = document.getElementById('selectedTagsList');
    if (!container) return;
    
    if (state.selectedXpTags.length === 0) {
        container.innerHTML = '<span class="no-tags">点击上方标签进行筛选</span>';
    } else {
        container.innerHTML = state.selectedXpTags.map(tag => `
            <span class="selected-tag">
                ${tag}
                <span class="remove" onclick="removeXpTag('${tag}')">&times;</span>
            </span>
        `).join('');
    }
}

function removeXpTag(tag) {
    state.selectedXpTags = state.selectedXpTags.filter(t => t !== tag);
    
    // 更新标签样式
    document.querySelectorAll('.xp-tag').forEach(el => {
        if (el.dataset.tag === tag) {
            el.classList.remove('selected');
        }
    });
    
    updateSelectedXpTags();
}

function clearXpTags() {
    state.selectedXpTags = [];
    document.querySelectorAll('.xp-tag').forEach(el => el.classList.remove('selected'));
    updateSelectedXpTags();
    
    // 清空结果
    const resultsContainer = document.getElementById('xpResults');
    if (resultsContainer) resultsContainer.innerHTML = '';
}

async function performXpSearch() {
    if (state.selectedXpTags.length === 0) {
        showToast('请至少选择一个标签');
        return;
    }
    
    showLoading(true);
    
    try {
        const matchMode = document.querySelector('input[name="match-mode"]:checked')?.value || 'any';
        
        const params = new URLSearchParams({
            tags: state.selectedXpTags.join(','),
            match_mode: matchMode
        });
        
        const response = await fetch(`/api/xp/search?${params}`);
        const data = await response.json();
        
        if (data.success) {
            displayXpResults(data.data.results);
        } else {
            showToast(data.message || '检索失败');
        }
    } catch (error) {
        console.error('XP检索失败:', error);
        showToast('检索失败，请稍后重试');
    } finally {
        showLoading(false);
    }
}

function displayXpResults(results) {
    const container = document.getElementById('xpResults');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="no-results" style="text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🏷️</div>
                <h3>没有找到符合条件的内容</h3>
                <p style="color: var(--text-secondary);">试试其他标签组合吧</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="results-header" style="margin-bottom: 1.5rem;">
            <span class="results-count">找到 ${results.length} 条结果</span>
        </div>
        <div class="results-grid">
            ${results.map(item => `
                <div class="result-card" onclick="openContent('${item.content_url || '#'}')">
                    <div class="result-header">
                        <span class="result-platform">${getPlatformIcon(item.platform)} ${item.platform}</span>
                        <span class="result-heat">🔥 ${item.heat || '1.2k'}</span>
                    </div>
                    <h3>${escapeHtml(item.title)}</h3>
                    <div class="result-meta">
                        <span>👤 ${escapeHtml(item.author)}</span>
                        <span>📅 ${item.publish_date || '2024'}</span>
                    </div>
                    <p class="result-summary">${escapeHtml(item.summary || '')}</p>
                    <div class="result-tags">
                        ${(item.xp_tags || []).map(tag => `<span class="result-tag">${escapeHtml(tag)}</span>`).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ========================================
// 主题切换
// ========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// ========================================
// 工具函数
// ========================================
function scrollToSearch() {
    document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' });
}

function openContent(url) {
    if (url && url !== '#') {
        window.open(url, '_blank');
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
    } else {
        // 备选方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + 'w';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}

function getPlatformIcon(platform) {
    const icons = {
        ao3: '📚',
        lofter: '📝',
        weibo: '📱',
        bilibili: '📺',
        afdian: '⚡',
        xiaohongshu: '📕'
    };
    return icons[platform] || '📄';
}

// ========================================
// UI反馈
// ========================================
function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = show ? 'flex' : 'none';
    }
    state.isLoading = show;
}

// ========================================
// 统计数字动画
// ========================================
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = parseInt(target.dataset.target);
                animateNumber(target, finalValue);
                observer.unobserve(target);
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => observer.observe(stat));
}

function animateNumber(element, finalValue) {
    const duration = 2000;
    const startTime = performance.now();
    const startValue = 0;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用easeOutQuart缓动
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(startValue + (finalValue - startValue) * easeProgress);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = finalValue;
        }
    }
    
    requestAnimationFrame(update);
}

// ========================================
// 导航栏滚动效果
// ========================================
let lastScrollY = window.scrollY;

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScrollY = window.scrollY;
    
    if (currentScrollY > 100) {
        navbar.style.background = 'rgba(15, 15, 26, 0.95)';
    } else {
        navbar.style.background = 'rgba(15, 15, 26, 0.8)';
    }
    
    lastScrollY = currentScrollY;
});

// ========================================
// 平滑滚动导航
// ========================================
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
            
            // 更新活动状态
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        }
    });
});

// ========================================
// 键盘快捷键
// ========================================
document.addEventListener('keydown', (e) => {
    // ESC关闭弹窗
    if (e.key === 'Escape') {
        closeDesignModal();
        closeAuthModal();
    }
    
    // Ctrl/Cmd + K 聚焦搜索
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
    }
});

// ========================================
// 页面可见性变化处理
// ========================================
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // 页面重新可见时的处理
        console.log('页面重新可见');
    }
});

// ========================================
// 错误处理
// ========================================
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise拒绝:', e.reason);
});

// 导出全局函数供HTML调用
window.searchByKeyword = searchByKeyword;
window.performSearch = performSearch;
window.openDesignModal = openDesignModal;
window.closeDesignModal = closeDesignModal;
window.optimizeWithAI = optimizeWithAI;
window.useThisCopy = useThisCopy;
window.selectCopy = selectCopy;
window.launchCanva = launchCanva;
window.launchGaoding = launchGaoding;
window.scrollToSearch = scrollToSearch;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.logout = logout;
window.toggleXpTag = toggleXpTag;
window.removeXpTag = removeXpTag;
window.clearXpTags = clearXpTags;
window.performXpSearch = performXpSearch;
