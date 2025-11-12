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

// 初始化粒子系统
let particleSystem;

// 登录系统状态
let isLoginMode = true;

// 云开发应用实例
let cloudbaseApp = null;

// 初始化函数
document.addEventListener('DOMContentLoaded', function() {
    // 初始化粒子背景
    particleSystem = new ParticleSystem();

    // 初始化云开发
    initCloudBase();

    // 初始化登录系统
    initAuthSystem();

    // 添加鼠标移动放大效果
    initHoverEffects();
});

// 修复的初始化函数
function initCloudBase() {
    try {
        console.log('🔧 初始化云开发...');

        // 使用腾讯官方SDK (tcb)
        if (typeof tcb === 'undefined') {
            console.log('❌ 腾讯云SDK未加载，使用本地模式');
            cloudbaseApp = null;
            return;
        }

        cloudbaseApp = tcb.init({
            env: "cloud1-Qgihwa96tf5bee",
            region: "ap-shanghai"
        });

        console.log('✅ 云开发初始化成功');

    } catch (error) {
        console.error('❌ 云开发初始化失败:', error);
        cloudbaseApp = null;
    }
}

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

        try {
            if (isLoginMode) {
                await handleLogin(email, password);
            } else {
                await handleRegister(email, password);
            }
        } catch (error) {
            showMessage('网络请求失败，请重试', 'error');
            createButtonEffect('error');
        } finally {
            // 恢复按钮状态
            btnText.textContent = isLoginMode ? '登录' : '注册';
            submitBtn.disabled = false;
        }
    });
}

// 处理登录
async function handleLogin(email, password) {
    if (!cloudbaseApp) {
        showMessage('云服务未初始化', 'error');
        return;
    }

    try {
        const result = await cloudbaseApp.callFunction({
            name: "login",
            data: { email, password }
        });

        if (result.result.success) {
            showMessage('登录成功！', 'success');
            createButtonEffect('success');
            createConfettiEffect();

            // 保存用户信息到本地存储
            localStorage.setItem('currentUser', JSON.stringify(result.result.data));

            // 检查是否是管理员
            if (email === 'admin@quantum.com') {
                localStorage.setItem('isAdmin', 'true');
            }

            // 跳转到首页
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
        } else {
            showMessage(result.result.message, 'error');
            createButtonEffect('error');
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        showMessage('登录失败，请检查网络连接', 'error');
        createButtonEffect('error');
    }
}

// 处理注册
async function handleRegister(email, password) {
    if (!cloudbaseApp) {
        showMessage('云服务未初始化', 'error');
        return;
    }

    try {
        const result = await cloudbaseApp.callFunction({
            name: "register",
            data: {
                email,
                password,
                name: email.split('@')[0] // 默认用户名为邮箱前缀
            }
        });

        if (result.result.success) {
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
        } else {
            showMessage(result.result.message, 'error');
            createButtonEffect('error');
        }
    } catch (error) {
        console.error('注册请求失败:', error);
        showMessage('注册失败，请检查网络连接', 'error');
        createButtonEffect('error');
    }
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