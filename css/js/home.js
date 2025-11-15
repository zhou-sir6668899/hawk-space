
// 首页功能逻辑 - 真实数据版本
class SecondHandPlatform {
    constructor() {
        this.currentUser = null;
        this.userId = null;
        this.products = [];
        this.onlineUsers = [];
        this.init();
    }

    async init() {
        await this.checkLogin();
        this.loadRealProducts();
        this.loadRealOnlineUsers();
        this.setupEventListeners();
        this.startRealUpdates();
        this.initClickEffects();
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

    // 加载真实商品数据
    async loadRealProducts() {
        try {
            // 从GitHub数据获取真实商品
            this.products = await this.getRealProductsFromSource();

            if (this.products.length === 0) {
                this.showEmptyProductsState();
            } else {
                this.renderProducts(this.products);
            }
        } catch (error) {
            console.error('加载商品失败:', error);
            this.showEmptyProductsState();
        }
    }

    // 从真实数据源获取商品
    async getRealProductsFromSource() {
        // 这里应该从GitHub数据或其他真实数据源获取
        // 暂时返回空数组，表示没有商品
        return [];
    }

    // 显示商品空状态
    showEmptyProductsState() {
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>暂无闲置商品</h3>
                <p>还没有用户发布商品，成为第一个发布者吧！</p>
                <button class="publish-btn click-ripple" onclick="location.href='publish.html'">
                    <i class="fas fa-plus"></i>
                    发布商品
                </button>
            </div>
        `;
    }

    // 加载真实在线用户
    async loadRealOnlineUsers() {
        try {
            // 从真实数据源获取在线用户
            this.onlineUsers = await this.getRealOnlineUsersFromSource();
            this.renderOnlineUsers();
            document.getElementById('onlineCount').textContent = this.onlineUsers.length;
        } catch (error) {
            console.error('加载在线用户失败:', error);
            this.onlineUsers = [];
            this.renderOnlineUsers();
        }
    }

    // 从真实数据源获取在线用户
    async getRealOnlineUsersFromSource() {
        // 这里应该从实时数据源获取在线用户
        // 暂时返回空数组
        return [];
    }

    // 渲染商品列表
    renderProducts(products) {
        const grid = document.getElementById('productsGrid');
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
        card.innerHTML = `
            <div class="product-image">
                ${product.image || '📦'}
            </div>
            <div class="product-info">
                <h3 class="product-title">${product.title}</h3>
                <div class="product-price">¥${product.price}</div>
                <div class="product-meta">
                    <div class="product-seller">
                        <i class="fas fa-user"></i>
                        ${this.getShortEmail(product.seller)}
                    </div>
                    <div class="product-time">
                        <i class="far fa-clock"></i>
                        ${product.time}
                    </div>
                </div>
                <p class="product-description">${product.description}</p>
                <div class="product-actions">
                    <button class="chat-btn click-ripple" onclick="platform.startChat('${product.id}')">
                        <i class="fas fa-comment"></i>
                        联系卖家
                    </button>
                    <button class="like-btn click-ripple" onclick="platform.toggleLike('${product.id}')">
                        <i class="far fa-heart"></i>
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
                    ${user.email.charAt(0).toUpperCase()}
                </div>
                <div class="user-name">${this.getShortEmail(user.email)}</div>
                <div class="user-status"></div>
            `;
            usersList.appendChild(userItem);
        });
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
                    <h2>${product.title}</h2>
                    <button class="modal-close click-ripple" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="product-image-large">
                        ${product.image || '📦'}
                    </div>
                    <div class="product-details">
                        <div class="price-section">
                            <span class="price">¥${product.price}</span>
                        </div>
                        <div class="product-meta">
                            <div class="meta-item">
                                <i class="fas fa-user"></i>
                                <span>卖家: ${this.getShortEmail(product.seller)}</span>
                            </div>
                            <div class="meta-item">
                                <i class="far fa-clock"></i>
                                <span>发布时间: ${product.time}</span>
                            </div>
                        </div>
                        <div class="product-description-full">
                            <h4>商品描述</h4>
                            <p>${product.description}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary click-ripple" onclick="this.closest('.modal').remove()">
                        取消
                    </button>
                    <button class="btn-primary click-ripple" onclick="platform.startChat('${product.id}')">
                        <i class="fas fa-comment"></i>
                        联系卖家
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // 开始聊天
    startChat(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            // 保存当前聊天上下文
            const chatContext = {
                productId: product.id,
                productTitle: product.title,
                seller: product.seller,
                startTime: new Date().toISOString()
            };
            localStorage.setItem('currentChatContext', JSON.stringify(chatContext));

            // 跳转到聊天页面
            window.location.href = 'chat.html';
        }
    }

    // 点赞/取消点赞
    toggleLike(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            const likedProducts = JSON.parse(localStorage.getItem('likedProducts') || '{}');

            if (likedProducts[productId]) {
                // 取消点赞
                product.likes--;
                delete likedProducts[productId];
                this.showNotification('已取消点赞', 'info');
            } else {
                // 点赞
                product.likes = (product.likes || 0) + 1;
                likedProducts[productId] = true;
                this.showNotification('点赞成功', 'success');
            }

            localStorage.setItem('likedProducts', JSON.stringify(likedProducts));
            this.renderProducts(this.products);
        }
    }

    // 搜索商品
    searchProducts() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        if (searchTerm.trim() === '') {
            this.renderProducts(this.products);
            return;
        }

        const filtered = this.products.filter(product =>
            product.title.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );

        if (filtered.length === 0) {
            this.showNotification('没有找到相关商品', 'info');
        }

        this.renderProducts(filtered);
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

        if (filtered.length === 0) {
            this.showNotification('没有符合条件的商品', 'info');
        }

        this.renderProducts(filtered);
    }

    // 排序商品
    sortProducts() {
        const sortBy = document.getElementById('sortFilter').value;
        let sorted = [...this.products];

        switch (sortBy) {
            case 'price-low':
                sorted.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                sorted.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
            default:
                // 默认按ID倒序（模拟发布时间）
                sorted.sort((a, b) => b.id - a.id);
                break;
        }

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
        }
    }

    // 初始化点击特效
    initClickEffects() {
        document.addEventListener('click', function(e) {
            const clickableSelectors = [
                '.nav-link', '.social-btn', '.submit-btn', '.product-card',
                '.action-btn', '.user-item', '.publish-btn', '.search-btn',
                '.chat-btn', '.like-btn', '.quick-chat-btn', '.floating-chat-btn',
                '.modal-close', '.btn-primary', '.btn-secondary'
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
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // 工具函数：获取短邮箱
    getShortEmail(email) {
        return email ? email.split('@')[0] : '未知用户';
    }

    // 退出登录
    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userId');
        window.location.href = 'index.html';
    }
}

// 添加模态框样式
const modalStyles = document.createElement('style');
modalStyles.textContent = `
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 20px;
        backdrop-filter: blur(10px);
    }
    .modal-content {
        background: rgba(16, 18, 27, 0.95);
        border-radius: 15px;
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .modal-header h2 {
        margin: 0;
        color: white;
        font-size: 20px;
    }
    .modal-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.7);
        padding: 5px;
        border-radius: 5px;
        transition: all 0.3s ease;
    }
    .modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }
    .modal-body {
        padding: 20px;
    }
    .product-image-large {
        width: 100%;
        height: 200px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 64px;
        border-radius: 8px;
        margin-bottom: 20px;
    }
    .price-section {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
    }
    .price {
        font-size: 28px;
        font-weight: bold;
        color: #e74c3c;
    }
    .meta-item {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        color: rgba(255, 255, 255, 0.8);
    }
    .product-description-full h4 {
        margin: 20px 0 10px 0;
        color: white;
    }
    .product-description-full p {
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.6;
    }
    .modal-footer {
        display: flex;
        gap: 10px;
        padding: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .btn-primary, .btn-secondary {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
        font-weight: 600;
    }
    .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }
    .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.2);
    }
`;
document.head.appendChild(modalStyles);

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

// 请求通知权限
if ('Notification' in window) {
    Notification.requestPermission();
}
