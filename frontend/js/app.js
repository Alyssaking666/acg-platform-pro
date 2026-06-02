/**
 * ACG兴趣聚合平台 - 前端应用
 * 包含用户系统、搜索、XP检索、收藏等功能
 */

// API基础URL
const API_BASE_URL = '';

// 应用状态
const state = {
    user: null,
    token: localStorage.getItem('token'),
    favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
    searchResults: [],
    xpResults: [],
    selectedXpTags: [],
    currentPage: 1,
    isLoading: false,
    currentFilters: {
        keyword: '',
        platform: 'all',
        type: 'all',
        aggregation: 'all',
        sort: 'popularity'
    }
};

// DOM元素缓存
const elements = {};

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    bindEvents();
    initUserState();
    loadInitialData();
});

// 缓存DOM元素
function cacheElements() {
    // 导航
    elements.navLinks = document.querySelectorAll('.nav-link');
    elements.userSection = document.getElementById('user-section');
    elements.userInfo = document.getElementById('user-info');
    elements.userName = document.querySelector('.user-name');
    
    // 搜索
    elements.searchInput = document.getElementById('search-input');
    elements.searchBtn = document.getElementById('search-btn');
    elements.resultsContainer = document.getElementById('results-container');
    elements.resultsCount = document.getElementById('results-count');
    elements.loadingIndicator = document.getElementById('loading-indicator');
    elements.loadMoreBtn = document.getElementById('load-more-btn');
    elements.loadMoreContainer = document.getElementById('load-more-container');
    
    // 筛选
    elements.platformFilter = document.getElementById('platform-filter');
    elements.typeFilter = document.getElementById('type-filter');
    elements.sortFilter = document.getElementById('sort-filter');
    elements.aggTabs = document.querySelectorAll('.agg-tab');
    
    // XP检索
    elements.xpTags = document.querySelectorAll('.xp-tag');
    elements.selectedXpTags = document.getElementById('selected-xp-tags');
    elements.xpSearchBtn = document.getElementById('xp-search-btn');
    elements.xpResultsContainer = document.getElementById('xp-results-container');
    elements.xpResultsCount = document.getElementById('xp-results-count');
    
    // 收藏
    elements.favoritesContainer = document.getElementById('favorites-container');
    elements.favoritesEmpty = document.getElementById('favorites-empty');
    
    // 认证弹窗
    elements.authModal = document.getElementById('auth-modal');
    elements.loginForm = document.getElementById('login-form');
    elements.registerForm = document.getElementById('register-form');
    elements.loginError = document.getElementById('login-error');
    elements.registerError = document.getElementById('register-error');
    
    // Toast
    elements.toast = document.getElementById('toast');
    elements.toastMessage = document.getElementById('toast-message');
}

// 绑定事件
function bindEvents() {
    // 导航切换
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            navigateTo(section);
        });
    });
    
    // 搜索
    elements.searchBtn.addEventListener('click', performSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // 热门标签点击
    document.querySelectorAll('.hot-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            elements.searchInput.value = tag.dataset.ip;
            performSearch();
        });
    });
    
    // 筛选器
    elements.platformFilter.addEventListener('change', updateFilters);
    elements.typeFilter.addEventListener('change', updateFilters);
    elements.sortFilter.addEventListener('change', updateFilters);
    
    // 聚合标签切换
    elements.aggTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            elements.aggTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.currentFilters.aggregation = tab.dataset.agg;
            performSearch();
        });
    });
    
    // 加载更多
    elements.loadMoreBtn.addEventListener('click', loadMore);
    
    // XP标签选择
    elements.xpTags.forEach(tag => {
        tag.addEventListener('click', () => toggleXpTag(tag));
    });
    
    // XP搜索
    elements.xpSearchBtn.addEventListener('click', performXpSearch);
    
    // 认证弹窗
    document.getElementById('login-btn').addEventListener('click', () => openAuthModal('login'));
    document.getElementById('register-btn').addEventListener('click', () => openAuthModal('register'));
    document.getElementById('modal-close').addEventListener('click', closeAuthModal);
    document.getElementById('switch-to-register').addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('register');
    });
    document.getElementById('switch-to-login').addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthForm('login');
    });
    
    // 登录/注册提交
    document.getElementById('login-submit').addEventListener('click', handleLogin);
    document.getElementById('register-submit').addEventListener('click', handleRegister);
    
    // 退出登录
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // 点击遮罩关闭弹窗
    document.querySelector('.modal-overlay').addEventListener('click', closeAuthModal);
}

