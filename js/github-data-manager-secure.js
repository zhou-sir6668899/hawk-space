
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

    // 获取地理位置信息
    async getLocationInfo(ip = null) {
        try {
            // 如果是本地IP，直接返回本地环境
            if (!ip || ip === '127.0.0.1' || ip === 'localhost' || ip === '未知') {
                return {
                    country: '本地',
                    region: '开发环境',
                    city: '本地主机',
                    isp: '本地网络',
                    fullLocation: '本地开发环境'
                };
            }

            // 方法1: 使用 ipapi.co API
            try {
                const response = await fetch(`https://ipapi.co/${ip}/json/`);
                if (response.ok) {
                    const data = await response.json();
                    return {
                        country: data.country_name || '未知',
                        region: data.region || '未知',
                        city: data.city || '未知',
                        isp: data.org || '未知',
                        fullLocation: this.formatLocation(data),
                        latitude: data.latitude,
                        longitude: data.longitude,
                        timezone: data.timezone
                    };
                }
            } catch (error) {
                console.log('ipapi.co 请求失败，尝试备用API');
            }

            // 方法2: 使用 ip-api.com (免费)
            try {
                const response = await fetch(`http://ip-api.com/json/${ip}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success') {
                        return {
                            country: data.country || '未知',
                            region: data.regionName || '未知',
                            city: data.city || '未知',
                            isp: data.isp || '未知',
                            fullLocation: this.formatLocation(data),
                            latitude: data.lat,
                            longitude: data.lon,
                            timezone: data.timezone
                        };
                    }
                }
            } catch (error) {
                console.log('ip-api.com 请求失败');
            }

            // 方法3: 使用 ipapi.com (备用)
            try {
                const response = await fetch(`https://ipapi.com/ip_api.php?ip=${ip}`);
                if (response.ok) {
                    const data = await response.json();
                    return {
                        country: data.country_name || '未知',
                        region: data.region_name || '未知',
                        city: data.city || '未知',
                        isp: data.isp || '未知',
                        fullLocation: this.formatLocation(data),
                        latitude: data.latitude,
                        longitude: data.longitude
                    };
                }
            } catch (error) {
                console.log('ipapi.com 备用请求失败');
            }

            // 所有API都失败时返回默认值
            return {
                country: '未知',
                region: '未知',
                city: '未知',
                isp: '未知',
                fullLocation: '位置获取失败'
            };

        } catch (error) {
            console.error('获取地理位置失败:', error);
            return {
                country: '错误',
                region: '错误',
                city: '错误',
                isp: '错误',
                fullLocation: '位置服务异常'
            };
        }
    }

    // 格式化地理位置信息
    formatLocation(data) {
        const parts = [];
        if (data.city && data.city !== '未知') parts.push(data.city);
        if (data.region && data.region !== '未知') parts.push(data.region);
        if (data.country && data.country !== '未知') parts.push(data.country);

        return parts.length > 0 ? parts.join(', ') : '未知位置';
    }

    // 获取浏览器详细信息
    getBrowserDetails(userAgent) {
        const ua = userAgent.toLowerCase();
        let browser = '未知浏览器';
        let version = '未知版本';
        let platform = '未知平台';

        // 检测浏览器
        if (ua.includes('chrome') && !ua.includes('edg')) {
            browser = 'Chrome';
            const match = ua.match(/chrome\/([0-9.]+)/);
            version = match ? match[1] : '未知版本';
        } else if (ua.includes('firefox')) {
            browser = 'Firefox';
            const match = ua.match(/firefox\/([0-9.]+)/);
            version = match ? match[1] : '未知版本';
        } else if (ua.includes('safari') && !ua.includes('chrome')) {
            browser = 'Safari';
            const match = ua.match(/version\/([0-9.]+)/);
            version = match ? match[1] : '未知版本';
        } else if (ua.includes('edg')) {
            browser = 'Edge';
            const match = ua.match(/edg\/([0-9.]+)/);
            version = match ? match[1] : '未知版本';
        } else if (ua.includes('opera')) {
            browser = 'Opera';
            const match = ua.match(/opera\/([0-9.]+)/);
            version = match ? match[1] : '未知版本';
        }

        // 检测平台
        if (ua.includes('windows')) {
            platform = 'Windows';
        } else if (ua.includes('mac')) {
            platform = 'macOS';
        } else if (ua.includes('linux')) {
            platform = 'Linux';
        } else if (ua.includes('android')) {
            platform = 'Android';
        } else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) {
            platform = 'iOS';
        }

        return {
            browser: browser,
            version: version,
            platform: platform,
            userAgent: userAgent
        };
    }

    // 获取设备类型（增强版）
    getDeviceType(userAgent) {
        const ua = userAgent.toLowerCase();

        // 移动设备检测
        const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);

        // 平板检测
        const isTablet = /tablet|ipad|android(?!.*mobile)/i.test(ua);

        // 电视/大屏设备
        const isTV = /tv|smart-tv|googletv|appletv|hbbtv|philipstv|roku|crkey/i.test(ua);

        if (isTV) return 'tv';
        if (isTablet) return 'tablet';
        if (isMobile) return 'mobile';
        return 'desktop';
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
            'users/users.json': {
                users: []
            },
            'sessions/login-history.json': { sessions: [] },
            'config/admin-config.json': {
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
            const usersFile = await this.getFileContent('users/users.json');
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
            const usersFile = await this.getFileContent('users/users.json');
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
            await this.updateFile('users/users.json', usersContent, usersFile.sha);

            return newUser;
        } catch (error) {
            throw error;
        }
    }

    // 增强的记录登录方法 - 包含地理位置信息
    async recordLogin(userId, loginInfo) {
        try {
            const sessionsFile = await this.getFileContent('sessions/login-history.json');
            const sessionsContent = this.safeAtob(sessionsFile.content) || { sessions: [] };

            // 获取IP地址
            const ipAddress = await this.getIPAddress();

            // 获取地理位置信息
            const locationInfo = await this.getLocationInfo(ipAddress);

            // 获取浏览器详细信息
            const browserInfo = this.getBrowserDetails(loginInfo.userAgent || navigator.userAgent);

            // 获取设备类型
            const deviceType = this.getDeviceType(loginInfo.userAgent || navigator.userAgent);

            const loginRecord = {
                userId: userId,
                sessionId: this.generateUUID(),
                loginTime: new Date().toISOString(),
                ipAddress: ipAddress,
                userAgent: loginInfo.userAgent || navigator.userAgent,
                deviceType: deviceType,
                location: locationInfo.fullLocation,
                country: locationInfo.country,
                region: locationInfo.region,
                city: locationInfo.city,
                isp: locationInfo.isp,
                browser: browserInfo.browser,
                browserVersion: browserInfo.version,
                platform: browserInfo.platform,
                latitude: locationInfo.latitude,
                longitude: locationInfo.longitude,
                timezone: locationInfo.timezone,
                isAdmin: loginInfo.isAdmin || false,
                status: 'success'
            };

            sessionsContent.sessions.unshift(loginRecord);

            // 只保留最近200条记录
            if (sessionsContent.sessions.length > 200) {
                sessionsContent.sessions = sessionsContent.sessions.slice(0, 200);
            }

            await this.updateFile('sessions/login-history.json', sessionsContent, sessionsFile.sha);
            await this.updateUserLastLogin(userId);

            return loginRecord;
        } catch (error) {
            console.error('记录登录历史失败:', error);

            // 即使记录失败，也更新用户最后登录时间
            try {
                await this.updateUserLastLogin(userId);
            } catch (updateError) {
                console.error('更新用户最后登录时间失败:', updateError);
            }

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
            console.error('获取IP地址失败:', error);
            return '未知';
        }
    }

    async updateUserLastLogin(userId) {
        try {
            const usersFile = await this.getFileContent('users/users.json');
            const usersContent = this.safeAtob(usersFile.content);

            const userIndex = usersContent.users.findIndex(user => user.id === userId);
            if (userIndex !== -1) {
                usersContent.users[userIndex].lastLogin = new Date().toISOString();
                usersContent.users[userIndex].loginCount += 1;
                await this.updateFile('users/users.json', usersContent, usersFile.sha);
            }
        } catch (error) {
            console.error('更新用户最后登录时间失败:', error);
        }
    }

    async getAllUsers() {
        try {
            const usersFile = await this.getFileContent('users/users.json');
            return this.safeAtob(usersFile.content).users;
        } catch (error) {
            throw error;
        }
    }

    async getLoginHistory() {
        try {
            const sessionsFile = await this.getFileContent('sessions/login-history.json');
            return this.safeAtob(sessionsFile.content).sessions || [];
        } catch (error) {
            throw error;
        }
    }

    async isAdmin(email) {
        try {
            const configFile = await this.getFileContent('config/admin-config.json');
            const config = this.safeAtob(configFile.content);
            return config.security.adminEmails.includes(email);
        } catch (error) {
            return false;
        }
    }

    async testConnection() {
        try {
            console.log('🧪 测试GitHub连接...');
            await this.getFileContent('users/users.json');
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
