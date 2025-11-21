// 管理员数据看板逻辑
class AdminDashboard {
    constructor() {
        this.users = [];
        this.loginHistory = [];
        this.registrationHistory = [];
        this.currentAdmin = null;
        this.sortField = 'id';
        this.sortDirection = 'desc';
        this.startTime = Date.now();
        this.requestCount = 0;

        this.init();
    }

    async init() {
        await this.checkAdminAuth();
        await this.loadAllData();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.updateSystemInfo();
    }

    // 检查管理员权限
    async checkAdminAuth() {
        const isAdmin = localStorage.getItem('isAdmin');
        const adminUser = localStorage.getItem('adminUser');

        if (!isAdmin || !adminUser) {
            this.showNotification('请先登录管理员账号', 'error');
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 2000);
            return;
        }

        this.currentAdmin = adminUser;
        document.getElementById('currentAdmin').textContent = adminUser;

        // 验证管理员权限
        try {
            const isStillAdmin = await gitHubDataManager.isAdmin(adminUser);
            if (!isStillAdmin) {
                throw new Error('管理员权限已失效');
            }
        } catch (error) {
            this.showNotification('管理员权限验证失败', 'error');
            this.adminLogout();
            return;
        }
    }

    // 加载所有数据
    async loadAllData() {
        this.showLoading(true);

        try {
            await Promise.all([
                this.loadUsersData(),
                this.loadLoginHistory(),
                this.loadRegistrationHistory(),
                this.updateStats()
            ]);

            this.requestCount += 4;
            this.updateLastSync();

        } catch (error) {
            console.error('加载数据失败:', error);
            this.showNotification('数据加载失败: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // 加载用户数据
    async loadUsersData() {
        try {
            this.users = await gitHubDataManager.getAllUsers();
            this.renderUsersTable();
        } catch (error) {
            throw new Error('加载用户数据失败');
        }
    }

    // 加载登录历史
    async loadLoginHistory() {
        try {
            this.loginHistory = await gitHubDataManager.getLoginHistory();
            this.renderLoginHistory();
        } catch (error) {
            throw new Error('加载登录历史失败');
        }
    }

    // 加载注册历史
    async loadRegistrationHistory() {
        try {
            this.registrationHistory = await gitHubDataManager.getRegistrationHistory();
            this.renderRegistrationHistory();
        } catch (error) {
            console.log('注册历史文件不存在或加载失败，将使用空数据');
            this.registrationHistory = [];
        }
    }

    // 更新统计信息
    async updateStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(user => user.status === 'active').length;

        // 计算今日登录次数
        const today = new Date().toDateString();
        const todayLogins = this.loginHistory.filter(login =>
            new Date(login.loginTime).toDateString() === today
        ).length;

        // 计算今日注册次数
        const todayRegistrations = this.registrationHistory.filter(reg =>
            new Date(reg.registerTime).toDateString() === today
        ).length;

        // 模拟在线用户（在实际应用中应该从实时数据获取）
        const onlineUsers = Math.min(activeUsers, Math.floor(Math.random() * 10) + 1);

        // 更新统计卡片
        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('activeUsers').textContent = activeUsers;
        document.getElementById('todayLogins').textContent = todayLogins;
        document.getElementById('todayRegistrations').textContent = todayRegistrations;
        document.getElementById('onlineUsers').textContent = onlineUsers;

        // 更新趋势（模拟数据）
        this.updateTrends();
    }

    // 更新趋势信息
    updateTrends() {
        const trends = {
            users: { change: '+12%', icon: 'fa-arrow-up' },
            active: { change: '+8%', icon: 'fa-arrow-up' },
            logins: { change: '+23%', icon: 'fa-arrow-up' },
            registrations: { change: '+15%', icon: 'fa-arrow-up' },
            online: { change: '实时', icon: 'fa-circle' }
        };

        Object.keys(trends).forEach(key => {
            const trend = trends[key];
            const element = document.getElementById(`${key}Trend`);
            if (element) {
                element.innerHTML = `<i class="fas ${trend.icon}"></i><span>${trend.change}</span>`;
            }
        });
    }

    // 渲染用户表格
    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');

        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                        <p>暂无用户数据</p>
                    </td>
                </tr>
            `;
            return;
        }

        // 排序用户数据
        const sortedUsers = this.sortUsers([...this.users]);

        tbody.innerHTML = sortedUsers.map(user => `
            <tr>
                <td>${user.id.slice(0, 8)}...</td>
                <td>${user.email}</td>
                <td>${user.password ? '***' + user.password.slice(-4) : '未设置'}</td>
                <td>${user.username || '未设置'}</td>
                <td>${this.formatDate(user.registerDate)}</td>
                <td>${user.lastLogin ? this.formatDate(user.lastLogin) : '从未登录'}</td>
                <td>${user.loginCount || 0}</td>
                <td>
                    <span class="status-badge status-${user.status || 'active'}">
                        ${this.getStatusText(user.status)}
                    </span>
                </td>
                <td>
                    <button class="action-btn small" onclick="admin.viewUserDetails('${user.id}')" title="查看详情">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn small" onclick="admin.toggleUserStatus('${user.id}')" title="切换状态">
                        <i class="fas fa-power-off"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // 渲染登录历史
    renderLoginHistory() {
        const tbody = document.getElementById('loginHistoryBody');
        const recentLogins = this.loginHistory.slice(0, 100); // 显示最近100条

        if (recentLogins.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        <i class="fas fa-history" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                        <p>暂无登录记录</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = recentLogins.map(login => `
            <tr>
                <td>${login.userEmail || this.getShortEmail(login.userId)}</td>
                <td>${this.formatDateTime(login.loginTime)}</td>
                <td>${login.ipAddress || '未知'}</td>
                <td>
                    <div class="location-info">
                        <div class="main-location">${login.city || '未知城市'}, ${login.region || '未知地区'}, ${login.country || '未知国家'}</div>
                        <div class="detail-location" style="font-size: 11px; color: rgba(255,255,255,0.6);">
                            ${login.district || ''} ${login.road || ''}
                            ${login.locationSource === 'user-permission' ?
                              '<span style="color: #27ae60;">(用户授权)</span>' :
                              '<span style="color: #e67e22;">(IP定位)</span>'}
                        </div>
                    </div>
                </td>
                <td>
                    ${login.latitude && login.longitude ?
                        `<div class="coordinates">
                            <div style="font-size: 11px;">经度: ${login.longitude}</div>
                            <div style="font-size: 11px;">纬度: ${login.latitude}</div>
                            <div style="font-size: 10px; color: rgba(255,255,255,0.6);">
                                精度: ${login.accuracyMeters || '未知'}米
                            </div>
                            <a href="https://maps.google.com/?q=${login.latitude},${login.longitude}" target="_blank" style="color: #e74c3c; font-size: 10px;">
                                <i class="fas fa-map-marker-alt"></i> 查看地图
                            </a>
                        </div>` :
                        '<span style="color: rgba(255,255,255,0.5); font-size: 11px;">无坐标</span>'
                    }
                </td>
                <td>
                    <div class="browser-info">
                        <div class="browser-name">${login.browser || '未知'}</div>
                        <div class="browser-version" style="font-size: 11px; color: rgba(255,255,255,0.6);">
                            ${login.browserVersion || '未知版本'}
                        </div>
                    </div>
                </td>
                <td>${login.os || '未知'}</td>
                <td>
                    <span class="device-badge device-${login.deviceType || 'desktop'}">
                        ${this.getDeviceText(login.deviceType)}
                    </span>
                </td>
                <td>
                    <span class="accuracy-badge accuracy-${login.accuracy || 'low'}">
                        ${this.getAccuracyText(login.accuracy)}
                    </span>
                </td>
                <td>
                    ${login.locationSource === 'user-permission' ?
                      '<span class="status-badge status-active" style="background: rgba(46, 204, 113, 0.2); color: #27ae60;">用户授权</span>' :
                      '<span class="status-badge status-active" style="background: rgba(230, 126, 34, 0.2); color: #e67e22;">IP定位</span>'
                    }
                </td>
                <td>
                    ${login.isAdmin ?
                        '<span class="status-badge status-active" style="background: rgba(155, 89, 182, 0.2); color: #9b59b6;">管理员</span>' :
                        '<span class="status-badge status-active">用户</span>'
                    }
                </td>
                <td>
                    <span class="status-badge status-active">
                        成功
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // 渲染注册历史
    renderRegistrationHistory() {
        const tbody = document.getElementById('registrationHistoryBody');

        if (this.registrationHistory.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: rgba(255,255,255,0.5);">
                        <i class="fas fa-user-plus" style="font-size: 48px; margin-bottom: 15px; display: block;"></i>
                        <p>暂无注册记录</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.registrationHistory.map(reg => `
            <tr>
                <td>${reg.userEmail}</td>
                <td>${this.formatDateTime(reg.registerTime)}</td>
                <td>${reg.ipAddress || '未知'}</td>
                <td>
                    <div class="location-info">
                        <div class="main-location">${reg.city || '未知城市'}, ${reg.region || '未知地区'}, ${reg.country || '未知国家'}</div>
                        <div class="detail-location" style="font-size: 11px; color: rgba(255,255,255,0.6);">
                            ${reg.isp || '未知运营商'}
                        </div>
                    </div>
                </td>
                <td>
                    ${reg.latitude && reg.longitude ?
                        `<div class="coordinates">
                            <div style="font-size: 11px;">经度: ${reg.longitude}</div>
                            <div style="font-size: 11px;">纬度: ${reg.latitude}</div>
                            <a href="https://maps.google.com/?q=${reg.latitude},${reg.longitude}" target="_blank" style="color: #e74c3c; font-size: 10px;">
                                <i class="fas fa-map-marker-alt"></i> 查看地图
                            </a>
                        </div>` :
                        '<span style="color: rgba(255,255,255,0.5); font-size: 11px;">无坐标</span>'
                    }
                </td>
                <td>
                    <div class="browser-info">
                        <div class="browser-name">${reg.browser || '未知'}</div>
                        <div class="browser-version" style="font-size: 11px; color: rgba(255,255,255,0.6);">
                            ${reg.browserVersion || '未知版本'}
                        </div>
                    </div>
                </td>
                <td>${reg.os || '未知'}</td>
                <td>
                    <span class="device-badge device-desktop">
                        ${this.getDeviceText('desktop')}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-active">
                        成功
                    </span>
                </td>
            </tr>
        `).join('');
    }

    // 排序用户数据
    sortUsers(users) {
        return users.sort((a, b) => {
            let aValue = a[this.sortField];
            let bValue = b[this.sortField];

            if (this.sortField.includes('Date') || this.sortField === 'lastLogin') {
                aValue = new Date(aValue || 0);
                bValue = new Date(bValue || 0);
            }

            if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // 表格排序
    sortTable(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        this.renderUsersTable();
    }

    // 查看用户详情
    viewUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.showNotification(`查看用户: ${user.email}`, 'info');
            // 在实际应用中这里可以打开用户详情模态框
            console.log('用户详情:', user);
        }
    }

    // 切换用户状态
    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            this.showNotification(`已将用户 ${user.email} 状态改为: ${this.getStatusText(newStatus)}`, 'info');
            // 在实际应用中这里应该调用API更新用户状态
        }
    }

    // 筛选功能
    filterActiveUsers() {
        const activeUsers = this.users.filter(user => user.status === 'active');
        this.renderFilteredUsers(activeUsers, '活跃用户');
    }

    filterNewUsers() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const newUsers = this.users.filter(user =>
            new Date(user.registerDate) > oneWeekAgo
        );
        this.renderFilteredUsers(newUsers, '新用户（7天内注册）');
    }

    showAllUsers() {
        this.renderUsersTable();
        this.showNotification('显示所有用户', 'info');
    }

    filterTodayLogins() {
        const today = new Date().toDateString();
        const todayLogins = this.loginHistory.filter(login =>
            new Date(login.loginTime).toDateString() === today
        );
        this.renderFilteredLoginHistory(todayLogins, '今日登录');
    }

    filterFailedLogins() {
        // 在实际应用中这里应该过滤失败的登录尝试
        this.showNotification('暂无失败登录记录', 'info');
    }

    // 新增：筛选用户授权位置
    filterUserLocationLogins() {
        const userLocationLogins = this.loginHistory.filter(login =>
            login.locationSource === 'user-permission'
        );
        this.renderFilteredLoginHistory(userLocationLogins, '用户授权位置');
    }

    // 新增：筛选高精度位置
    filterHighAccuracyLogins() {
        const highAccuracyLogins = this.loginHistory.filter(login =>
            login.accuracy === 'high'
        );
        this.renderFilteredLoginHistory(highAccuracyLogins, '高精度位置');
    }

    // 渲染筛选后的用户数据
    renderFilteredUsers(filteredUsers, filterName) {
        const originalUsers = this.users;
        this.users = filteredUsers;
        this.renderUsersTable();
        this.users = originalUsers;
        this.showNotification(`已筛选: ${filterName} (${filteredUsers.length}个)`, 'info');
    }

    // 渲染筛选后的登录历史
    renderFilteredLoginHistory(filteredLogins, filterName) {
        const originalHistory = this.loginHistory;
        this.loginHistory = filteredLogins;
        this.renderLoginHistory();
        this.loginHistory = originalHistory;
        this.showNotification(`已筛选: ${filterName} (${filteredLogins.length}条)`, 'info');
    }

    // 设置事件监听器
    setupEventListeners() {
        // 点击特效
        this.addClickEffects();

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                this.refreshData();
            }
        });
    }

    // 添加点击特效
    addClickEffects() {
        const clickableElements = document.querySelectorAll('.stat-card, .action-btn, .nav-btn, .data-table th');

        clickableElements.forEach(element => {
            element.addEventListener('click', function(e) {
                // 波纹效果
                const ripple = document.createElement('div');
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - size / 2;
                const y = e.clientY - rect.top - size / 2;

                ripple.style.cssText = `
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    left: ${x}px;
                    top: ${y}px;
                    border-radius: 50%;
                    background: rgba(231, 76, 60, 0.6);
                    transform: scale(0);
                    animation: ripple 0.6s linear;
                    pointer-events: none;
                    z-index: 100;
                `;

                this.style.position = 'relative';
                this.style.overflow = 'hidden';
                this.appendChild(ripple);

                setTimeout(() => {
                    if (ripple.parentNode === this) {
                        this.removeChild(ripple);
                    }
                }, 600);
            });
        });
    }

    // 开始实时更新
    startRealTimeUpdates() {
        // 每30秒更新一次在线用户数
        setInterval(() => {
            this.updateOnlineUsers();
        }, 30000);

        // 每2分钟更新一次数据
        setInterval(() => {
            this.refreshData();
        }, 120000);

        // 实时更新系统信息
        setInterval(() => {
            this.updateSystemInfo();
        }, 5000);
    }

    // 更新在线用户数
    updateOnlineUsers() {
        const onlineUsers = Math.min(
            this.users.filter(user => user.status === 'active').length,
            Math.floor(Math.random() * 10) + 1
        );
        document.getElementById('onlineUsers').textContent = onlineUsers;
    }

    // 更新系统信息
    updateSystemInfo() {
        // 内存使用（模拟）
        const memoryUsage = (performance.memory ? (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1) : '0');
        document.getElementById('memoryUsage').textContent = `${memoryUsage} MB`;

        // 运行时间
        const uptime = Math.floor((Date.now() - this.startTime) / 60000);
        document.getElementById('uptime').textContent = `${uptime}分钟`;

        // 请求次数
        document.getElementById('requestCount').textContent = this.requestCount;

        // GitHub状态
        gitHubDataManager.testConnection().then(connected => {
            document.getElementById('githubStatus').textContent = connected ? '🟢 已连接' : '🔴 断开';
        });

        // 位置统计
        this.updateLocationStats();
    }

    // 新增：更新位置统计信息
    updateLocationStats() {
        const userPermissionLogins = this.loginHistory.filter(login =>
            login.locationSource === 'user-permission'
        ).length;

        const highAccuracyLogins = this.loginHistory.filter(login =>
            login.accuracy === 'high'
        ).length;

        // 在实际应用中，可以在这里更新位置统计卡片
        console.log(`位置统计: ${userPermissionLogins} 个用户授权位置, ${highAccuracyLogins} 个高精度位置`);
    }

    // 刷新数据
    async refreshData() {
        this.showNotification('正在刷新数据...', 'info');
        await this.loadAllData();
        this.showNotification('数据刷新完成', 'success');
    }

    // 导出数据
    exportData() {
        const data = {
            users: this.users,
            loginHistory: this.loginHistory,
            registrationHistory: this.registrationHistory,
            exportTime: new Date().toISOString(),
            exportedBy: this.currentAdmin
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quantum-space-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('数据导出成功', 'success');
    }

    // 管理员退出
    adminLogout() {
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminUserId');
        localStorage.removeItem('isAdmin');
        this.showNotification('已退出管理员系统', 'info');
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 1000);
    }

    // 工具函数
    formatDate(dateString) {
        if (!dateString) return '未知';
        return new Date(dateString).toLocaleDateString('zh-CN');
    }

    formatDateTime(dateString) {
        if (!dateString) return '未知';
        return new Date(dateString).toLocaleString('zh-CN');
    }

    getStatusText(status) {
        const statusMap = {
            'active': '活跃',
            'inactive': '未激活',
            'banned': '已封禁'
        };
        return statusMap[status] || '未知';
    }

    getDeviceText(deviceType) {
        const deviceMap = {
            'desktop': '桌面',
            'mobile': '手机',
            'tablet': '平板',
            'tv': '电视'
        };
        return deviceMap[deviceType] || '未知';
    }

    getAccuracyText(accuracy) {
        const accuracyMap = {
            'high': '高精度',
            'medium': '中等',
            'low': '低精度',
            'none': '无数据'
        };
        return accuracyMap[accuracy] || '未知';
    }

    getShortEmail(email) {
        return email ? email.split('@')[0] : '未知';
    }

    getBrowserInfo(userAgent) {
        if (!userAgent) return '未知';
        if (userAgent.includes('Chrome')) return 'Chrome';
        if (userAgent.includes('Firefox')) return 'Firefox';
        if (userAgent.includes('Safari')) return 'Safari';
        if (userAgent.includes('Edge')) return 'Edge';
        return '其他';
    }

    updateLastSync() {
        document.getElementById('lastSync').textContent = '刚刚';
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        overlay.classList.toggle('show', show);
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// 全局函数
function refreshData() {
    admin.refreshData();
}

function exportData() {
    admin.exportData();
}

function adminLogout() {
    admin.adminLogout();
}

function filterActiveUsers() {
    admin.filterActiveUsers();
}

function filterNewUsers() {
    admin.filterNewUsers();
}

function showAllUsers() {
    admin.showAllUsers();
}

function filterTodayLogins() {
    admin.filterTodayLogins();
}

function filterFailedLogins() {
    admin.filterFailedLogins();
}

// 新增：筛选用户授权位置
function filterUserLocationLogins() {
    admin.filterUserLocationLogins();
}

// 新增：筛选高精度位置
function filterHighAccuracyLogins() {
    admin.filterHighAccuracyLogins();
}

function sortTable(field) {
    admin.sortTable(field);
}

// 初始化管理员看板
const admin = new AdminDashboard();