// 初始化用户状态
async function initUserState() {
    if (state.token) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/verify-token`, {
                headers: {
                    'Authorization': `Bearer ${state.token}`
                }
            });
            const data = await response.json();
            
            if (data.success) {
                state.user = data.data;
                updateUserUI();
            } else {
                localStorage.removeItem('token');
                state.token = null;
            }
        } catch (error) {
            console.error('Token验证失败:', error);
        }
    }
}

// 加载初始数据
async function loadInitialData() {
    try {
        const response = await fetch('../data/articles.json');
        const articles = await response.json();
        state.localArticles = articles;
        displayResults(articles.slice(0, 12));
    } catch (error) {
        console.error('加载数据失败:', error);
    }
}

// 导航切换
function navigateTo(section) {
    elements.navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.section === section);
    });
    
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.toggle('active', sec.id === `${section}-section`);
    });
    
    if (section === 'favorites') {
        loadFavorites();
    }
}

// 执行搜索
async function performSearch() {
    const keyword = elements.searchInput.value.trim();
    if (!keyword) {
        showToast('请输入搜索关键词', 'error');
        return;
    }
    
    state.currentFilters.keyword = keyword;
    state.currentPage = 1;
    state.searchResults = [];
    
    elements.resultsContainer.innerHTML = '';
    elements.loadingIndicator.classList.remove('hidden');
    elements.loadMoreContainer.classList.add('hidden');
    
    try {
        const params = new URLSearchParams({
            keyword: keyword,
            platform: state.currentFilters.platform,
            type: state.currentFilters.type,
            aggregation: state.currentFilters.aggregation,
            sort: state.currentFilters.sort,
            page: state.currentPage,
            per_page: 20
        });
        
        const response = await fetch(`${API_BASE_URL}/api/search?${params}`);
        const data = await response.json();
        
        if (data.success) {
            state.searchResults = data.results || [];
            displayResults(state.searchResults);
            elements.resultsCount.textContent = `${data.total || 0} 个结果`;
            
            if (data.total_pages > state.currentPage) {
                elements.loadMoreContainer.classList.remove('hidden');
            }
        } else {
            showToast(data.error || '搜索失败', 'error');
        }
    } catch (error) {
        console.error('搜索错误:', error);
        const localResults = searchLocalData(keyword);
        displayResults(localResults);
        elements.resultsCount.textContent = `${localResults.length} 个结果 (本地数据)`;
    } finally {
        elements.loadingIndicator.classList.add('hidden');
    }
}

// 本地数据搜索
function searchLocalData(keyword) {
    if (!state.localArticles) return [];
    
    const keywordLower = keyword.toLowerCase();
    return state.localArticles.filter(article => {
        return (
            article.title.toLowerCase().includes(keywordLower) ||
            article.ip.toLowerCase().includes(keywordLower) ||
            article.tags.some(tag => tag.toLowerCase().includes(keywordLower))
        );
    }).filter(article => {
        if (state.currentFilters.platform !== 'all' && 
            article.platform !== state.currentFilters.platform) {
            return false;
        }
        if (state.currentFilters.aggregation !== 'all' && 
            article.aggregation !== state.currentFilters.aggregation) {
            return false;
        }
        return true;
    });
}

// 更新筛选器
function updateFilters() {
    state.currentFilters.platform = elements.platformFilter.value;
    state.currentFilters.type = elements.typeFilter.value;
    state.currentFilters.sort = elements.sortFilter.value;
    
    if (state.currentFilters.keyword) {
        performSearch();
    }
}

// 加载更多
async function loadMore() {
    if (state.isLoading) return;
    
    state.isLoading = true;
    state.currentPage++;
    
    elements.loadMoreBtn.textContent = '加载中...';
    
    try {
        const params = new URLSearchParams({
            keyword: state.currentFilters.keyword,
            platform: state.currentFilters.platform,
            type: state.currentFilters.type,
            aggregation: state.currentFilters.aggregation,
            sort: state.currentFilters.sort,
            page: state.currentPage,
            per_page: 20
        });
        
        const response = await fetch(`${API_BASE_URL}/api/search?${params}`);
        const data = await response.json();
        
        if (data.success && data.results) {
            state.searchResults.push(...data.results);
            displayResults(data.results, true);
            
            if (data.total_pages <= state.currentPage) {
                elements.loadMoreContainer.classList.add('hidden');
            }
        }
    } catch (error) {
        console.error('加载更多失败:', error);
    } finally {
        state.isLoading = false;
        elements.loadMoreBtn.textContent = '加载更多';
    }
}

// 显示搜索结果
function displayResults(results, append = false) {
    if (!append) {
        elements.resultsContainer.innerHTML = '';
    }
    
    if (results.length === 0 && !append) {
        elements.resultsContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-search"></i>
                <p>没有找到相关内容</p>
            </div>
        `;
        return;
    }
    
    const html = results.map(item => createCardHTML(item)).join('');
    
    if (append) {
        elements.resultsContainer.insertAdjacentHTML('beforeend', html);
    } else {
        elements.resultsContainer.innerHTML = html;
    }
    
    bindCardEvents();
}

