// GitHub数据管理类 - 安全版本
class GitHubDataManager {
    constructor() {
        // Token通过GitHub Actions在构建时注入
        this.dataRepo = 'zhou-sir6668899/web-user-data';
        this.token = 'GH_DATA_TOKEN_PLACEHOLDER'; // 会被GitHub Actions替换
        this.baseURL = 'https://api.github.com/repos/';
        this.headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        console.log('🔒 安全版GitHub数据管理器已加载');
    }

    // 安全的Base64编码
    safeBtoa(data) {
        try {
            const str = typeof data === 'string' ? data : JSON.stringify(data);
            return btoa(unescape(encodeURIComponent(str)));
        } catch (error) {
            console.error('Base64编码失败:', error);
            return btoa(JSON.stringify(data));
        }
    }

    // 安全的Base64解码
    safeAtob(encoded) {
        try {
            return JSON.parse(decodeURIComponent(escape(atob(encoded))));
        } catch (error) {
            console.error('Base64解码失败:', error);
            return JSON.parse(atob(encoded));
        }
    }

    async getFileContent(filePath) {
        try {
            console.log(`📁 获取文件: ${filePath}`);
            const response = await fetch(`${this.baseURL}${this.dataRepo}/contents/${filePath}`, {
                method: 'GET',
                headers: this.headers
            });

            if (response.status === 404) {
                console.log(`文件不存在: ${filePath}`);
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
            const emptyData = this.getEmptyDataForFile(filePath);
            return {
                content: this.safeBtoa(emptyData),
                sha: null
            };
        }
    }

    getEmptyDataForFile(filePath) {
        const data = {
            'user/users.json': {
                users: []
            },
            'sessions/active-sessions.json': { sessions: [] },
            'config/repository.config.json': {
                repository: { name: "web-user-data", owner: "zhou-sir6668899", branch: "main" },
                security: { adminEmails: ["hawk@qq.com"], maxLoginAttempts: 5 }
            }
        };
        return data[filePath] || {};
    }

    async updateFile(filePath, content, sha) {
        try {
            console.log(`🔄 更新文件: ${filePath}`);
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
            console.log('✅ 文件更新成功');
            return result;
        } catch (error) {
            console.error('❌ 更新文件失败:', error);
            throw error;
        }
    }

    async verifyUser(email, password) {
        try {
            const usersFile = await this.getFileContent('user/users.json');
            const usersContent = this.safeAtob(usersFile.content);

            const user = usersContent.users.find(u => u.email === email && u.status === 'active');
            if (!user) {
                throw new Error('用户不存在或未激活，请先注册');
            }

            if (user.password !== password) {
                throw new Error('密码错误');
            }

            return user;
        } catch (error) {
            throw error;
        }
    }

    async registerUser(userData) {
        try {
            const usersFile = await this.getFileContent('user/users.json');
            const usersContent = this.safeAtob(usersFile.content);

            if (usersContent.users.find(user => user.email === userData.email)) {
                throw new Error('邮箱已被注册');
            }

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
            await this.updateFile('user/users.json', usersContent, usersFile.sha);

            return newUser;
        } catch (error) {
            throw error;
        }
    }

    async recordLogin(userId, loginInfo) {
        try {
            const sessionsFile = await this.getFileContent('sessions/active-sessions.json');
            const sessionsContent = this.safeAtob(sessionsFile.content) || { sessions: [] };

            const loginRecord = {
                userId: userId,
                sessionId: this.generateUUID(),
                loginTime: new Date().toISOString(),
                ipAddress: await this.getIPAddress(),
                userAgent: navigator.userAgent,
                deviceType: this.getDeviceType(),
                location: '自动获取中...'
            };

            sessionsContent.sessions.unshift(loginRecord);

            if (sessionsContent.sessions.length > 100) {
                sessionsContent.sessions = sessionsContent.sessions.slice(0, 100);
            }

            await this.updateFile('sessions/active-sessions.json', sessionsContent, sessionsFile.sha);
            await this.updateUserLastLogin(userId);

            return loginRecord;
        } catch (error) {
            console.error('记录登录历史失败:', error);
            throw error;
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async getIPAddress() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return '未知';
        }
    }

    async updateUserLastLogin(userId) {
        try {
            const usersFile = await this.getFileContent('user/users.json');
            const usersContent = this.safeAtob(usersFile.content);

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

    getDeviceType() {
        const ua = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    async getAllUsers() {
        try {
            const usersFile = await this.getFileContent('user/users.json');
            return this.safeAtob(usersFile.content).users;
        } catch (error) {
            throw error;
        }
    }

    async getLoginHistory() {
        try {
            const sessionsFile = await this.getFileContent('sessions/active-sessions.json');
            return this.safeAtob(sessionsFile.content).sessions || [];
        } catch (error) {
            throw error;
        }
    }

    async isAdmin(email) {
        try {
            const configFile = await this.getFileContent('config/repository.config.json');
            const config = this.safeAtob(configFile.content);
            return config.security.adminEmails.includes(email);
        } catch (error) {
            return false;
        }
    }

    async testConnection() {
        try {
            console.log('🧪 测试GitHub连接...');
            await this.getFileContent('user/users.json');
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

