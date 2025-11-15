// 聊天室功能逻辑
class ChatManager {
    constructor() {
        this.currentUser = null;
        this.userId = null;
        this.currentRoom = 'main';
        this.messages = [];
        this.onlineUsers = [];
        this.rooms = [];
        this.isConnected = false;
        this.pollInterval = null;
        this.lastMessageId = null;
        this.init();
    }

    async init() {
        await this.checkLogin();
        this.setupEventListeners();
        this.loadRooms();
        this.loadOnlineUsers();
        this.joinRoom(this.currentRoom);
        this.startPolling();
        this.initClickEffects();
        this.initMobileMenu();
        this.updateOnlineStatus();
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
        // 更新用户信息显示
        document.getElementById('chatUserName').textContent = this.getShortEmail(this.currentUser);
        document.getElementById('chatUserAvatar').textContent = this.currentUser.charAt(0).toUpperCase();

        console.log('✅ 聊天室登录成功:', this.currentUser);
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
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const emojiBtn = document.getElementById('emojiBtn');
        const closeEmojiBtn = document.getElementById('closeEmojiBtn');
        const emojiPicker = document.getElementById('emojiPicker');

        // 发送消息
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // 输入框回车发送
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            messageInput.addEventListener('input', (e) => {
                this.updateSendButton();
                this.adjustTextareaHeight(e.target);
            });
        }

        // 表情选择器
        if (emojiBtn) {
            emojiBtn.addEventListener('click', () => {
                emojiPicker.classList.toggle('active');
            });
        }

        if (closeEmojiBtn) {
            closeEmojiBtn.addEventListener('click', () => {
                emojiPicker.classList.remove('active');
            });
        }

        // 表情点击
        const emojis = emojiPicker.querySelectorAll('.emoji');
        emojis.forEach(emoji => {
            emoji.addEventListener('click', () => {
                this.insertEmoji(emoji.textContent);
                emojiPicker.classList.remove('active');
            });
        });