// 创建卡片HTML
function createCardHTML(item) {
    const isFavorited = state.favorites.includes(item.id);
    const isCollection = item.aggregation === 'collection';
    const platformName = getPlatformName(item.platform);
    
    return `
        <div class="content-card" data-id="${item.id}">
            <div class="card-header">
                <h3 class="card-title">${escapeHtml(item.title)}</h3>
                <div class="card-badges">
                    <span class="badge badge-${isCollection ? 'collection' : 'single'}">
                        ${isCollection ? '合集' : '单篇'}
                    </span>
                    <span class="badge badge-platform">${platformName}</span>
                </div>
            </div>
            <div class="card-body">
                <p class="card-summary">${escapeHtml(item.summary || '')}</p>
                <div class="card-meta">
                    <span class="card-meta-item">
                        <i class="fas fa-user"></i>
                        ${escapeHtml(item.author || 'Unknown')}
                    </span>
                    <span class="card-meta-item">
                        <i class="fas fa-fire"></i>
                        ${formatNumber(item.popularity || 0)}
                    </span>
                    ${item.words ? `
                    <span class="card-meta-item">
                        <i class="fas fa-file-word"></i>
                        ${formatNumber(item.words)}字
                    </span>
                    ` : ''}
                </div>
                <div class="card-tags">
                    ${(item.xp_tags || item.tags || []).slice(0, 5).map(tag => 
                        `<span class="card-tag xp-tag">${escapeHtml(tag)}</span>`
                    ).join('')}
                </div>
                ${isCollection && item.collection_count ? `
                <div class="collection-info">
                    <i class="fas fa-layer-group"></i>
                    <span>${item.collection_name || '合集'} · ${item.collection_count}篇</span>
                </div>
                ` : ''}
            </div>
            <div class="card-footer">
                <div class="card-stats">
                    <span class="card-stat">
                        <i class="fas fa-eye"></i>
                        ${formatNumber(item.popularity || 0)}
                    </span>
                </div>
                <div class="card-actions">
                    <button class="card-btn favorite-btn ${isFavorited ? 'favorited' : ''}" data-id="${item.id}">
                        <i class="${isFavorited ? 'fas' : 'far'} fa-heart"></i>
                        ${isFavorited ? '已收藏' : '收藏'}
                    </button>
                    <a href="${item.content_url || item.url || '#'}" target="_blank" class="card-btn">
                        <i class="fas fa-external-link-alt"></i>
                        查看
                    </a>
                </div>
            </div>
        </div>
    `;
}

