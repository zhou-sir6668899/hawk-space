// 发布商品功能逻辑
class PublishManager {
    constructor() {
        this.currentUser = null;
        this.userId = null;
        this.selectedImages = [];
        this.init();
    }

    async init() {
        await this.checkLogin();
        this.loadDraft();
        this.setupEventListeners();
        this.initClickEffects();
        this.initMobileMenu();
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
        document.getElementById('userName').textContent = this.getShortEmail(this.currentUser);

        console.log('✅ 发布商品页面登录成功:', this.currentUser);
    }

    // 初始化移动端菜单
    initMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navMenu = document.getElementById('navMenu');

        if (mobileMenuBtn && navMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });

            const navLinks = navMenu.querySelectorAll('.nav-link, .dropdown-item');
            navLinks.forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                });
            });

            document.addEventListener('click', (e) => {
                if (!navMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
                    navMenu.classList.remove('active');
                }
            });
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        const form = document.getElementById('publishForm');
        const imageUploadArea = document.getElementById('imageUploadArea');
        const imageInput = document.getElementById('imageInput');
        const contactMethod = document.getElementById('contactMethod');
        const productTitle = document.getElementById('productTitle');
        const productDescription = document.getElementById('productDescription');

        // 表单提交
        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // 图片上传
        if (imageUploadArea) {
            imageUploadArea.addEventListener('click', () => imageInput.click());

            // 拖拽上传
            imageUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                imageUploadArea.classList.add('dragover');
            });

            imageUploadArea.addEventListener('dragleave', () => {
                imageUploadArea.classList.remove('dragover');
            });

            imageUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                imageUploadArea.classList.remove('dragover');
                this.handleImageDrop(e.dataTransfer.files);
            });
        }

        if (imageInput) {
            imageInput.addEventListener('change', (e) => this.handleImageSelect(e.target.files));
        }

        // 联系方式变化
        if (contactMethod) {
            contactMethod.addEventListener('change', (e) => this.toggleContactDetail(e.target.value));
        }

        // 字符计数
        if (productTitle) {
            productTitle.addEventListener('input', (e) => {
                document.getElementById('titleCount').textContent = e.target.value.length;
            });
        }

        if (productDescription) {
            const minLen = 10;
            productDescription.addEventListener('input', (e) => {
                const len = e.target.value.length;
                document.getElementById('descCount').textContent = len;
                const hint = document.getElementById('descHint');
                if (hint) {
                    hint.textContent = len < minLen ? `描述至少 ${minLen} 字，当前 ${len} 字` : '描述字数已达标';
                }
                // 自动保存草稿
                this.saveDraft();
            });
        }
    }

    // 处理图片选择
    async handleImageSelect(files) {
        if (!files || files.length === 0) {
            this.showNotification('未选择图片', 'info');
            return;
        }

        if (files.length + this.selectedImages.length > 5) {
            this.showNotification('最多只能上传5张图片', 'error');
            return;
        }

        const tasks = Array.from(files).map(async (file) => {
            if (file.type && !file.type.startsWith('image/')) {
                this.showNotification('请选择图片文件', 'error');
                return;
            }

            const lowerType = (file.type || '').toLowerCase();
            if (lowerType.includes('heic') || lowerType.includes('heif')) {
                const converted = await this.convertBlobToJpegDataUrl(file);
                if (converted) {
                    this.selectedImages.push({ file, dataUrl: converted });
                    return;
                } else {
                    this.showNotification('HEIC图片无法读取，请选择 JPG/PNG', 'error');
                    return;
                }
            }

            if (file.size > 5 * 1024 * 1024) { // 5MB
                this.showNotification('图片大小不能超过5MB', 'error');
                return;
            }

            const reader = new FileReader();
            const readPromise = new Promise((resolve) => {
                reader.onload = (e) => {
                    this.selectedImages.push({ file, dataUrl: e.target.result });
                    resolve();
                };
                reader.onerror = async () => {
                    const converted = await this.convertBlobToJpegDataUrl(file);
                    if (converted) {
                        this.selectedImages.push({ file, dataUrl: converted });
                    } else {
                        try {
                            const objectUrl = URL.createObjectURL(file);
                            const dataUrl = await this.objectUrlToDataUrl(objectUrl);
                            this.selectedImages.push({ file, dataUrl, displayUrl: objectUrl });
                        } catch {}
                    }
                    resolve();
                };
                reader.onabort = async () => {
                    const converted = await this.convertBlobToJpegDataUrl(file);
                    if (converted) {
                        this.selectedImages.push({ file, dataUrl: converted });
                    } else {
                        try {
                            const objectUrl = URL.createObjectURL(file);
                            const dataUrl = await this.objectUrlToDataUrl(objectUrl);
                            this.selectedImages.push({ file, dataUrl, displayUrl: objectUrl });
                        } catch {}
                    }
                    resolve();
                };
            });
            try { reader.readAsDataURL(file); } catch { reader.onerror(); }
            await readPromise;
        });
        for (const t of tasks) { await t; }
        this.updateImagePreview();

        // 重置输入值，以便重复选择同一文件也能触发变更事件
        const imageInputEl = document.getElementById('imageInput');
        if (imageInputEl) imageInputEl.value = '';
    }

    async convertBlobToJpegDataUrl(file) {
        try {
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement('canvas');
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(bitmap, 0, 0);
            return canvas.toDataURL('image/jpeg', 0.92);
        } catch (e) {
            return null;
        }
    }

    async objectUrlToDataUrl(objectUrl) {
        return new Promise((resolve, reject) => {
            try {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                    URL.revokeObjectURL(objectUrl);
                    resolve(dataUrl);
                };
                img.onerror = () => {
                    try { URL.revokeObjectURL(objectUrl); } catch {}
                    reject(new Error('image load error'));
                };
                img.src = objectUrl;
            } catch (err) {
                reject(err);
            }
        });
    }

    // 处理图片拖拽
    handleImageDrop(files) {
        this.handleImageSelect(files);
    }

    // 更新图片预览
    updateImagePreview() {
        const preview = document.getElementById('imagePreview');
        const uploadArea = document.getElementById('imageUploadArea');

        if (this.selectedImages.length === 0) {
            preview.innerHTML = '';
            uploadArea.style.display = 'block';
            return;
        }

        uploadArea.style.display = 'none';
        preview.innerHTML = '';

        this.selectedImages.forEach((image, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${image.displayUrl || image.dataUrl}" alt="预览图片">
                <button type="button" class="remove-image click-ripple" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            preview.appendChild(previewItem);
        });

        // 添加删除事件
        preview.querySelectorAll('.remove-image').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.removeImage(index);
            });
        });
    }

    // 删除图片
    removeImage(index) {
        this.selectedImages.splice(index, 1);
        this.updateImagePreview();
    }

    // 切换联系方式详情显示
    toggleContactDetail(method) {
        const detailGroup = document.getElementById('contactDetailGroup');
        const contactDetail = document.getElementById('contactDetail');

        if (method === 'chat') {
            detailGroup.style.display = 'none';
            contactDetail.required = false;
        } else {
            detailGroup.style.display = 'block';
            contactDetail.required = true;

            // 设置占位符
            const placeholders = {
                'phone': '请输入您的手机号码',
                'wechat': '请输入您的微信号',
                'qq': '请输入您的QQ号'
            };
            contactDetail.placeholder = placeholders[method] || '请输入您的联系方式';
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

            // 发布商品
            const newProduct = await gitHubDataManager.addProduct(formData);

            this.showNotification('商品发布成功！', 'success');

            // 3秒后跳转到首页
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 3000);

        } catch (error) {
            console.error('发布商品失败:', error);
            this.showNotification(error.message || '发布失败，请重试', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发布商品';
        }
    }

    // 获取表单数据
    getFormData() {
        const contactMethod = document.getElementById('contactMethod').value;
        const contactDetail = contactMethod === 'chat' ? '' : document.getElementById('contactDetail').value;

        const data = {
            title: document.getElementById('productTitle').value.trim(),
            description: document.getElementById('productDescription').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value),
            category: document.getElementById('productCategory').value,
            condition: document.getElementById('productCondition').value,
            location: document.getElementById('productLocation').value.trim(),
            contact: contactDetail,
            contactMethod: contactMethod,
            seller: this.getShortEmail(this.currentUser),
            sellerEmail: this.currentUser,
            images: this.selectedImages.map(img => img.dataUrl) // 存储为Base64
        };
        return data;
    }

    // 验证表单
    validateForm(data) {
        if (!data.title || data.title.length < 2) {
            this.showNotification('请输入有效的商品标题', 'error');
            return false;
        }

        if (!data.price || data.price <= 0) {
            this.showNotification('请输入有效的价格', 'error');
            return false;
        }

        if (!data.category) {
            this.showNotification('请选择商品分类', 'error');
            return false;
        }

        if (!data.description || data.description.length < 10) {
            this.showNotification(`商品描述至少 10 字（当前 ${data.description.length} 字）`, 'error');
            return false;
        }

        if (data.contactMethod !== 'chat' && !data.contact) {
            this.showNotification('请输入联系方式详情', 'error');
            return false;
        }

        return true;
    }

    // 草稿缓存
    saveDraft() {
        const draft = {
            title: document.getElementById('productTitle').value,
            description: document.getElementById('productDescription').value,
            price: document.getElementById('productPrice').value,
            category: document.getElementById('productCategory').value,
            condition: document.getElementById('productCondition').value,
            location: document.getElementById('productLocation').value,
            contactMethod: document.getElementById('contactMethod').value,
            contact: (document.getElementById('contactDetail') && document.getElementById('contactDetail').value) || ''
        };
        try { localStorage.setItem(`publishDraft_${this.currentUser}`, JSON.stringify(draft)); } catch {}
    }

    loadDraft() {
        try {
            const raw = localStorage.getItem(`publishDraft_${this.currentUser}`);
            if (!raw) return;
            const d = JSON.parse(raw);
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
            setVal('productTitle', d.title);
            setVal('productDescription', d.description);
            setVal('productPrice', d.price);
            setVal('productCategory', d.category);
            setVal('productCondition', d.condition);
            setVal('productLocation', d.location);
            setVal('contactMethod', d.contactMethod || 'chat');
            const contactDetail = document.getElementById('contactDetail');
            if (contactDetail) contactDetail.value = d.contact || '';
        } catch {}
    }

    // 初始化点击特效
    initClickEffects() {
        document.addEventListener('click', function(e) {
            const clickableSelectors = [
                '.nav-link', '.action-btn', '.user-btn', '.dropdown-item',
                '.btn-primary', '.btn-secondary', '.mobile-menu-btn',
                '.remove-image'
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

    // 退出登录
    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userId');
        window.location.href = 'index.html';
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
