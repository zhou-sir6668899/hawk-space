// 发布商品功能逻辑 - 修复版
class PublishManager {
    constructor() {
        this.currentUser = null;
        this.userId = null;
        this.init();
    }

    async init() {
        await this.checkLogin();
        this.setupEventListeners();
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

        this.currentUser = savedUser;
        this.userId = savedUserId || 'user-' + Date.now();
        document.getElementById('publishUserName').textContent = this.getShortEmail(this.currentUser);

        console.log('✅ 发布商品页面登录成功:', this.currentUser);
    }

    // 设置事件监听器
    setupEventListeners() {
        const form = document.getElementById('publishForm');
        const productTitle = document.getElementById('productTitle');
        const productDescription = document.getElementById('productDescription');

        // 表单提交
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // 字符计数
        if (productTitle) {
            productTitle.addEventListener('input', (e) => {
                document.getElementById('titleCount').textContent = e.target.value.length;
            });
        }

        if (productDescription) {
            productDescription.addEventListener('input', (e) => {
                document.getElementById('descCount').textContent = e.target.value.length;
            });
        }
    }

    // 处理表单提交
    async handleSubmit(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发布中...';

        try {
            const formData = this.getFormData();

            if (!this.validateForm(formData)) {
                throw new Error('请填写完整的商品信息');
            }

            console.log('📦 准备发布商品:', formData);

            // 发布商品
            const newProduct = await gitHubDataManager.addProduct(formData);

            console.log('✅ 商品发布成功:', newProduct);
            this.showNotification('商品发布成功！3秒后返回首页', 'success');

            // 3秒后自动跳转到首页
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 3000);

        } catch (error) {
            console.error('❌ 发布商品失败:', error);
            this.showNotification(error.message || '发布失败，请检查网络连接', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 立即发布';
        }
    }

    // 获取表单数据
    getFormData() {
        return {
            title: document.getElementById('productTitle').value.trim(),
            description: document.getElementById('productDescription').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value),
            category: document.getElementById('productCategory').value,
            location: document.getElementById('productLocation').value.trim() || '未知位置',
            seller: this.getShortEmail(this.currentUser),
            sellerEmail: this.currentUser,
            images: [] // 简化版本，先不支持图片上传
        };
    }

    // 验证表单
    validateForm(data) {
        if (!data.title || data.title.length < 2) {
            this.showNotification('请输入有效的商品标题（至少2个字）', 'error');
            return false;
        }

        if (!data.price || data.price < 1) {
            this.showNotification('请输入有效的价格（至少1元）', 'error');
            return false;
        }

        if (!data.category) {
            this.showNotification('请选择商品分类', 'error');
            return false;
        }

        if (!data.description || data.description.length < 10) {
            this.showNotification('请填写更详细的商品描述（至少10个字）', 'error');
            return false;
        }

        return true;
    }

    // 初始化点击特效
    initClickEffects() {
        document.addEventListener('click', function(e) {
            const clickableSelectors = [
                '.back-btn', '.btn-primary', '.btn-secondary'
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
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 70px;
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
}

// 添加波纹动画样式
const publishStyles = document.createElement('style');
publishStyles.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(publishStyles);

// 初始化发布管理器
const publishManager = new PublishManager();

console.log('📦 发布商品页面已加载完成');