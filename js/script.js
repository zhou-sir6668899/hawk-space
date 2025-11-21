// 粒子背景系统
class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particleCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: 0, y: 0 };

        this.init();
        this.animate();
    }

    init() {
        // 设置画布尺寸
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 鼠标移动追踪
        this.canvas.addEventListener('mousemove', (e) => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        // 创建粒子
        this.createParticles();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        const particleCount = 150;

        for (let i = 0; i < particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.1,
                depth: Math.random() * 3 + 1 // 深度值，用于空间感
            });
        }
    }

    animate() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach((particle, index) => {
            // 根据深度调整移动速度，创造空间感
            particle.x += particle.speedX * particle.depth;
            particle.y += particle.speedY * particle.depth;

            // 边界检查
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.y > this.canvas.height) particle.y = 0;
            if (particle.y < 0) particle.y = this.canvas.height;

            // 鼠标互动
            const dx = particle.x - this.mouse.x;
            const dy = particle.y - this.mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                particle.x += dx * 0.02;
                particle.y += dy * 0.02;
            }

            // 绘制粒子
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(74, 144, 226, ${particle.opacity})`;
            this.ctx.fill();

            // 绘制粒子间的连线
            for (let j = index + 1; j < this.particles.length; j++) {
                const nextParticle = this.particles[j];
                const distance = Math.sqrt(
                    Math.pow(particle.x - nextParticle.x, 2) +
                    Math.pow(particle.y - nextParticle.y, 2)
                );

                if (distance < 100) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(74, 144, 226, ${0.1 * (1 - distance / 100)})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.moveTo(particle.x, particle.y);
                    this.ctx.lineTo(nextParticle.x, nextParticle.y);
                    this.ctx.stroke();
                }
            }
        });

        requestAnimationFrame(() => this.animate());
    }
}

// ==== 新增：增强的缓存管理 ====
class CacheManager {
    constructor() {
        this.cacheVersion = '1.1';
        this.essentialData = [
            'user-profile',
            'login-history',
            'app-config'
        ];
    }

    // 预加载必要数据
    async preloadEssentialData(userEmail) {
        try {
            const cacheKey = `essential_data_${userEmail}`;
            const cached = this.getCache(cacheKey);

            if (cached && this.isCacheValid(cached)) {
                return cached.data;
            }

            // 并行加载必要数据
            const promises = this.essentialData.map(async (dataType) => {
                try {
                    const data = await this.fetchEssentialData(dataType, userEmail);
                    return { type: dataType, data };
                } catch (error) {
                    console.warn(`预加载 ${dataType} 失败:`, error);
                    return { type: dataType, data: null };
                }
            });

            const results = await Promise.allSettled(promises);
            const essentialData = {};

            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    essentialData[result.value.type] = result.value.data;
                }
            });

            // 缓存数据
            this.setCache(cacheKey, {
                data: essentialData,
                timestamp: new Date().toISOString(),
                version: this.cacheVersion
            });

            return essentialData;
        } catch (error) {
            console.error('预加载必要数据失败:', error);
            return {};
        }
    }

    async fetchEssentialData(dataType, userEmail) {
        // 根据数据类型从GitHub获取相应数据
        switch (dataType) {
            case 'user-profile':
                return await gitHubDataManager.getUserProfile(userEmail);
            case 'login-history':
                return await gitHubDataManager.getLoginHistory(userEmail);
            case 'app-config':
                return await gitHubDataManager.getFileContent('config/app-config.json');
            default:
                return null;
        }
    }

    // 缓存用户数据（替换原有的 cacheUserData 函数）
    cacheUserData(user, password) {
        const userCache = {
            id: user.id,
            email: user.email,
            password: password,
            username: user.username,
            lastUpdated: new Date().toISOString(),
            cacheVersion: this.cacheVersion
        };

        localStorage.setItem(`userCache_${user.email}`, JSON.stringify(userCache));
        this.cleanupExpiredCache();
    }

    // 获取缓存的用户数据（替换原有的 getCachedUser 函数）
    getCachedUser(email) {
        try {
            const cached = localStorage.getItem(`userCache_${email}`);
            if (!cached) return null;

            const userCache = JSON.parse(cached);

            // 检查缓存是否过期（7天）
            const cacheTime = new Date(userCache.lastUpdated);
            const now = new Date();
            const diffTime = Math.abs(now - cacheTime);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > 7 || userCache.cacheVersion !== this.cacheVersion) {
                localStorage.removeItem(`userCache_${email}`);
                return null;
            }

            return userCache;
        } catch (error) {
            console.error('读取用户缓存失败:', error);
            return null;
        }
    }

    getCache(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch {
            return null;
        }
    }

    setCache(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.warn('缓存设置失败:', error);
        }
    }

    isCacheValid(cachedData) {
        if (!cachedData || cachedData.version !== this.cacheVersion) {
            return false;
        }

        const cacheTime = new Date(cachedData.timestamp);
        const now = new Date();
        const diffHours = (now - cacheTime) / (1000 * 60 * 60);

        return diffHours < 24; // 24小时有效期
    }

    // 清理过期缓存（替换原有的 cleanupUserCache 函数）
    cleanupExpiredCache() {
        const keys = Object.keys(localStorage);
        const now = new Date();

        keys.forEach(key => {
            if (key.startsWith('essential_data_') || key.startsWith('userCache_')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data && data.timestamp) {
                        const cacheTime = new Date(data.timestamp);
                        const diffHours = (now - cacheTime) / (1000 * 60 * 60);
                        if (diffHours > 24 * 7) { // 7天以上
                            localStorage.removeItem(key);
                        }
                    }
                } catch {
                    // 无效数据，直接删除
                    localStorage.removeItem(key);
                }
            }
        });
    }

    // 后台更新用户数据
    async updateUserDataInBackground(email) {
        try {
            const users = await gitHubDataManager.getAllUsers();
            const latestUser = users.find(u => u.email === email);

            if (latestUser) {
                // 更新缓存
                const cached = this.getCachedUser(email);
                if (cached) {
                    this.cacheUserData(latestUser, cached.password);
                }
            }
        } catch (error) {
            console.log('后台更新用户数据失败:', error);
        }
    }
}

// 初始化缓存管理器
const cacheManager = new CacheManager();

// 初始化粒子系统
let particleSystem;

// 登录系统状态
let isLoginMode = true;

// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    // 初始化粒子背景
    particleSystem = new ParticleSystem();

    // 初始化登录系统
    initAuthSystem();

    // 添加鼠标移动放大效果
    initHoverEffects();

    // 清理过期缓存
    cacheManager.cleanupExpiredCache();
});

// 初始化认证系统
function initAuthSystem() {
    const switchMode = document.getElementById('switchMode');
    const switchText = document.getElementById('switchText');
    const submitBtn = document.getElementById('submitBtn');
    const authForm = document.getElementById('authForm');

    // 切换登录/注册模式
    switchMode.addEventListener('click', function(e) {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        if (isLoginMode) {
            submitBtn.querySelector('.btn-text').textContent = '登录';
            switchText.textContent = '没有账号？';
            switchMode.textContent = '立即注册';
        } else {
            submitBtn.querySelector('.btn-text').textContent = '注册';
            switchText.textContent = '已有账号？';
            switchMode.textContent = '立即登录';
        }

        // 重置表单
        authForm.reset();

        // 添加切换动画
        const loginPanel = document.querySelector('.login-panel');
        loginPanel.style.transform = 'scale(0.95)';
        setTimeout(() => {
            loginPanel.style.transform = 'scale(1)';
        }, 150);
    });

    // 表单提交
    authForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const loadingState = document.getElementById('loadingState');

        // 基本验证
        if (!email || !password) {
            showMessage('请输入邮箱和密码', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showMessage('请输入有效的邮箱地址', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('密码长度至少6位', 'error');
            return;
        }

        // 显示加载状态
        btnText.textContent = isLoginMode ? '登录中...' : '注册中...';
        submitBtn.disabled = true;
        loadingState.classList.add('show');

        try {
            await handleAuthRequest(email, password);
        } catch (error) {
            showMessage(error.message, 'error');
            createButtonEffect('error');
        } finally {
            // 恢复按钮状态
            btnText.textContent = isLoginMode ? '登录' : '注册';
            submitBtn.disabled = false;
            loadingState.classList.remove('show');
        }
    });
}

// 新增：请求位置权限并记录登录
async function requestLocationAndLogin(user, email) {
    try {
        // 显示位置权限请求提示
        showMessage('正在获取位置信息...', 'info');

        // 使用增强的登录记录方法（包含用户授权位置）
        const loginInfo = {
            email: email,
            userAgent: navigator.userAgent
        };

        const loginRecord = await gitHubDataManager.recordLoginWithUserLocation(user.id, loginInfo);

        // 根据位置来源显示不同消息
        if (loginRecord.locationSource === 'user-permission') {
            showMessage('✅ 登录成功！位置信息已记录', 'success');
        } else {
            showMessage('✅ 登录成功！使用IP位置信息', 'info');
        }

        createButtonEffect('success');
        createConfettiEffect();

        // 保存用户登录状态到本地存储
        localStorage.setItem('currentUser', email);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('lastLogin', new Date().toISOString());
        localStorage.setItem('lastLocation', JSON.stringify({
            location: loginRecord.location,
            source: loginRecord.locationSource,
            timestamp: new Date().toISOString()
        }));

        // 跳转到首页
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);

    } catch (error) {
    console.error('位置获取失败，使用基础登录:', error);

    // 位置获取失败时的备选方案 - 不再使用IP定位
    await fallbackLogin(user, email);
    }
}

// 备选登录方案（无位置信息）
// 备选登录方案（无位置信息）
async function fallbackLogin(user, email) {
    try {
        const loginInfo = {
            email: email,
            userAgent: navigator.userAgent
        };

        // 使用新的无IP定位的记录登录方法
        const loginRecord = {
            userId: user.id,
            userEmail: email,
            loginTime: new Date().toISOString(),
            userAgent: navigator.userAgent,
            location: '用户未授权位置信息',
            country: '未知',
            region: '未知',
            city: '未知',
            status: 'success',
            locationPermission: 'denied'
        };

        // 这里需要调用一个不依赖IP定位的简单记录方法
        // 或者直接跳过位置记录，只更新最后登录时间
        await gitHubDataManager.updateUserLastLogin(user.id);

        showMessage('登录成功！', 'success');
        createButtonEffect('success');
        createConfettiEffect();

        localStorage.setItem('currentUser', email);
        localStorage.setItem('userId', user.id);
        localStorage.setItem('lastLogin', new Date().toISOString());

        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
    } catch (fallbackError) {
        console.log('备选登录记录失败，但不影响登录:', fallbackError);
        // 即使记录失败也允许登录
        showMessage('登录成功！', 'success');
        createButtonEffect('success');

        localStorage.setItem('currentUser', email);
        localStorage.setItem('userId', user.id);

        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
    }
}

async function handleAuthRequest(email, password) {
    if (isLoginMode) {
        try {
            // 检查是否有缓存的用户数据
            const cachedUser = cacheManager.getCachedUser(email);
            if (cachedUser && cachedUser.password === password) {
                // 使用缓存数据快速登录
                console.log('✅ 使用缓存用户数据快速登录');
                await handleQuickLogin(cachedUser, email);
                return;
            }

            // 正常GitHub API登录流程
            const user = await gitHubDataManager.verifyUser(email, password);

            // 缓存用户数据
            cacheManager.cacheUserData(user, password);

            // 请求位置权限并记录登录历史
            await requestLocationAndLogin(user, email);

        } catch (error) {
            throw new Error(error.message);
        }
    } else {
        // 使用GitHub API注册
        try {
            const userData = {
                email: email,
                password: password
            };

            const newUser = await gitHubDataManager.registerUser(userData);

            showMessage('注册成功，请登录', 'success');
            createButtonEffect('success');
            createConfettiEffect();

            // 自动切换到登录模式
            setTimeout(() => {
                isLoginMode = true;
                document.querySelector('.btn-text').textContent = '登录';
                document.getElementById('switchText').textContent = '没有账号？';
                document.getElementById('switchMode').textContent = '立即注册';
                document.getElementById('password').value = '';
            }, 2000);

        } catch (error) {
            throw new Error(error.message);
        }
    }
}

// 快速登录处理
async function handleQuickLogin(cachedUser, email) {
    showMessage('快速登录成功！', 'success');
    createButtonEffect('success');

    // 异步预加载必要数据
    cacheManager.preloadEssentialData(email).then(essentialData => {
        console.log('✅ 必要数据预加载完成', essentialData);
    }).catch(error => {
        console.log('预加载数据失败，但不影响主要功能:', error);
    });

    // 异步更新用户数据
    cacheManager.updateUserDataInBackground(email);

    localStorage.setItem('currentUser', email);
    localStorage.setItem('userId', cachedUser.id);
    localStorage.setItem('lastLogin', new Date().toISOString());

    setTimeout(() => {
        window.location.href = 'home.html';
    }, 1000);
}


// 邮箱验证
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 显示消息
function showMessage(message, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type} show`;

    setTimeout(() => {
        messageEl.classList.remove('show');
    }, 3000);
}

