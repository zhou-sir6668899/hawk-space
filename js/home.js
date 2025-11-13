// 首页功能逻辑
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
        this.loadProducts();
        this.loadOnlineUsers();
        this.setupEventListeners();
        this.startChatUpdates();
    }

    // 检查登录状态 - 修改为验证GitHub数据
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

            // 检查是否是管理员
            const isAdmin = await gitHubDataManager.isAdmin(this.currentUser);
            if (isAdmin) {
                this.addAdminFeatures();
            }

            console.log('✅ 用户验证成功:', this.currentUser);

        } catch (error) {
            console.error('❌ 用户验证失败:', error);
            this.showNotification('登录状态已过期，请重新登录', 'error');
            setTimeout(() => {
                this.logout();
            }, 2000);
        }
    }

    // 添加管理员功能
    addAdminFeatures() {
        const dropdownMenu = document.querySelector('.dropdown-menu');
        const adminItem = document.createElement('a');
        adminItem.href = 'admin.html';
        adminItem.className = 'dropdown-item';
        adminItem.innerHTML = '<i class="fas fa-shield-alt"></i>管理员面板';

        // 插入到第一个位置
        dropdownMenu.insertBefore(adminItem, dropdownMenu.firstChild);

        // 添加管理员标识
        const userBtn = document.getElementById('userBtn');
        const adminBadge = document.createElement('span');
        adminBadge.className = 'admin-badge';
        adminBadge.textContent = '管理';
        adminBadge.style.cssText = `
            background: #e74c3c;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 10px;
            margin-left: 5px;
        `;
        userBtn.querySelector('span').appendChild(adminBadge);

        console.log('🔧 管理员功能已启用');
    }

    // 加载商品数据
    loadProducts() {
        // 从本地存储加载或使用示例数据
        const savedProducts = localStorage.getItem('secondhandProducts');

        if (savedProducts) {
            this.products = JSON.parse(savedProducts);
        } else {
            // 示例商品数据
            this.products = [
                {
                    id: 1,
                    title: 'iPhone 13 Pro 256GB',
                    price: 4500,
                    category: 'electronics',
                    image: '📱',
                    seller: 'tech_lover@email.com',
                    location: '北京市海淀区',
                    time: '2小时前',
                    description: '99新，无划痕，全套配件齐全',
                    likes: 23,
                    status: 'available'
                },
                {
                    id: 2,
                    title: '索尼WH-1000XM4 降噪耳机',
                    price: 1200,
                    category: 'electronics',
                    image: '🎧',
                    seller: 'audio_fan@email.com',
                    location: '上海市浦东新区',
                    time: '5小时前',
                    description: '9成新，音质完美，降噪效果出色',
                    likes: 15,
                    status: 'available'
                },
                {
                    id: 3,
                    title: 'Nike Air Jordan 1 运动鞋',
                    price: 800,
                    category: 'clothing',
                    image: '👟',
                    seller: 'sneaker_head@email.com',
                    location: '广州市天河区',
                    time: '1天前',
                    description: '42码，仅试穿，几乎全新',
                    likes: 31,
                    status: 'available'
                },
                {
                    id: 4,
                    title: '宜家书桌 120x60cm',
                    price: 200,
                    category: 'home',
                    image: '🪑',
                    seller: 'home_decor@email.com',
                    location: '深圳市南山区',
                    time: '3天前',
                    description: '白色，使用一年，状况良好',
                    likes: 8,
                    status: 'available'
                },
                {
                    id: 5,
                    title: 'Java编程思想 第4版',
                    price: 50,
                    category: 'books',
                    image: '📚',
                    seller: 'book_worm@email.com',
                    location: '杭州市西湖区',
                    time: '1周前',
                    description: '正版，无笔记，保存完好',
                    likes: 12,
                    status: 'available'
                },
                {
                    id: 6,
                    title: '佳能 EOS R6 微单相机',
                    price: 12000,
                    category: 'electronics',
                    image: '📷',
                    seller: 'photo_pro@email.com',
                    location: '成都市武侯区',
                    time: '2天前',
                    description: '专业级微单，快门次数5000+',
                    likes: 45,
                    status: 'available'
                }
            ];
            this.saveProducts();
        }

        this.renderProducts(this.products);
    }

    // 渲染商品列表
    renderProducts(products) {
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = '';

        if (products.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>暂无商品</h3>
                    <p>成为第一个发布商品的人吧！</p>
                    <button class="publish-btn" onclick="location.href='publish.html'">
                        发布商品
                    </button>
                </div>
            `;
            return;
        }

        products.forEach(product => {
            const productCard = this.createProductCard(product);
            grid.appendChild(productCard);
        });
    }

    // 创建商品卡片
    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <div class="product-image">
                ${product.image}
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
                    <button class="chat-btn" onclick="platform.startChat(${product.id})">
                        <i class="fas fa-comment"></i>
                        联系卖家
                    </button>
                    <button class="like-btn" onclick="platform.toggleLike(${product.id})">
                        <i class="far fa-heart"></i>
                        <span class="like-count">${product.likes}</span>
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
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="product-image-large">
                        ${product.image}
                    </div>
                    <div class="product-details">
                        <div class="price-section">
                            <span class="price">¥${product.price}</span>
                            <span class="original-price">¥${Math.round(product.price * 1.5)}</span>
                        </div>
                        <div class="product-meta">
                            <div class="meta-item">
                                <i class="fas fa-user"></i>
                                <span>卖家: ${product.seller}</span>
                            </div>
                            <div class="meta-item">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>位置: ${product.location}</span>
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
                    <button class="btn-secondary" onclick="this.closest('.modal').remove()">
                        取消
                    </button>
                    <button class="btn-primary" onclick="platform.startChat(${product.id})">
                        <i class="fas fa-comment"></i>
                        联系卖家
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // 添加模态框样式
        if (!document.querySelector('#modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'modal-styles';
            styles.textContent = `
                .modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 20px;
                }
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #e1e5e9;
                }
                .modal-header h2 {
                    margin: 0;
                    color: #333;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #666;
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
                .original-price {
                    font-size: 16px;
                    color: #999;
                    text-decoration: line-through;
                }
                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 8px;
                    color: #666;
                }
                .product-description-full h4 {
                    margin: 20px 0 10px 0;
                    color: #333;
                }
                .modal-footer {
                    display: flex;
                    gap: 10px;
                    padding: 20px;
                    border-top: 1px solid #e1e5e9;
                }
                .btn-primary, .btn-secondary {
                    flex: 1;
                    padding: 12px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.3s ease;
                }
                .btn-primary {
                    background: #4a90e2;
                    color: white;
                }
                .btn-primary:hover {
                    background: #357abd;
                }
                .btn-secondary {
                    background: #f8f9fa;
                    color: #666;
                    border: 1px solid #e1e5e9;
                }
                .btn-secondary:hover {
                    background: #e9ecef;
                }
            `;
            document.head.appendChild(styles);
        }
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
            } else {
                // 点赞
                product.likes++;
                likedProducts[productId] = true;
            }

            localStorage.setItem('likedProducts', JSON.stringify(likedProducts));
            this.saveProducts();
            this.renderProducts(this.products);
        }
    }

    // 搜索商品
    searchProducts() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const filtered = this.products.filter(product =>
            product.title.toLowerCase().includes(searchTerm) ||
            product.description.toLowerCase().includes(searchTerm)
        );
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

    // 加载在线用户
    loadOnlineUsers() {
        // 模拟在线用户数据
        this.onlineUsers = [
            { email: 'user1@email.com', status: 'online', lastActive: new Date() },
            { email: 'user2@email.com', status: 'online', lastActive: new Date() },
            { email: 'user3@email.com', status: 'online', lastActive: new Date() },
            { email: 'tech_lover@email.com', status: 'online', lastActive: new Date() },
            { email: 'audio_fan@email.com', status: 'online', lastActive: new Date() }
        ];

        this.renderOnlineUsers();
        document.getElementById('onlineCount').textContent = this.onlineUsers.length;
    }

    // 渲染在线用户列表
    renderOnlineUsers() {
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';

        this.onlineUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
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

    // 更新用户状态
    updateUserStatus(status) {
        // 在实际应用中，这里应该调用后端API更新用户状态
        console.log(`用户 ${this.currentUser} 状态更新为: ${status}`);
    }

    // 开始聊天更新
    startChatUpdates() {
        // 模拟新消息通知
        setInterval(() => {
            const hasNewMessages = Math.random() > 0.7;
            if (hasNewMessages) {
                this.showNewMessageNotification();
            }
        }, 30000); // 每30秒检查一次
    }

    // 显示新消息通知
    showNewMessageNotification() {
        const badge = document.getElementById('chatBadge');
        const currentCount = parseInt(badge.textContent) || 0;
        badge.textContent = currentCount + 1;
        badge.style.display = 'block';

        // 显示桌面通知（如果支持）
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('二手集市', {
                body: '您有新消息',
                icon: '/favicon.ico'
            });
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
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 2000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
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
        return email.split('@')[0];
    }

    // 保存商品数据
    saveProducts() {
        localStorage.setItem('secondhandProducts', JSON.stringify(this.products));
    }

    // 退出登录
    logout() {
        this.updateUserStatus('offline');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userId');
        window.location.href = 'index.html';
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
}

// 添加空状态样式
const emptyStateStyles = document.createElement('style');
emptyStateStyles.textContent = `
    .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 60px 20px;
        color: #666;
    }
    .empty-state i {
        font-size: 64px;
        margin-bottom: 20px;
        color: #ddd;
    }
    .empty-state h3 {
        margin-bottom: 10px;
        color: #999;
    }
    .empty-state p {
        margin-bottom: 20px;
    }
`;
document.head.appendChild(emptyStateStyles);

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