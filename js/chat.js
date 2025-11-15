
// 真实聊天室功能逻辑
class ChatRoom {
    constructor() {
        this.currentUser = null;
        this.userId = null;
        this.messages = [];
        this.onlineUsers = [];
        this.emojiPickerVisible = false;
        this.quickRepliesVisible = false;
        this.init();
    }

    async init() {
        await this.checkLogin();
        this.loadRealMessages();
        this.loadRealOnlineUsers();
        this.setupEventListeners();
        this.setupMessageInput();
        this.startRealUpdates();
        this.updateStats();
        this.initClickEffects();
    }

    // 检查登录状态
    async checkLogin() {
        const savedUser = localStorage.getItem('currentUser');
        const savedUserId = localStorage.getItem('userId');

        if (!savedUser) {
            window.location.href = 'index.html';
            return;
        }

        try {
            // 验证用户是否在GitHub数据中存在
            const users = await gitHubDataManager.getAllUsers();
            const user = users.find(u => u.email === savedUser && u.status === 'active');

            if (!user) {
                throw new Error('用户不存在或已被禁用');
            }

            this.currentUser = savedUser;
            this.userId = savedUserId;

            console.log('✅ 聊天室用户验证成功:', this.currentUser);

        } catch (error) {
            console.error('❌ 聊天室用户验证失败:', error);
            this.showNotification('登录状态已过期，请重新登录', 'error');
            setTimeout(() => {
                this.logout();
            }, 2000);
        }
    }

