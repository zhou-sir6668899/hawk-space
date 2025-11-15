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

    // 获取用户授权的地理位置信息
    async getUserLocationWithPermission() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('浏览器不支持地理位置API'));
                return;
            }

            const options = {
                enableHighAccuracy: true, // 请求高精度位置
                timeout: 10000,           // 10秒超时
                maximumAge: 60000         // 1分钟内缓存
            };

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    try {
                        const { latitude, longitude } = position.coords;
                        const accuracy = position.coords.accuracy;

                        // 使用逆地理编码获取详细地址信息
                        const locationDetails = await this.reverseGeocode(latitude, longitude);

                        resolve({
                            latitude,
                            longitude,
                            accuracy: this.getAccuracyLevel(accuracy),
                            accuracyMeters: Math.round(accuracy),
                            altitude: position.coords.altitude,
                            altitudeAccuracy: position.coords.altitudeAccuracy,
                            heading: position.coords.heading,
                            speed: position.coords.speed,
                            timestamp: position.timestamp,
                            source: 'user-permission',
                            ...locationDetails
                        });
                    } catch (error) {
                        // 如果逆地理编码失败，至少返回坐标
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: this.getAccuracyLevel(position.coords.accuracy),
                            accuracyMeters: Math.round(position.coords.accuracy),
                            source: 'user-permission',
                            fullLocation: '用户授权位置（无详细地址）'
                        });
                    }
                },
                (error) => {
                    const errorMessages = {
                        1: '用户拒绝提供位置权限',
                        2: '无法获取位置信息',
                        3: '位置请求超时'
                    };
                    reject(new Error(errorMessages[error.code] || '位置获取失败'));
                },
                options
            );
        });
    }

    // 逆地理编码 - 将经纬度转换为地址
    async reverseGeocode(latitude, longitude) {
        try {
            // 使用 Nominatim (OpenStreetMap) 进行逆地理编码
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
            );

            if (!response.ok) {
                throw new Error('逆地理编码请求失败');
            }

            const data = await response.json();

            if (data && data.address) {
                const address = data.address;
                return {
                    country: address.country || '未知',
                    region: address.state || address.region || '未知',
                    city: address.city || address.town || address.village || '未知',
                    district: address.suburb || address.neighbourhood || '',
                    road: address.road || '',
                    building: address.building || '',
                    postcode: address.postcode || '',
                    fullLocation: data.display_name || '未知位置',
                    locationType: 'reverse-geocode'
                };
            }

            throw new Error('无法解析位置信息');
        } catch (error) {
            console.warn('逆地理编码失败:', error);
            // 返回基本位置信息
            return {
                country: '未知',
                region: '未知',
                city: '未知',
                fullLocation: `坐标位置 (${latitude.toFixed(6)}, ${longitude.toFixed(6)})`,
                locationType: 'coordinates-only'
            };
        }
    }

    // 根据精度值确定精度等级
    getAccuracyLevel(accuracy) {
        if (accuracy <= 20) return 'high';
        if (accuracy <= 100) return 'medium';
        return 'low';
    }

    // 获取地理位置信息
    // 获取地理位置信息 - 仅用户授权版本