// 绑定卡片事件
function bindCardEvents() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            toggleFavorite(id, e.currentTarget);
        });
    });
}

// 切换收藏状态
function toggleFavorite(id, btn) {
    const index = state.favorites.indexOf(id);
    
    if (index > -1) {
        state.favorites.splice(index, 1);
        btn.classList.remove('favorited');
        btn.innerHTML = '<i class="far fa-heart"></i> 收藏';
        showToast('已取消收藏');
    } else {
        state.favorites.push(id);
        btn.classList.add('favorited');
        btn.innerHTML = '<i class="fas fa-heart"></i> 已收藏';
        showToast('收藏成功');
    }
    
    localStorage.setItem('favorites', JSON.stringify(state.favorites));
}

// 加载收藏列表
function loadFavorites() {
    if (!state.localArticles) return;
    
    const favoriteItems = state.localArticles.filter(item => 
        state.favorites.includes(item.id)
    );
    
    if (favoriteItems.length === 0) {
        elements.favoritesContainer.innerHTML = '';
        elements.favoritesEmpty.classList.remove('hidden');
    } else {
        elements.favoritesEmpty.classList.add('hidden');
        elements.favoritesContainer.innerHTML = favoriteItems.map(item => createCardHTML(item)).join('');
        bindCardEvents();
    }
}

// XP标签切换
function toggleXpTag(tagElement) {
    const tag = tagElement.dataset.tag;
    
    if (state.selectedXpTags.includes(tag)) {
        state.selectedXpTags = state.selectedXpTags.filter(t => t !== tag);
        tagElement.classList.remove('selected');
    } else {
        state.selectedXpTags.push(tag);
        tagElement.classList.add('selected');
    }
    
    updateSelectedXpTags();
}

// 更新已选XP标签显示
function updateSelectedXpTags() {
    if (state.selectedXpTags.length === 0) {
        elements.selectedXpTags.innerHTML = '<span class="no-selection">点击上方标签进行筛选</span>';
    } else {
        elements.selectedXpTags.innerHTML = state.selectedXpTags.map(tag => `
            <span class="selected-xp-tag">
                ${tag}
                <i class="fas fa-times remove-tag" data-tag="${tag}"></i>
            </span>
        `).join('');
        
        document.querySelectorAll('.remove-tag').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tag = e.target.dataset.tag;
                state.selectedXpTags = state.selectedXpTags.filter(t => t !== tag);
                document.querySelector(`.xp-tag[data-tag="${tag}"]`).classList.remove('selected');
                updateSelectedXpTags();
            });
        });
    }
}

// 执行XP搜索
async function performXpSearch() {
    if (state.selectedXpTags.length === 0) {
        showToast('请至少选择一个XP标签', 'error');
        return;
    }
    
    const matchMode = document.querySelector('input[name="match-mode"]:checked').value;
    
    elements.xpResultsContainer.innerHTML = `
        <div class="loading-indicator" style="grid-column: 1 / -1;">
            <div class="spinner"></div>
            <span>搜索中...</span>
        </div>
    `;
    
    try {
        const params = new URLSearchParams({
            tags: state.selectedXpTags.join(','),
            match_mode: matchMode,
            page: 1,
            per_page: 20
        });
        
        const response = await fetch(`${API_BASE_URL}/api/xp-search?${params}`);
        const data = await response.json();
        
        if (data.success) {
            state.xpResults = data.data.results || [];
            displayXpResults(state.xpResults);
            elements.xpResultsCount.textContent = `${data.data.total || 0} 个结果`;
        } else {
            showToast(data.error || '搜索失败', 'error');
        }
    } catch (error) {
        console.error('XP搜索错误:', error);
        // 使用本地数据
        const localResults = searchLocalByXp(state.selectedXpTags, matchMode);
        displayXpResults(localResults);
        elements.xpResultsCount.textContent = `${localResults.length} 个结果 (本地数据)`;
    }
}