// 按钮特效
function createButtonEffect(type) {
    const submitBtn = document.getElementById('submitBtn');

    if (type === 'success') {
        submitBtn.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
        setTimeout(() => {
            submitBtn.style.background = 'linear-gradient(45deg, #4a90e2, #8e44ad)';
        }, 1000);
    } else if (type === 'error') {
        submitBtn.style.animation = 'shake 0.5s ease-in-out';
        setTimeout(() => {
            submitBtn.style.animation = '';
        }, 500);
    }
}

// 庆祝特效
function createConfettiEffect() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4a90e2', '#8e44ad', '#27ae60', '#e74c3c']
    });
}

// 第三方登录
function socialLogin(platform) {
    showMessage(`${getPlatformName(platform)}登录功能开发中`, 'info');
    createButtonEffect('success');
}

function getPlatformName(platform) {
    const names = {
        'qq': 'QQ',
        'wechat': '微信',
        'github': 'GitHub',
        'phone': '手机'
    };
    return names[platform] || platform;
}

// 鼠标悬停效果
function initHoverEffects() {
    const interactiveElements = document.querySelectorAll('.input-group, .social-btn, .submit-btn, .switch-link');

    interactiveElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.02)';
        });

        element.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
}

// 添加shake动画
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// GitHub连接状态指示器
function initGitHubStatus() {
    const statusIndicator = document.createElement('div');
    statusIndicator.id = 'githubStatus';
    statusIndicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        padding: 5px 10px;
        border-radius: 15px;
        font-size: 12px;
        z-index: 1000;
        background: rgba(0,0,0,0.7);
        color: white;
        transition: all 0.3s ease;
    `;
    statusIndicator.textContent = '🔴 GitHub连接中...';
    document.body.appendChild(statusIndicator);

    // 测试GitHub连接
    if (typeof gitHubDataManager === 'undefined') {
        console.warn('⚠️ gitHubDataManager 未就绪，延迟初始化...');
        setTimeout(initGitHubStatus, 500);
        return;
    }

    gitHubDataManager.testConnection().then(success => {
        statusIndicator.textContent = success ? '🟢 GitHub已连接' : '🔴 GitHub连接失败';
        statusIndicator.style.background = success ? 'rgba(46, 204, 113, 0.8)' : 'rgba(231, 76, 60, 0.8)';

        if (!success) {
            showMessage('GitHub连接失败，使用本地模式', 'error');
        }
    });
}

// 初始化GitHub状态
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initGitHubStatus, 2000);
});