// 首页功能逻辑 - 集成GitHub数据管理器版本
class SecondHandPlatform {
    constructor() {
        this.currentUser = null;
        this.userId = null;
        this.products = [];
        this.onlineUsers = [];
        this.filteredProducts = [];
        this.musicManager = null;
        this.cache = {
            products: null,
            users: null,
            lastUpdated: null
        };
        this.init();
    }

    async init() {
        await this.checkLogin();
        this.initMusicManager();
        this.loadRealProducts();
        this.loadRealOnlineUsers();
        this.setupEventListeners();
        this.startRealUpdates();
        this.initClickEffects();
        this.initMobileMenu();
        this.updateOnlineStatus();
    }

    // 检查登录状态
    async checkLogin() {
        const savedUser = localStorage.getItem('currentUser');
        const savedUserId = localStorage.getItem('userId');

        if (!savedUser) {
            window.location.href = 'index.html';
            return;
        }

        try {
            // 验证用户是否在GitHub数据中存在
            const users = await gitHubDataManager.getAllUsers();
            const user = users.find(u => u.email === savedUser && u.status === 'active');

            if (!user) {
                throw new Error('用户不存在或已被禁用');
            }

            this.currentUser = savedUser;
            this.userId = savedUserId;

            // 更新用户界面
            document.getElementById('userName').textContent = this.getShortEmail(this.currentUser);

            console.log('✅ 用户验证成功:', this.currentUser);

        } catch (error) {
            console.error('❌ 用户验证失败:', error);
            this.showNotification('登录状态已过期，请重新登录', 'error');
            setTimeout(() => {
                this.logout();
            }, 2000);
        }
    }

    // 初始化音乐管理器
    initMusicManager() {
        try {
            this.musicManager = new MusicManager();
            console.log('🎵 音乐管理器初始化完成');
        } catch (error) {
            console.error('音乐管理器初始化失败:', error);
        }
    }

    // 初始化移动端菜单
    initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navMenu = document.getElementById('navMenu');