// 本地XP搜索
function searchLocalByXp(tags, matchMode) {
    if (!state.localArticles) return [];
    
    return state.localArticles.filter(article => {
        const articleTags = article.xp_tags || article.tags || [];
        
        if (matchMode === 'all') {
            return tags.every(tag => articleTags.includes(tag));
        } else {
            return tags.some(tag => articleTags.includes(tag));
        }
    });
}

// 显示XP搜索结果
function displayXpResults(results) {
    if (results.length === 0) {
        elements.xpResultsContainer.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <i class="fas fa-filter"></i>
                <p>没有找到符合条件的内容</p>
            </div>
        `;
        return;
    }
    
    elements.xpResultsContainer.innerHTML = results.map(item => createCardHTML(item)).join('');
    bindCardEvents();
}

// 打开认证弹窗
function openAuthModal(type) {
    elements.authModal.classList.remove('hidden');
    switchAuthForm(type);
}

// 关闭认证弹窗
function closeAuthModal() {
    elements.authModal.classList.add('hidden');
    clearAuthForms();
}

// 切换认证表单
function switchAuthForm(type) {
    if (type === 'login') {
        elements.loginForm.classList.remove('hidden');
        elements.registerForm.classList.add('hidden');
    } else {
        elements.loginForm.classList.add('hidden');
        elements.registerForm.classList.remove('hidden');
    }
    clearAuthForms();
}

// 清除表单
function clearAuthForms() {
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('register-username').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-password-confirm').value = '';
    elements.loginError.textContent = '';
    elements.registerError.textContent = '';
}

// 处理登录
async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        elements.loginError.textContent = '请输入用户名和密码';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.user = data.data.user;
            state.token = data.data.token;
            localStorage.setItem('token', state.token);
            updateUserUI();
            closeAuthModal();
            showToast('登录成功');
        } else {
            elements.loginError.textContent = data.error || '登录失败';
        }
    } catch (error) {
        console.error('登录错误:', error);
        elements.loginError.textContent = '网络错误，请稍后重试';
    }
}

// 处理注册
async function handleRegister() {
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;
    
    if (!username || !password) {
        elements.registerError.textContent = '请输入用户名和密码';
        return;
    }
    
    if (username.length < 3) {
        elements.registerError.textContent = '用户名至少需要3个字符';
        return;
    }
    
    if (password.length < 6) {
        elements.registerError.textContent = '密码至少需要6个字符';
        return;
    }
    
    if (password !== passwordConfirm) {
        elements.registerError.textContent = '两次输入的密码不一致';
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.user = data.data.user;
            state.token = data.data.token;
            localStorage.setItem('token', state.token);
            updateUserUI();
            closeAuthModal();
            showToast('注册成功');
        } else {
            elements.registerError.textContent = data.error || '注册失败';
        }
    } catch (error) {
        console.error('注册错误:', error);
        elements.registerError.textContent = '网络错误，请稍后重试';
    }
}

// 处理退出登录
function handleLogout() {
    state.user = null;
    state.token = null;
    localStorage.removeItem('token');
    updateUserUI();
    showToast('已退出登录');
}

// 更新用户UI
function updateUserUI() {
    if (state.user) {
        elements.userSection.classList.add('hidden');
        elements.userInfo.classList.remove('hidden');
        elements.userName.textContent = state.user.username;
    } else {
        elements.userSection.classList.remove('hidden');
        elements.userInfo.classList.add('hidden');
    }
}

// 显示提示消息
function showToast(message, type = 'success') {
    elements.toastMessage.textContent = message;
    elements.toast.className = `toast ${type}`;
    elements.toast.classList.remove('hidden');
    
    setTimeout(() => {
        elements.toast.classList.add('hidden');
    }, 3000);
}

// 工具函数：转义HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 工具函数：格式化数字
function formatNumber(num) {
    if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    }
    return num.toLocaleString();
}

// 工具函数：获取平台名称
function getPlatformName(platform) {
    const names = {
        'ao3': 'AO3',
        'lofter': 'Lofter',
        'weibo': '微博',
        'bilibili': 'B站'
    };
    return names[platform] || platform;
}

// 全局导出
window.app = {
    navigateTo
};