async getLocationInfo() {
    try {
        // 直接获取用户授权的位置
        const userLocation = await this.getUserLocationWithPermission();

        return {
            country: userLocation.country || '未知',
            region: userRegion || '未知',
            city: userLocation.city || '未知',
            isp: '用户授权位置',
            fullLocation: userLocation.fullLocation,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            timezone: '用户本地时间',
            locationType: userLocation.locationType,
            accuracy: userLocation.accuracy,
            accuracyMeters: userLocation.accuracyMeters,
            source: 'user-permission'
        };

    } catch (error) {
        console.error('获取用户位置失败:', error);
        return {
            country: '未知',
            region: '未知',
            city: '未知',
            isp: '未知',
            fullLocation: '用户拒绝提供位置权限',
            latitude: null,
            longitude: null,
            timezone: '未知',
            locationType: 'permission-denied',
            accuracy: 'none',
            source: 'denied'
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

    // 格式化详细地理位置信息
    formatDetailedLocation(data) {
        const parts = [];

        // 优先使用中文地区名称
        if (data.city && data.city !== '未知' && data.city !== '') {
            parts.push(data.city);
        }
        if (data.region && data.region !== '未知' && data.region !== '') {
            parts.push(data.region);
        }
        if (data.country && data.country !== '未知' && data.country !== '') {
            parts.push(data.country);
        }

        // 如果没有获取到具体位置，返回默认值
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

    // 获取操作系统信息
    getOSInfo(userAgent) {
        const ua = userAgent.toLowerCase();
        if (ua.includes('windows')) return 'Windows';
        if (ua.includes('mac os')) return 'macOS';
        if (ua.includes('linux')) return 'Linux';
        if (ua.includes('android')) return 'Android';
        if (ua.includes('ios') || ua.includes('iphone')) return 'iOS';
        return '未知';
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
            'sessions/registration-history.json': { registrations: [] },
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

            // 记录注册历史
            await this.recordRegistration(newUser);

            return newUser;
        } catch (error) {
            throw error;
        }
    }

    // 增强的记录登录方法 - 包含用户授权位置
    async recordLoginWithUserLocation(userId, loginInfo) {
        try {
            let userLocation = null;
            let locationSource = 'ip';

            try {
                // 尝试获取用户授权的位置
                userLocation = await this.getUserLocationWithPermission();
                locationSource = 'user-permission';
                console.log('✅ 用户授权位置获取成功', userLocation);
            } catch (locationError) {
                console.log('用户位置获取失败:', locationError.message);
                // 不再使用IP定位备选方案
                userLocation = {
                    country: '未知',
                    region: '未知',
                    city: '未知',
                    fullLocation: '用户未授权位置信息',
                    latitude: null,
                    longitude: null,
                    accuracy: 'none'
                };
            }

            const sessionsFile = await this.getFileContent('sessions/login-history.json');
            const sessionsContent = this.safeAtob(sessionsFile.content) || { sessions: [] };

            // 获取浏览器详细信息
            const browserInfo = this.getBrowserDetails(loginInfo.userAgent || navigator.userAgent);
            const deviceType = this.getDeviceType(loginInfo.userAgent || navigator.userAgent);

            const loginRecord = {
                userId: userId,
                userEmail: loginInfo.email || '未知',
                sessionId: this.generateUUID(),
                loginTime: new Date().toISOString(),
                ipAddress: await this.getIPAddress(),
                userAgent: loginInfo.userAgent || navigator.userAgent,
                deviceType: deviceType,

                // 位置信息（用户授权或IP定位）
                location: userLocation.fullLocation,
                country: userLocation.country,
                region: userLocation.region,
                city: userLocation.city,
                district: userLocation.district,
                road: userLocation.road,
                isp: userLocation.isp || '未知',
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                locationSource: locationSource,
                accuracy: userLocation.accuracy,
                accuracyMeters: userLocation.accuracyMeters,

                // 浏览器信息
                browser: browserInfo.browser,
                browserVersion: browserInfo.version,
                platform: browserInfo.platform,
                os: this.getOSInfo(loginInfo.userAgent || navigator.userAgent),

                // 其他信息
                isAdmin: loginInfo.isAdmin || false,
                status: 'success',
                loginType: loginInfo.loginType || 'password',
                locationPermission: locationSource === 'user-permission' ? 'granted' : 'denied'
            };

            sessionsContent.sessions.unshift(loginRecord);

            // 只保留最近500条记录
            if (sessionsContent.sessions.length > 500) {
                sessionsContent.sessions = sessionsContent.sessions.slice(0, 500);
            }

            await this.updateFile('sessions/login-history.json', sessionsContent, sessionsFile.sha);
            await this.updateUserLastLogin(userId);

            return loginRecord;
        } catch (error) {
            console.error('记录登录历史失败:', error);
            throw error;
        }
    }

    // 原有的记录登录方法（保持兼容性）
    async recordLogin(userId, loginInfo) {
        try {
            const sessionsFile = await this.getFileContent('sessions/login-history.json');
            const sessionsContent = this.safeAtob(sessionsFile.content) || { sessions: [] };

            // 获取用户授权位置信息
            const locationInfo = await this.getLocationInfo();

            // 获取浏览器详细信息
            const browserInfo = this.getBrowserDetails(loginInfo.userAgent || navigator.userAgent);

            // 获取设备类型
            const deviceType = this.getDeviceType(loginInfo.userAgent || navigator.userAgent);

            const loginRecord = {
                userId: userId,
                userEmail: loginInfo.email || '未知', // 记录用户邮箱
                sessionId: this.generateUUID(),
                loginTime: new Date().toISOString(),
                ipAddress: ipAddress,
                userAgent: loginInfo.userAgent || navigator.userAgent,
                deviceType: deviceType,

                // 详细位置信息
                location: locationInfo.fullLocation,
                country: locationInfo.country,
                region: locationInfo.region,
                city: locationInfo.city,
                isp: locationInfo.isp,
                latitude: locationInfo.latitude,
                longitude: locationInfo.longitude,
                timezone: locationInfo.timezone,
                locationType: locationInfo.locationType,
                accuracy: locationInfo.accuracy,
                locationSource: 'ip',

                // 浏览器信息
                browser: browserInfo.browser,
                browserVersion: browserInfo.version,
                platform: browserInfo.platform,
                os: this.getOSInfo(loginInfo.userAgent || navigator.userAgent),

                // 其他信息
                isAdmin: loginInfo.isAdmin || false,
                status: 'success',
                loginType: loginInfo.loginType || 'password'
            };

            sessionsContent.sessions.unshift(loginRecord);

            // 只保留最近500条记录
            if (sessionsContent.sessions.length > 500) {
                sessionsContent.sessions = sessionsContent.sessions.slice(0, 500);
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

    // 记录注册历史
    async recordRegistration(userData) {
        try {
            const sessionsFile = await this.getFileContent('sessions/registration-history.json');
            const sessionsContent = this.safeAtob(sessionsFile.content) || { registrations: [] };

            // 获取IP地址
            const ipAddress = await this.getIPAddress();

            // 获取详细地理位置信息
            const locationInfo = await this.getLocationInfo(ipAddress);

            // 获取浏览器详细信息
            const browserInfo = this.getBrowserDetails(navigator.userAgent);

            const registrationRecord = {
                userId: userData.id,
                userEmail: userData.email,
                registerTime: new Date().toISOString(),
                ipAddress: ipAddress,
                userAgent: navigator.userAgent,

                // 详细位置信息
                location: locationInfo.fullLocation,
                country: locationInfo.country,
                region: locationInfo.region,
                city: locationInfo.city,
                isp: locationInfo.isp,
                latitude: locationInfo.latitude,
                longitude: locationInfo.longitude,
                timezone: locationInfo.timezone,

                // 浏览器信息
                browser: browserInfo.browser,
                browserVersion: browserInfo.version,
                platform: browserInfo.platform,
                os: this.getOSInfo(navigator.userAgent)
            };

            sessionsContent.registrations.unshift(registrationRecord);

            // 只保留最近200条记录
            if (sessionsContent.registrations.length > 200) {
                sessionsContent.registrations = sessionsContent.registrations.slice(0, 200);
            }

            await this.updateFile('sessions/registration-history.json', sessionsContent, sessionsFile.sha);
            return registrationRecord;
        } catch (error) {
            console.error('记录注册历史失败:', error);
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

    async getRegistrationHistory() {
        try {
            const sessionsFile = await this.getFileContent('sessions/registration-history.json');
            return this.safeAtob(sessionsFile.content).registrations || [];
        } catch (error) {
            return [];
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