        if (mobileMenuBtn && navMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });

            // 点击菜单项关闭菜单
            const navLinks = navMenu.querySelectorAll('.nav-link, .dropdown-item');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                });
            });

            // 点击页面其他区域关闭菜单
            document.addEventListener('click', (e) => {
                if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    navMenu.classList.remove('active');
                }
            });
        }
    }

    // 加载真实商品数据
    async loadRealProducts() {
        try {
            const grid = document.getElementById('productsGrid');
            grid.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>加载商品中...</p>
                </div>
            `;

            // 检查缓存
            const cached = this.getCachedData('products');
            if (cached) {
                this.products = cached;
                this.filteredProducts = [...this.products];
                this.renderProducts(this.filteredProducts);
                this.updateStats();
                console.log('📦 使用缓存的商品数据');
            }

            // 从GitHub获取最新数据
            this.products = await gitHubDataManager.getProducts();
            this.filteredProducts = [...this.products];

            // 更新缓存
            this.updateCache('products', this.products);

            if (this.products.length === 0) {
                this.showEmptyProductsState();
            } else {
                this.renderProducts(this.filteredProducts);
                this.updateStats();
            }

            console.log(`✅ 加载了 ${this.products.length} 个商品`);
        } catch (error) {
            console.error('加载商品失败:', error);
            this.showEmptyProductsState();
        }
    }

    // 显示商品空状态
    showEmptyProductsState() {
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>暂无闲置商品</h3>
                <p>还没有用户发布商品，成为第一个发布者吧！</p>
                <button class="btn-primary click-ripple" onclick="location.href='publish.html'">
                    <i class="fas fa-plus"></i>
                    发布商品
                </button>
            </div>
        `;
    }

    // 加载真实在线用户
    async loadRealOnlineUsers() {
        try {
            this.onlineUsers = await gitHubDataManager.getOnlineUsers();
            this.renderOnlineUsers();
            document.getElementById('onlineCount').textContent = this.onlineUsers.length;
            document.getElementById('onlineUsers').textContent = this.onlineUsers.length;
            console.log(`👥 加载了 ${this.onlineUsers.length} 个在线用户`);
        } catch (error) {
            console.error('加载在线用户失败:', error);
            this.onlineUsers = [];
            this.renderOnlineUsers();
        }
    }

    // 更新在线状态
    async updateOnlineStatus() {
        if (this.userId && this.currentUser) {
            try {
                await gitHubDataManager.updateOnlineStatus(this.userId, this.currentUser, 'online');
                console.log('✅ 在线状态已更新');
            } catch (error) {
                console.error('更新在线状态失败:', error);
            }
        }
    }

    // 渲染商品列表
    renderProducts(products) {
        const grid = document.getElementById('productsGrid');

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>没有找到商品</h3>
                    <p>尝试调整筛选条件或搜索其他关键词</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';

        products.forEach(product => {
            const productCard = this.createProductCard(product);
            grid.appendChild(productCard);
        });
    }

    // 创建商品卡片
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card click-ripple';

        // 检查是否已点赞
        const likedProducts = JSON.parse(localStorage.getItem('likedProducts') || '{}');
        const isLiked = !!likedProducts[product.id];

        card.innerHTML = `
            <div class="product-image">
                ${this.getProductIcon(product.category)}
            </div>
            <div class="product-info">
                <h3 class="product-title">${this.escapeHtml(product.title)}</h3>
                <div class="product-price">¥${product.price}</div>
                <div class="product-meta">
                    <div class="product-seller">
                        <i class="fas fa-user"></i>
                        ${this.getShortEmail(product.sellerEmail || product.seller)}
                    </div>
                    <div class="product-time">
                        <i class="far fa-clock"></i>
                        ${this.formatTime(product.createTime)}
                    </div>
                </div>
                <p class="product-description">${this.escapeHtml(product.description)}</p>
                <div class="product-actions">
                    <button class="chat-btn click-ripple" onclick="event.stopPropagation(); platform.startChat('${product.id}')">
                        <i class="fas fa-comment"></i>
                        联系卖家
                    </button>
                    <button class="like-btn click-ripple ${isLiked ? 'liked' : ''}"
                            onclick="event.stopPropagation(); platform.toggleLike('${product.id}')">
                        <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        <span class="like-count">${product.likes || 0}</span>
                    </button>
                </div>
            </div>
        `;

        // 添加点击查看详情事件
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.product-actions')) {
                this.viewProductDetail(product.id);
            }
        });

        return card;
    }

    // 获取商品分类图标
    getProductIcon(category) {
        const icons = {
            'electronics': '📱',
            'clothing': '👕',
            'home': '🏠',
            'books': '📚',
            'sports': '⚽',
            'other': '📦'
        };
        return icons[category] || '📦';
    }

    // 渲染在线用户列表
    renderOnlineUsers() {
        const usersList = document.getElementById('usersList');

        if (this.onlineUsers.length === 0) {
            usersList.innerHTML = `
                <div class="empty-users">
                    <i class="fas fa-user-slash"></i>
                    <p>暂无用户在线</p>
                </div>
            `;
            return;
        }

        usersList.innerHTML = '';
        this.onlineUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item click-ripple';
            userItem.innerHTML = `
                <div class="user-avatar">
                    ${this.getShortEmail(user.userEmail).charAt(0).toUpperCase()}
                </div>
                <div class="user-name">${this.getShortEmail(user.userEmail)}</div>
                <div class="user-status"></div>
            `;

            userItem.addEventListener('click', () => {
                this.startPrivateChat(user.userId, user.userEmail);
            });

            usersList.appendChild(userItem);
        });
    }

    // 更新统计信息
    updateStats() {
        document.getElementById('totalProducts').textContent = this.products.length;
        // 这里可以添加真实交易数据
        document.getElementById('totalTransactions').textContent = Math.floor(this.products.length * 0.3);
    }

    // 查看商品详情
    viewProductDetail(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            this.showProductModal(product);
        }
    }

    // 显示商品详情模态框
    showProductModal(product) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${this.escapeHtml(product.title)}</h2>
                    <button class="modal-close click-ripple" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="product-image-large">
                        ${this.getProductIcon(product.category)}
                    </div>
                    <div class="product-details">
                        <div class="price-section">
                            <span class="price">¥${product.price}</span>
                        </div>
                        <div class="product-meta">
                            <div class="meta-item">
                                <i class="fas fa-user"></i>
                                <span>卖家: ${this.getShortEmail(product.sellerEmail || product.seller)}</span>
                            </div>
                            <div class="meta-item">
                                <i class="far fa-clock"></i>
                                <span>发布时间: ${this.formatTime(product.createTime)}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-tag"></i>
                                <span>分类: ${this.getCategoryName(product.category)}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>位置: ${product.location || '未知'}</span>
                            </div>
                        </div>
                        <div class="product-description-full">
                            <h4>商品描述</h4>
                            <p>${this.escapeHtml(product.description)}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary click-ripple" onclick="this.closest('.modal').remove()">
                        关闭
                    </button>
                    <button class="btn-primary click-ripple" onclick="platform.startChat('${product.id}')">
                        <i class="fas fa-comment"></i>
                        联系卖家
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 点击模态框外部关闭
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // 获取分类名称
    getCategoryName(category) {
        const categories = {
            'electronics': '电子产品',
            'clothing': '服装鞋帽',
            'home': '家居日用',
            'books': '图书文具',
            'sports': '运动户外',
            'other': '其他'
        };
        return categories[category] || '其他';
    }

    // 开始聊天 - 预留功能
    startChat(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            // 保存当前聊天上下文
            const chatContext = {
                productId: product.id,
                productTitle: product.title,
                seller: product.sellerEmail || product.seller,
                startTime: new Date().toISOString()
            };
            localStorage.setItem('currentChatContext', JSON.stringify(chatContext));

            // 跳转到聊天页面
            window.location.href = 'chat.html';
        }
    }

    // 开始私聊
    startPrivateChat(userId, userEmail) {
        const chatContext = {
            userId: userId,
            userEmail: userEmail,
            startTime: new Date().toISOString(),
            type: 'private'
        };
        localStorage.setItem('currentChatContext', JSON.stringify(chatContext));
        window.location.href = 'chat.html';
    }

    // 点赞/取消点赞
    toggleLike(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            const likedProducts = JSON.parse(localStorage.getItem('likedProducts') || '{}');

            if (likedProducts[productId]) {
                // 取消点赞
                product.likes = Math.max(0, (product.likes || 0) - 1);
                delete likedProducts[productId];
                this.showNotification('已取消点赞', 'info');
            } else {
                // 点赞
                product.likes = (product.likes || 0) + 1;
                likedProducts[productId] = true;
                this.showNotification('点赞成功', 'success');
            }

            localStorage.setItem('likedProducts', JSON.stringify(likedProducts));
            this.renderProducts(this.filteredProducts);
        }
    }

    // 搜索商品
    searchProducts() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        if (searchTerm === '') {
            this.filteredProducts = [...this.products];
            this.renderProducts(this.filteredProducts);
            return;
        }

        const filtered = this.products.filter(product =>
            product.title.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm) ||
            this.getCategoryName(product.category).includes(searchTerm)
        );

        this.filteredProducts = filtered;
        this.renderProducts(filtered);

        if (filtered.length === 0) {
            this.showNotification('没有找到相关商品', 'info');
        }
    }

    // 筛选商品
    filterProducts() {
        const category = document.getElementById('categoryFilter').value;
        const priceRange = document.getElementById('priceFilter').value;

        let filtered = this.products;

        // 分类筛选
        if (category !== 'all') {
            filtered = filtered.filter(product => product.category === category);
        }

        // 价格筛选
        if (priceRange !== 'all') {
            filtered = filtered.filter(product => {
                const price = product.price;
                switch (priceRange) {
                    case '0-50': return price <= 50;
                    case '50-100': return price > 50 && price <= 100;
                    case '100-200': return price > 100 && price <= 200;
                    case '200-500': return price > 200 && price <= 500;
                    case '500+': return price > 500;
                    default: return true;
                }
            });
        }

        this.filteredProducts = filtered;
        this.renderProducts(filtered);

        if (filtered.length === 0) {
            this.showNotification('没有符合条件的商品', 'info');
        }
    }

    // 排序商品
    sortProducts() {
        const sortBy = document.getElementById('sortFilter').value;
        let sorted = [...this.filteredProducts];

        switch (sortBy) {
            case 'price-low':
                sorted.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
            default:
                sorted.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
                break;
        }

        this.filteredProducts = sorted;
        this.renderProducts(sorted);
    }

    // 开始实时更新
    startRealUpdates() {
        // 每30秒更新一次在线用户
        setInterval(async () => {
            await this.loadRealOnlineUsers();
        }, 30000);

        // 每2分钟更新一次商品数据
        setInterval(async () => {
            await this.loadRealProducts();
        }, 120000);

        // 每分钟更新一次在线状态
        setInterval(async () => {
            await this.updateOnlineStatus();
        }, 60000);
    }

    // 设置事件监听器
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchProducts();
                }
            });

            // 实时搜索
            searchInput.addEventListener('input', this.debounce(() => {
                this.searchProducts();
            }, 300));
        }

        // 筛选器事件
        const categoryFilter = document.getElementById('categoryFilter');
        const priceFilter = document.getElementById('priceFilter');
        const sortFilter = document.getElementById('sortFilter');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => {
                this.filterProducts();
                this.sortProducts();
            });
        }

        if (priceFilter) {
            priceFilter.addEventListener('change', () => {
                this.filterProducts();
                this.sortProducts();
            });
        }

        if (sortFilter) {
            sortFilter.addEventListener('change', () => {
                this.sortProducts();
            });
        }
    }

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 缓存管理
    getCachedData(key) {
        const cached = localStorage.getItem(`cache_${key}`);
        if (cached) {
            const data = JSON.parse(cached);
            // 检查缓存是否过期（5分钟）
            if (Date.now() - data.timestamp < 5 * 60 * 1000) {
                return data.value;
            }
        }
        return null;
    }

    updateCache(key, value) {
        const cacheData = {
            value: value,
            timestamp: Date.now()
        };
        localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
    }

    // 初始化点击特效
    initClickEffects() {
        document.addEventListener('click', function(e) {
            const clickableSelectors = [
                '.nav-link', '.search-btn', '.product-card',
                '.action-btn', '.user-item', '.publish-btn',
                '.chat-btn', '.like-btn', '.quick-chat-btn', '.floating-chat-btn',
                '.modal-close', '.btn-primary', '.btn-secondary', '.mobile-menu-btn',
                '.music-toggle'
            ];

            clickableSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element.contains(e.target)) {
                        createRippleEffect(element, e);
                    }
                });
            });
        });

        function createRippleEffect(element, event) {
            const ripple = document.createElement('div');
            const rect = element.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = event.clientX - rect.left - size / 2;
            const y = event.clientY - rect.top - size / 2;

            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                border-radius: 50%;
                background: rgba(74, 144, 226, 0.6);
                transform: scale(0);
                animation: ripple 0.6s linear;
                pointer-events: none;
                z-index: 100;
            `;

            element.style.position = 'relative';
            element.style.overflow = 'hidden';
            element.appendChild(ripple);

            setTimeout(() => {
                if (ripple.parentNode === element) {
                    element.removeChild(ripple);
                }
            }, 600);
        }
    }

    // 显示通知
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            z-index: 2000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.2);
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // 工具函数：获取短邮箱
    getShortEmail(email) {
        return email ? email.split('@')[0] : '未知用户';
    }

    // 工具函数：格式化时间
    formatTime(timeString) {
        const time = new Date(timeString);
        const now = new Date();
        const diff = now - time;

        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return Math.floor(diff / 60000) + '分钟前';
        } else if (diff < 86400000) { // 1天内
            return Math.floor(diff / 3600000) + '小时前';
        } else {
            return time.toLocaleDateString();
        }
    }

    // 工具函数：HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 退出登录
    logout() {
        // 更新离线状态
        if (this.userId && this.currentUser) {
            gitHubDataManager.updateOnlineStatus(this.userId, this.currentUser, 'offline')
                .catch(console.error);
        }

        localStorage.removeItem('currentUser');
        localStorage.removeItem('userId');
        localStorage.removeItem('currentChatContext');
        window.location.href = 'index.html';
    }
}

// 音乐管理器
class MusicManager {
    constructor() {
        this.audio = null;
        this.isPlaying = false;
        this.volume = 0.5;
        this.sources = [
            "https://raw.githubusercontent.com/zhou-sir6668899/hawk-space/main/zhuimeng.mp3"
        ];
        this.currentSourceIndex = 0;
        this.init();
    }

    init() {
        this.audio = new Audio();
        this.audio.volume = this.volume;
        this.audio.loop = true;
        this.audio.crossOrigin = "anonymous";

        this.setupMusicControls();
        this.loadCurrentSource();
    }

    loadCurrentSource() {
        const source = this.sources[this.currentSourceIndex];
        console.log('🎵 加载音乐:', source);

        this.audio.src = source;
        this.audio.load();

        this.audio.addEventListener('canplaythrough', () => {
            console.log('✅ 音乐文件可以播放');
        });

        this.audio.addEventListener('error', (e) => {
            console.error('❌ 音乐加载错误:', e);
            this.handleLoadError();
        });
    }

    handleLoadError() {
        this.showPlayError();
    }

    setupMusicControls() {
        const toggleBtn = document.getElementById('musicToggle');
        const volumeSlider = document.getElementById('volumeSlider');

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(e.target.value / 100);
            });
        }
    }

    async play() {
        try {
            if (this.audio.readyState < 3) {
                this.loadCurrentSource();
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            await this.audio.play();
            this.isPlaying = true;
            this.updateUI();
            console.log('✅ 音乐播放成功');

        } catch (error) {
            console.error('❌ 播放失败:', error);
            this.showPlayError();
        }
    }

    showPlayError() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            background: #e74c3c;
            color: white;
            padding: 10px 15px;
            border-radius: 5px;
            z-index: 2000;
            font-size: 12px;
        `;
        notification.innerHTML = `
            <div>音乐加载失败</div>
            <div style="font-size: 10px; opacity: 0.8;">请检查网络连接</div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 3000);
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updateUI();
    }

    setVolume(level) {
        this.volume = level;
        this.audio.volume = level;
    }

    toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    updateUI() {
        const toggleBtn = document.getElementById('musicToggle');
        const volumeSlider = document.getElementById('volumeSlider');

        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            if (icon) {
                icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
        }

        if (volumeSlider) {
            volumeSlider.value = this.volume * 100;
        }
    }
}

// 初始化平台
const platform = new SecondHandPlatform();

// 全局函数供HTML调用
function searchProducts() {
    platform.searchProducts();
}

function filterProducts() {
    platform.filterProducts();
}

function sortProducts() {
    platform.sortProducts();
}

function logout() {
    platform.logout();
}

function scrollToProducts() {
    const productsSection = document.querySelector('.products-section');
    if (productsSection) {
        productsSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    // 添加波纹动画样式
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
});

// 请求通知权限
if ('Notification' in window) {
    Notification.requestPermission();
}

// 页面可见性改变时暂停音乐
document.addEventListener('visibilitychange', function() {
    if (document.hidden && platform.musicManager && platform.musicManager.isPlaying) {
        platform.musicManager.pause();
    }
});

console.log('🎯 鹰隼空间主页已加载完成');