    // 设置事件监听器
    setupEventListeners() {
        // 点击外部关闭表情选择器和快捷回复
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.emoji-picker') && !e.target.closest('.tool-btn:nth-child(1)')) {
                this.hideEmojiPicker();
            }
            if (!e.target.closest('.quick-replies') && !e.target.closest('.tool-btn:nth-child(2)')) {
                this.hideQuickReplies();
            }
        });

        // 窗口调整大小时重新布局
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // 初始化响应式布局
        this.handleResize();
    }

    // 设置消息输入框
    setupMessageInput() {
        const messageInput = document.getElementById('messageInput');

        // 自动调整高度
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // 回车发送消息，Shift+Enter换行
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // 输入时显示发送按钮状态
        messageInput.addEventListener('input', () => {
            this.updateSendButton();
        });
    }

    // 加载真实消息
    async loadRealMessages() {
        try {
            // 从GitHub数据获取真实消息
            this.messages = await this.getRealMessagesFromSource();
            this.renderMessages();
        } catch (error) {
            console.error('加载消息失败:', error);
            this.messages = [];
            this.renderMessages();
        }
    }

    // 从真实数据源获取消息
    async getRealMessagesFromSource() {
        // 这里应该从GitHub数据或其他真实数据源获取
        // 暂时返回空数组，表示没有消息
        return [];
    }

    // 渲染消息列表
    renderMessages() {
        const container = document.getElementById('messagesContainer');

        // 清空容器，但保留欢迎消息
        const welcomeMessage = container.querySelector('.welcome-message');
        container.innerHTML = '';
        if (welcomeMessage) {
            container.appendChild(welcomeMessage);
        }

        if (this.messages.length === 0) {
            // 如果没有消息，显示提示
            const noMessages = document.createElement('div');
            noMessages.className = 'no-messages';
            noMessages.innerHTML = `
                <div class="empty-messages">
                    <i class="fas fa-comment-slash"></i>
                    <h4>暂无聊天消息</h4>
                    <p>成为第一个发言的人吧！</p>
                </div>
            `;
            container.appendChild(noMessages);
            return;
        }

        this.messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        // 滚动到底部
        this.scrollToBottom();
    }

    // 创建消息元素
    createMessageElement(message) {
        const messageDiv = document.createElement('div');

        if (message.type === 'system') {
            messageDiv.className = 'system-message';
            messageDiv.innerHTML = `
                <div class="system-content">
                    ${message.content}
                </div>
            `;
        } else {
            const isOwnMessage = message.sender === this.currentUser;
            messageDiv.className = `message ${isOwnMessage ? 'own' : 'other'} click-ripple`;

            messageDiv.innerHTML = `
                <div class="message-bubble">
                    <div class="message-header">
                        <span class="message-sender">${this.getShortEmail(message.sender)}</span>
                        <span class="message-time">${this.formatTime(message.time)}</span>
                    </div>
                    <div class="message-content">${this.parseMessageContent(message.content)}</div>
                    <div class="message-actions">
                        <button class="action-btn click-ripple" onclick="chatRoom.replyToMessage('${message.id}')" title="回复">
                            <i class="fas fa-reply"></i>
                        </button>
                        <button class="action-btn click-ripple" onclick="chatRoom.copyMessage('${message.id}')" title="复制">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            `;
        }

        return messageDiv;
    }

    // 解析消息内容（处理表情和链接）
    parseMessageContent(content) {
        // 简单的URL检测和转换
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, '<a href="$1" target="_blank" style="color: inherit; text-decoration: underline;">$1</a>');

        return content;
    }

    // 发送真实消息
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();

        if (!content) {
            this.showNotification('请输入消息内容', 'error');
            return;
        }

        // 显示发送状态
        this.showNotification('发送中...', 'info');

        try {
            const newMessage = {
                id: Date.now().toString(),
                sender: this.currentUser,
                type: 'user',
                content: content,
                time: new Date().toISOString()
            };

            // 保存到真实数据源
            await this.saveRealMessage(newMessage);

            // 添加到消息列表
            this.messages.push(newMessage);

            // 渲染新消息
            const messageElement = this.createMessageElement(newMessage);
            document.getElementById('messagesContainer').appendChild(messageElement);

            // 清空输入框
            messageInput.value = '';
            messageInput.style.height = 'auto';
            this.updateSendButton();

            // 滚动到底部
            this.scrollToBottom();

            // 显示发送成功反馈
            this.showNotification('消息发送成功', 'success');

        } catch (error) {
            console.error('发送消息失败:', error);
            this.showNotification('消息发送失败', 'error');
        }
    }

    // 保存消息到真实数据源
    async saveRealMessage(message) {
        // 这里应该调用GitHub API保存消息
        // 暂时模拟保存成功
        console.log('保存消息:', message);
        return true;
    }

    // 加载真实在线用户
    async loadRealOnlineUsers() {
        try {
            // 从真实数据源获取在线用户
            this.onlineUsers = await this.getRealOnlineUsersFromSource();

            // 添加当前用户
            this.addUserToOnlineList(this.currentUser);
            this.renderOnlineUsers();
            this.updateOnlineCount();
        } catch (error) {
            console.error('加载在线用户失败:', error);
            this.onlineUsers = [];
            this.renderOnlineUsers();
        }
    }

    // 从真实数据源获取在线用户
    async getRealOnlineUsersFromSource() {
        // 这里应该从实时数据源获取在线用户
        // 暂时返回空数组
        return [];
    }

    // 添加用户到在线列表
    addUserToOnlineList(email) {
        if (!this.onlineUsers.find(user => user.email === email)) {
            this.onlineUsers.push({
                email: email,
                status: 'online',
                lastActive: new Date()
            });
        }
    }

    // 渲染在线用户列表
    renderOnlineUsers() {
        const usersList = document.getElementById('usersList');

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
            userItem.className = `user-item ${user.email === this.currentUser ? 'active' : ''} click-ripple`;
            userItem.innerHTML = `
                <div class="user-avatar">
                    ${user.email.charAt(0).toUpperCase()}
                </div>
                <div class="user-info">
                    <div class="user-name">${this.getShortEmail(user.email)}</div>
                    <div class="user-status">
                        <span class="status-indicator ${user.status}"></span>
                        ${this.getStatusText(user.status)}
                    </div>
                </div>
            `;

            // 点击用户开始私聊
            if (user.email !== this.currentUser) {
                userItem.style.cursor = 'pointer';
                userItem.addEventListener('click', () => {
                    this.startPrivateChat(user.email);
                });
            }

            usersList.appendChild(userItem);
        });
    }

    // 开始私聊
    startPrivateChat(userEmail) {
        this.showNotification(`开始与 ${this.getShortEmail(userEmail)} 私聊`, 'info');
        // 在实际应用中，这里会打开私聊窗口或跳转到私聊页面
    }

    // 更新在线用户计数
    updateOnlineCount() {
        const count = this.onlineUsers.length;
        document.getElementById('onlineCount').textContent = count;
        document.getElementById('activeUsers').textContent = count;
        document.getElementById('realOnlineCount').textContent = count;
    }

    // 更新统计信息
    updateStats() {
        document.getElementById('totalMessages').textContent = this.messages.length;
    }

    // 开始真实更新
    startRealUpdates() {
        // 每30秒更新一次在线用户
        setInterval(async () => {
            await this.loadRealOnlineUsers();
        }, 30000);

        // 每15秒更新一次消息
        setInterval(async () => {
            await this.loadRealMessages();
        }, 15000);
    }

    // 表情选择器功能
    toggleEmojiPicker() {
        this.emojiPickerVisible = !this.emojiPickerVisible;
        const emojiPicker = document.getElementById('emojiPicker');

        if (this.emojiPickerVisible) {
            emojiPicker.classList.add('show');
            this.hideQuickReplies();
        } else {
            emojiPicker.classList.remove('show');
        }
    }

    hideEmojiPicker() {
        this.emojiPickerVisible = false;
        document.getElementById('emojiPicker').classList.remove('show');
    }

    // 插入表情
    insertEmoji(emoji) {
        const messageInput = document.getElementById('messageInput');
        messageInput.value += emoji;
        messageInput.focus();
        this.hideEmojiPicker();
        this.updateSendButton();
    }

    // 快捷回复功能
    showQuickReplies() {
        this.quickRepliesVisible = true;
        document.getElementById('quickReplies').classList.add('show');
        this.hideEmojiPicker();
    }

    hideQuickReplies() {
        this.quickRepliesVisible = false;
        document.getElementById('quickReplies').classList.remove('show');
    }

    // 插入快捷回复
    insertQuickReply(text) {
        const messageInput = document.getElementById('messageInput');
        messageInput.value = text;
        messageInput.focus();
        this.hideQuickReplies();
        this.updateSendButton();
    }

    // 回复消息
    replyToMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message && message.type === 'user') {
            const messageInput = document.getElementById('messageInput');
            messageInput.value = `回复 ${this.getShortEmail(message.sender)}: `;
            messageInput.focus();
            this.updateSendButton();
        }
    }

    // 复制消息
    copyMessage(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (message) {
            navigator.clipboard.writeText(message.content).then(() => {
                this.showNotification('消息已复制到剪贴板', 'success');
            });
        }
    }

    // 清空聊天记录
    clearChat() {
        if (confirm('确定要清空所有聊天记录吗？此操作不可撤销。')) {
            this.messages = [];
            this.renderMessages();
            this.showNotification('聊天记录已清空', 'success');
        }
    }

    // 退出登录
    logout() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('userId');
        window.location.href = 'index.html';
    }

    // 显示通知
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type} show`;

        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // 更新发送按钮状态
    updateSendButton() {
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.querySelector('.send-btn');
        const hasText = messageInput.value.trim().length > 0;

        sendBtn.disabled = !hasText;
    }

    // 滚动到底部
    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }

    // 处理窗口大小变化
    handleResize() {
        const usersPanel = document.getElementById('usersPanel');
        if (window.innerWidth <= 768) {
            usersPanel.classList.remove('show');
        }
    }

    // 初始化点击特效
    initClickEffects() {
        document.addEventListener('click', function(e) {
            const clickableSelectors = [
                '.nav-btn', '.tool-btn', '.send-btn', '.user-item',
                '.action-btn', '.emoji', '.quick-reply', '.message-bubble',
                '.panel-close'
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

            element.appendChild(ripple);

            setTimeout(() => {
                if (ripple.parentNode === element) {
                    element.removeChild(ripple);
                }
            }, 600);
        }
    }

    // 工具函数：获取短邮箱
    getShortEmail(email) {
        return email ? email.split('@')[0] : '未知用户';
    }

    // 工具函数：格式化时间
    formatTime(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) { // 1分钟内
            return '刚刚';
        } else if (diff < 3600000) { // 1小时内
            return Math.floor(diff / 60000) + '分钟前';
        } else if (diff < 86400000) { // 1天内
            return Math.floor(diff / 3600000) + '小时前';
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    // 工具函数：获取状态文本
    getStatusText(status) {
        const statusMap = {
            'online': '在线',
            'away': '离开',
            'busy': '忙碌',
            'offline': '离线'
        };
        return statusMap[status] || '未知';
    }
}

// 全局函数供HTML调用
function toggleUsersPanel() {
    const usersPanel = document.getElementById('usersPanel');
    usersPanel.classList.toggle('show');
}

function toggleEmojiPicker() {
    chatRoom.toggleEmojiPicker();
}

function showQuickReplies() {
    chatRoom.showQuickReplies();
}

function insertEmoji(emoji) {
    chatRoom.insertEmoji(emoji);
}

function insertQuickReply(text) {
    chatRoom.insertQuickReply(text);
}

function sendMessage() {
    chatRoom.sendMessage();
}

function clearChat() {
    chatRoom.clearChat();
}

function attachImage() {
    chatRoom.showNotification('图片上传功能开发中', 'info');
}

// 添加空消息样式
const emptyMessagesStyles = document.createElement('style');
emptyMessagesStyles.textContent = `
    .no-messages {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 200px;
    }

    .empty-messages {
        text-align: center;
        color: rgba(255, 255, 255, 0.5);
    }

    .empty-messages i {
        font-size: 48px;
        margin-bottom: 15px;
        display: block;
        opacity: 0.6;
    }

    .empty-messages h4 {
        margin-bottom: 10px;
        color: rgba(255, 255, 255, 0.8);
    }

    .empty-messages p {
        margin: 0;
        font-size: 14px;
    }
`;
document.head.appendChild(emptyMessagesStyles);

// 初始化聊天室
const chatRoom = new ChatRoom();

// 页面卸载前保存状态
window.addEventListener('beforeunload', () => {
    console.log('用户离开真实聊天室');
});
