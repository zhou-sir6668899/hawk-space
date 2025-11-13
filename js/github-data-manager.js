class GitHubDataManager {
    constructor() {
        this.dataRepo = 'zhou-str6668899/web-user-data';
        this.token = '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'; // 🔥 替换为你的真实Token
        this.baseURL = 'https://api.github.com/repos/';
        this.headers = {
            'Authorization': `token ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        console.log('🚀 手动版GitHub数据管理器已加载');
    }

    safeBtoa(data) {
        const str = typeof data === 'string' ? data : JSON.stringify(data);
        return btoa(unescape(encodeURIComponent(str)));
    }

    safeAtob(encoded) {
        return JSON.parse(decodeURIComponent(escape(atob(encoded))));
    }

    async getFileContent(filePath) {
        try {
            const response = await fetch(`${this.baseURL}${this.dataRepo}/contents/${filePath}`, {
                method: 'GET',
                headers: this.headers
            });
            
            if (response.status === 404) return { content: this.safeBtoa({users:[]}), sha: null };
            if (!response.ok) throw new Error(`GitHub API错误: ${response.status}`);
            
            return await response.json();
        } catch (error) {
            return { content: this.safeBtoa({users:[]}), sha: null };
        }
    }

    async updateFile(filePath, content, sha) {
        const response = await fetch(`${this.baseURL}${this.dataRepo}/contents/${filePath}`, {
            method: 'PUT',
            headers: this.headers,
            body: JSON.stringify({
                message: `Update ${filePath}`,
                content: this.safeBtoa(content),
                sha: sha
            })
        });
        
        if (!response.ok) throw new Error(`GitHub API错误: ${response.status}`);
        return await response.json();
    }

    async verifyUser(email, password) {
        const usersFile = await this.getFileContent('user/users.json');
        const usersContent = this.safeAtob(usersFile.content);
        
        const user = usersContent.users.find(u => u.email === email);
        if (!user) throw new Error('用户不存在，请先注册');
        if (user.password !== password) throw new Error('密码错误');
        
        return user;
    }

    async registerUser(userData) {
        const usersFile = await this.getFileContent('user/users.json');
        const usersContent = this.safeAtob(usersFile.content);
        
        if (usersContent.users.find(user => user.email === userData.email)) {
            throw new Error('邮箱已被注册');
        }
        
        const newUser = {
            id: Date.now().toString(),
            email: userData.email,
            password: userData.password,
            username: userData.email.split('@')[0],
            registerDate: new Date().toISOString(),
            status: 'active',
            role: 'user'
        };
        
        usersContent.users.push(newUser);
        await this.updateFile('user/users.json', usersContent, usersFile.sha);
        return newUser;
    }

    async recordLogin(userId, loginInfo) {
        try {
            const sessionsFile = await this.getFileContent('sessions/active-sessions.json');
            const sessionsContent = this.safeAtob(sessionsFile.content) || { sessions: [] };
            
            const loginRecord = {
                userId: userId,
                sessionId: Date.now().toString(),
                loginTime: new Date().toISOString(),
                ipAddress: '自动获取中...',
                userAgent: navigator.userAgent,
                deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
                location: '自动获取中...'
            };
            
            sessionsContent.sessions.unshift(loginRecord);
            await this.updateFile('sessions/active-sessions.json', sessionsContent, sessionsFile.sha);
            return loginRecord;
        } catch (error) {
            console.error('记录登录历史失败:', error);
            throw error;
        }
    }

    async getAllUsers() {
        const usersFile = await this.getFileContent('user/users.json');
        return this.safeAtob(usersFile.content).users;
    }

    async getLoginHistory() {
        const sessionsFile = await this.getFileContent('sessions/active-sessions.json');
        return this.safeAtob(sessionsFile.content).sessions || [];
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
}

const gitHubDataManager = new GitHubDataManager();
