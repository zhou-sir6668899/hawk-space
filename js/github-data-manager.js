// GitHub数据管理类 - 测试版本（Token在前端）
class GitHubDataManager {
    constructor() {
        // 使用你的GitHub信息 - 直接在前端测试
        this.dataRepo = 'zhou-str6668899/web-user-data'; // 数据仓库
        this.token = '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'; // 你的token - 后期要移除！
        this.baseURL = 'https://api.github.com/repos/';
        this.headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        console.warn('⚠️ 注意：Token在前端代码中，仅用于测试！');
    }

    // 生成UUID
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // 安全的Base64编码（处理中文字符）
    safeBtoa(str) {
        try {
            // 如果是对象，先转为JSON字符串
            if (typeof str !== 'string') {
                str = JSON.stringify(str);
            }
            return btoa(unescape(encodeURIComponent(str)));
        } catch (error) {
            console.error('Base64编码失败:', error);
            // 降级方案：只编码ASCII字符
            return btoa(str.replace(/[^\x00-\x7F]/g, ''));
        }
    }

    // 安全的Base64解码
    safeAtob(str) {
        try {
            return decodeURIComponent(escape(atob(str)));
        } catch (error) {
            console.error('Base64解码失败:', error);
            return atob(str);
        }
    }

    // 获取文件内容
    async getFileContent(filePath) {
        try {
            console.log(`📁 获取文件: ${filePath}`);
            const response = await fetch(`${this.baseURL}${this.dataRepo}/contents/${filePath}`, {
                method: 'GET',
                headers: this.headers
            });

            if (response.status === 404) {
                console.log(`❌ 文件不存在: ${filePath}，创建默认数据`);
                // 返回空数据
                const emptyData = this.getEmptyDataForFile(filePath);
                return {
                    content: this.safeBtoa(emptyData),
                    sha: null
                };
            }

            if (!response.ok) {
                throw new Error(`GitHub API错误: ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ 获取文件成功: ${filePath}`);
            return data;
        } catch (error) {
            console.error('❌ 获取文件失败:', error);
            // 返回默认数据
            const emptyData = this.getEmptyDataForFile(filePath);
            return {
                content: this.safeBtoa(emptyData),
                sha: null
            };
        }
    }

    // 根据文件路径返回空数据
    getEmptyDataForFile(filePath) {
        switch(filePath) {
            case 'user/users.json':
                return {
                    users: [
                        {
                            "id": "1",
                            "email": "hawk@qq.com",
                            "password": "123456",
                            "username": "管理员",
                            "registerDate": "2024-01-01T10:00:00Z",
                            "lastLogin": null,
                            "loginCount": 0,
                            "status": "active",
                            "role": "admin",
                            "avatar": "",
                            "verified": true
                        }
                    ]
                };
            case 'sessions/active-sessions.json':
                return { sessions: [] };
            case 'config/repository.config.json':
                return {
                    repository: {
                        name: "web-user-data",
                        owner: "zhou-str6668899",
                        branch: "main"
                    },
                    security: {
                        adminEmails: ["hawk@qq.com"],
                        maxLoginAttempts: 5
                    }
                };
            default:
                return {};
        }
    }

    // 更新文件内容
    async updateFile(filePath, content, sha) {
        try {
            console.log(`🔄 更新文件: ${filePath}`, content);
            const response = await fetch(`${this.baseURL}${this.dataRepo}/contents/${filePath}`, {
                method: 'PUT',
                headers: this.headers,
                body: JSON.stringify({
                    message: `Update ${filePath} - ${new Date().toISOString()}`,
                    content: this.safeBtoa(content),
                    sha: sha
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API错误: ${response.status} - ${errorData.message}`);
            }

            const result = await response.json();
            console.log('✅ 文件更新成功:', result);
            return result;
        } catch (error) {
            console.error('❌ 更新文件失败:', error);
            throw error;
        }
    }

    // 用户认证相关方法
    async verifyUser(email, password) {
        try {
            console.log(`🔐 验证用户: ${email}`);
            const usersFile = await this.getFileContent('user/users.json');
            const usersContent = JSON.parse(this.safeAtob(usersFile.content));

            const user = usersContent.users.find(u => u.email === email && u.status === 'active');
            if (!user) {
                throw new Error('用户不存在或未激活，请先注册');
            }

            // 验证密码
            if (user.password !== password) {
                throw new Error('密码错误');
            }

            console.log(`✅ 用户验证成功: ${email}`);
            return user;
        } catch (error) {
            console.error('❌ 验证用户失败:', error);
            throw error;
        }
    }

    async registerUser(userData) {
        try {
            console.log(`📝 注册用户: ${userData.email}`);
            const usersFile = await this.getFileContent('user/users.json');
            const usersContent = JSON.parse(this.safeAtob(usersFile.content));

            // 检查邮箱是否已存在
            const existingUser = usersContent.users.find(user => user.email === userData.email);
            if (existingUser) {
                throw new Error('邮箱已被注册');
            }

            // 创建新用户
            const newUser = {
                id: this.generateUUID(),
                email: userData.email,
                password: userData.password,
                username: userData.email.split('@')[0],
                registerDate: new Date().toISOString(),
                lastLogin: null,
                loginCount: 0,
                status: 'active',
                role: 'user',
                avatar: '',
                verified: false
            };

            usersContent.users.push(newUser);

            // 更新文件
            await this.updateFile('user/users.json', usersContent, usersFile.sha);

            console.log(`✅ 用户注册成功: ${userData.email}`);
            return newUser;
        } catch (error) {
            console.error('❌ 注册用户失败:', error);
            throw error;
        }
    }

    // 记录登录历史
    async recordLogin(userId, loginInfo) {
        try {
            console.log(`📊 记录登录历史: ${userId}`);
            const sessionsFile = await this.getFileContent('sessions/active-sessions.json');
            const sessionsContent = JSON.parse(this.safeAtob(sessionsFile.content)) || { sessions: [] };

            // 获取IP地址
            const ipAddress = await this.getIPAddress();

            const loginRecord = {
                userId: userId,
                sessionId: this.generateUUID(),
                loginTime: new Date().toISOString(),
                ipAddress: ipAddress,
                userAgent: navigator.userAgent,
                deviceType: this.getDeviceType(),
                location: '自动获取中...'
            };

            sessionsContent.sessions.unshift(loginRecord);

            // 只保留最近100条记录
            if (sessionsContent.sessions.length > 100) {
                sessionsContent.sessions = sessionsContent.sessions.slice(0, 100);
            }

            await this.updateFile('sessions/active-sessions.json', sessionsContent, sessionsFile.sha);

            // 更新用户最后登录时间
            await this.updateUserLastLogin(userId);

            console.log('✅ 登录历史记录成功');
            return loginRecord;
        } catch (error) {
            console.error('❌ 记录登录历史失败:', error);
            throw error;
        }
    }

    // 获取IP地址
    async getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return '未知';
        }
    }

    // 更新用户最后登录时间
    async updateUserLastLogin(userId) {
        try {
            const usersFile = await this.getFileContent('user/users.json');
            const usersContent = JSON.parse(this.safeAtob(usersFile.content));

            const userIndex = usersContent.users.findIndex(user => user.id === userId);
            if (userIndex !== -1) {
                usersContent.users[userIndex].lastLogin = new Date().toISOString();
                usersContent.users[userIndex].loginCount += 1;

                await this.updateFile('user/users.json', usersContent, usersFile.sha);
            }
        } catch (error) {
            console.error('更新用户最后登录时间失败:', error);
        }
    }

    // 获取设备类型
    getDeviceType() {
        const ua = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    // 管理员功能
    async getAllUsers() {
        try {
            const usersFile = await this.getFileContent('user/users.json');
            return JSON.parse(this.safeAtob(usersFile.content)).users;
        } catch (error) {
            console.error('获取用户数据失败:', error);
            throw error;
        }
    }

    async getLoginHistory() {
        try {
            const sessionsFile = await this.getFileContent('sessions/active-sessions.json');
            return JSON.parse(this.safeAtob(sessionsFile.content)).sessions || [];
        } catch (error) {
            console.error('获取登录历史失败:', error);
            throw error;
        }
    }

    async isAdmin(email) {
        try {
            const configFile = await this.getFileContent('config/repository.config.json');
            const config = JSON.parse(this.safeAtob(configFile.content));
            return config.security.adminEmails.includes(email);
        } catch (error) {
            console.error('检查管理员权限失败:', error);
            return false;
        }
    }

    // 测试连接
    async testConnection() {
        try {
            console.log('🧪 测试GitHub连接...');
            const usersFile = await this.getFileContent('user/users.json');
            console.log('✅ GitHub连接测试成功！');
            return true;
        } catch (error) {
            console.error('❌ GitHub连接测试失败:', error);
            return false;
        }
    }
}

// 创建全局实例
const gitHubDataManager = new GitHubDataManager();

// 自动测试连接
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        gitHubDataManager.testConnection();
    }, 1000);
});