        // 🆕 设置菜单事件监听器
        const settingsBtn = document.getElementById('settingsBtn');
        const closeSettingsBtn = document.getElementById('closeSettingsBtn');
        const settingsMenu = document.getElementById('settingsMenu');

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                settingsMenu.classList.toggle('active');
            });
        }

        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => {
                settingsMenu.classList.remove('active');
            });
        }

        // 点击外部关闭设置菜单和表情选择器
        document.addEventListener('click', (e) => {
            if (!settingsMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
                settingsMenu.classList.remove('active');
            }
            if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
                emojiPicker.classList.remove('active');
            }
        });

        // 房间切换
        const roomItems = document.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            item.addEventListener('click', () => {
                const roomId = item.dataset.room;
                this.joinRoom(roomId);
            });
        });
    }

    // 调整文本区域高度
    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }

    // 更新发送按钮状态
    updateSendButton() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const inputHint = document.getElementById('inputHint');

        if (messageInput && sendBtn) {
            const hasText = messageInput.value.trim().length > 0;
            sendBtn.disabled = !hasText;

            if (hasText) {
                inputHint.textContent = '按 Enter 发送';
            } else {
                inputHint.textContent = '输入消息...';
            }
        }
    }

    // 插入表情
    insertEmoji(emoji) {
        const messageInput = document.getElementById('messageInput');
        const cursorPos = messageInput.selectionStart;
        const textBefore = messageInput.value.substring(0, cursorPos);
        const textAfter = messageInput.value.substring(cursorPos);

        messageInput.value = textBefore + emoji + textAfter;
        messageInput.focus();
        messageInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);

        this.updateSendButton();
        this.adjustTextareaHeight(messageInput);
    }

    // 加载聊天室列表
    async loadRooms() {
        try {
            this.rooms = await gitHubDataManager.getChatRooms();
            this.renderRooms();
        } catch (error) {
            console.error('加载聊天室失败:', error);
            // 使用默认房间
            this.rooms = [
                { id: 'main', name: '主聊天室', description: '欢迎来到主聊天室！', userCount: 0 }
            ];
            this.renderRooms();
        }
    }

    // 渲染聊天室列表
    renderRooms() {
        const roomsList = document.getElementById('roomsList');
        if (!roomsList) return;

        roomsList.innerHTML = '';

        this.rooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.className = `room-item click-ripple ${room.id === this.currentRoom ? 'active' : ''}`;
            roomItem.dataset.room = room.id;
            roomItem.innerHTML = `
                <div class="room-icon">💬</div>
                <div class="room-info">
                    <div class="room-name">${this.escapeHtml(room.name)}</div>
                    <div class="room-desc">${this.escapeHtml(room.description)}</div>
                </div>
                <div class="room-stats">
                    <span class="user-count">${room.userCount || 0}</span>
                </div>
            `;

            roomItem.addEventListener('click', () => {
                this.joinRoom(room.id);
            });

            roomsList.appendChild(roomItem);
        });
    }

    // 加入聊天室
    async joinRoom(roomId) {
        // 更新UI
        const roomItems = document.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.room === roomId) {
                item.classList.add('active');
            }
        });

        this.currentRoom = roomId;

        // 更新房间信息
        const room = this.rooms.find(r => r.id === roomId);
        if (room) {
            document.getElementById('currentRoomName').textContent = room.name;
            document.getElementById('currentRoomDesc').textContent = room.description;
        }

        // 加载消息
        await this.loadMessages();

        // 发送加入通知
        await this.sendSystemMessage(`${this.getShortEmail(this.currentUser)} 加入了聊天室`);

        console.log(`✅ 加入聊天室: ${roomId}`);
    }

    // 加载消息
    async loadMessages() {
        try {
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.innerHTML = `
                <div class="loading-messages">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>加载消息中...</p>
                </div>
            `;

            this.messages = await gitHubDataManager.getChatMessages(this.currentRoom);

            if (this.messages.length === 0) {
                this.showWelcomeMessage();
            } else {
                this.renderMessages();
            }

            this.lastMessageId = this.messages.length > 0 ? this.messages[this.messages.length - 1].id : null;
            this.scrollToBottom();

        } catch (error) {
            console.error('加载消息失败:', error);
            this.showWelcomeMessage();
        }
    }

    // 显示欢迎消息
    showWelcomeMessage() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <h3>欢迎来到聊天室！</h3>
                <p>开始与大家交流吧</p>
            </div>
        `;
    }

    // 渲染消息
    renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '';

        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            messagesContainer.appendChild(messageElement);
        });
    }

    // 创建消息元素
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        const isOwnMessage = message.userId === this.userId;
        const isSystemMessage = message.type === 'system';

        if (isSystemMessage) {
            messageDiv.className = 'message system';
            messageDiv.innerHTML = `
                <div class="message-content">
                    <div class="message-text">${this.escapeHtml(message.content)}</div>
                </div>
            `;
        } else {
            messageDiv.className = `message ${isOwnMessage ? 'own' : ''}`;
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    ${message.userEmail ? message.userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">${this.getShortEmail(message.userEmail)}</span>
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                    </div>
                    <div class="message-text">${this.escapeHtml(message.content)}</div>
                </div>
            `;
        }

        return messageDiv;
    }

    // 发送消息
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();

        if (!content) return;

        try {
            // 禁用发送按钮
            const sendBtn = document.getElementById('sendBtn');
            sendBtn.disabled = true;

            const messageData = {
                userId: this.userId,
                userEmail: this.currentUser,
                userName: this.getShortEmail(this.currentUser),
                content: content,
                type: 'text'
            };

            await gitHubDataManager.sendMessage(this.currentRoom, messageData);

            // 清空输入框
            messageInput.value = '';
            messageInput.style.height = 'auto';
            this.updateSendButton();

            // 重新加载消息以显示新消息
            await this.loadMessages();

        } catch (error) {
            console.error('发送消息失败:', error);
            this.showNotification('发送消息失败，请重试', 'error');

            // 重新启用发送按钮
            const sendBtn = document.getElementById('sendBtn');
            sendBtn.disabled = false;
        }
    }

    // 发送系统消息
    async sendSystemMessage(content) {
        try {
            const messageData = {
                userId: 'system',
                userEmail: 'system',
                userName: '系统',
                content: content,
                type: 'system'
            };

            await gitHubDataManager.sendMessage(this.currentRoom, messageData);
        } catch (error) {
            console.error('发送系统消息失败:', error);
        }
    }

    // 开始轮询新消息
    startPolling() {
        this.pollInterval = setInterval(async () => {
            await this.checkNewMessages();
        }, 3000); // 每3秒检查一次新消息
    }

    // 检查新消息
    async checkNewMessages() {
        try {
            const newMessages = await gitHubDataManager.getChatMessages(this.currentRoom);

            if (newMessages.length > this.messages.length) {
                // 有新消息
                const newMessageCount = newMessages.length - this.messages.length;
                this.messages = newMessages;

                // 如果用户已经在底部，自动滚动到最新消息
                const messagesContainer = document.getElementById('messagesContainer');
                const isAtBottom = this.isScrolledToBottom(messagesContainer);

                this.renderMessages();

                if (isAtBottom) {
                    this.scrollToBottom();
                } else {
                    this.showNewMessageIndicator(newMessageCount);
                }

                this.lastMessageId = newMessages[newMessages.length - 1].id;
            }
        } catch (error) {
            console.error('检查新消息失败:', error);
        }
    }

    // 检查是否滚动到底部
    isScrolledToBottom(element) {
        return element.scrollHeight - element.scrollTop - element.clientHeight < 50;
    }

    // 滚动到底部
    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }

    // 显示新消息指示器
    showNewMessageIndicator(count) {
        let indicator = document.getElementById('newMessageIndicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'newMessageIndicator';
            indicator.className = 'new-message-indicator click-ripple';
            indicator.innerHTML = `${count} 条新消息`;

            indicator.addEventListener('click', () => {
                this.scrollToBottom();
                indicator.remove();
            });

            document.querySelector('.chat-main').appendChild(indicator);
        } else {
            indicator.innerHTML = `${count} 条新消息`;
        }
    }

    // 清空聊天
    async clearChat() {
        if (!confirm('确定要清空当前聊天室的所有消息吗？此操作不可撤销。')) {
            return;
        }

        try {
            // 这里需要实现清空聊天的逻辑
            // 由于GitHub API的限制，可能需要删除并重新创建文件
            this.showNotification('清空聊天功能开发中...', 'info');
        } catch (error) {
            console.error('清空聊天失败:', error);
            this.showNotification('清空聊天失败', 'error');
        }
    }

    // 加载在线用户
    async loadOnlineUsers() {
        try {
            this.onlineUsers = await gitHubDataManager.getOnlineUsers();
            this.renderOnlineUsers();
            document.getElementById('onlineCount').textContent = this.onlineUsers.length;
        } catch (error) {
            console.error('加载在线用户失败:', error);
            this.onlineUsers = [];
            this.renderOnlineUsers();
        }
    }

    // 渲染在线用户
    renderOnlineUsers() {
        const usersList = document.getElementById('usersList');
        if (!usersList) return;

        if (this.onlineUsers.length === 0) {
            usersList.innerHTML = `
                <div class="empty-users">
                    <i class="fas fa-user-slash"></i>
                    <p>暂无用户在线</p>
                </div>
            `;
            return;
        }

        usersList.innerHTML = '';
        this.onlineUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item click-ripple';
            userItem.innerHTML = `
                <div class="user-avatar">
                    ${user.userEmail ? user.userEmail.charAt(0).toUpperCase() : 'U'}
                </div>
                <div class="user-name">${this.getShortEmail(user.userEmail)}</div>
                <div class="user-status"></div>
            `;
            usersList.appendChild(userItem);
        });
    }

    // 更新在线状态
    async updateOnlineStatus() {
        if (this.userId && this.currentUser) {
            try {
                await gitHubDataManager.updateOnlineStatus(this.userId, this.currentUser, 'online');
            } catch (error) {
                console.error('更新在线状态失败:', error);
            }
        }
    }

    // 初始化点击特效
    initClickEffects() {
        document.addEventListener('click', function(e) {
            const clickableSelectors = [
                '.nav-link', '.action-btn', '.room-item', '.user-item',
                '.send-btn', '.new-room-btn', '.emoji', '.close-emoji',
                '.new-message-indicator', '.mobile-menu-btn'
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

    // 工具函数：格式化时间
    formatTime(timeString) {
        const time = new Date(timeString);
        const now = new Date();
        const diff = now - time;

        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return Math.floor(diff / 60000) + '分钟前';
        } else if (diff < 86400000) { // 1天内
            return Math.floor(diff / 3600000) + '小时前';
        } else {
            return time.toLocaleDateString();
        }
    }

    // 工具函数：HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 退出登录
    logout() {
        // 更新离线状态
        if (this.userId && this.currentUser) {
            gitHubDataManager.updateOnlineStatus(this.userId, this.currentUser, 'offline')
                .catch(console.error);
        }

        // 停止轮询
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }

        localStorage.removeItem('currentUser');
        localStorage.removeItem('userId');
        window.location.href = 'index.html';
    }
}

// 添加波纹动画样式
const chatStyles = document.createElement('style');
chatStyles.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(chatStyles);

// 初始化聊天管理器
const chatManager = new ChatManager();

// 页面可见性改变时更新在线状态
document.addEventListener('visibilitychange', function() {
    if (document.hidden && chatManager.userId && chatManager.currentUser) {
        // 页面隐藏时更新为离开状态
        gitHubDataManager.updateOnlineStatus(chatManager.userId, chatManager.currentUser, 'away')
            .catch(console.error);
    } else if (!document.hidden && chatManager.userId && chatManager.currentUser) {
        // 页面显示时更新为在线状态
        gitHubDataManager.updateOnlineStatus(chatManager.userId, chatManager.currentUser, 'online')
            .catch(console.error);
    }
});

// 页面卸载前更新状态
window.addEventListener('beforeunload', function() {
    if (chatManager.userId && chatManager.currentUser) {
        // 注意：这个请求可能不会完成，因为页面正在卸载
        fetch('https://api.github.com/repos/zhou-sir6668899/web-user-data/contents/sessions/online-users.json', {
            method: 'GET',
            headers: gitHubDataManager.headers
        }).catch(() => {});
    }
});

console.log('💬 聊天室已加载完成');