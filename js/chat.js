// 聊天室功能逻辑
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
        this.loadMessages();
        this.loadOnlineUsers();
        this.setupEventListeners();
        this.setupMessageInput();
        this.startSimulatedUpdates();
        this.updateStats();
    }

    // 检查登录状态 - 修改为验证GitHub数据
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

    // 加载消息历史
    loadMessages() {
        const savedMessages = localStorage.getItem('chatMessages');

        if (savedMessages) {
            this.messages = JSON.parse(savedMessages);
        } else {
            // 示例欢迎消息
            this.messages = [
                {
                    id: 1,
                    type: 'system',
                    content: '欢迎来到二手集市公共聊天室！在这里你可以自由交流闲置物品信息。',
                    time: new Date(Date.now() - 3600000).toISOString()
                },
                {
                    id: 2,
                    sender: 'system_bot',
                    type: 'user',
                    content: '💡 提示：发布求购信息时请尽量详细描述需求，这样更容易找到合适的商品哦！',
                    time: new Date(Date.now() - 1800000).toISOString()
                },
                {
                    id: 3,
                    sender: 'tech_lover@email.com',
                    type: 'user',
                    content: '大家好！我有一台iPhone 13 Pro要出，有需要的可以联系我～',
                    time: new Date(Date.now() - 1200000).toISOString()
                },
                {
                    id: 4,
                    sender: 'book_worm@email.com',
                    type: 'user',
                    content: '求购Java编程思想这本书，有的带价来！',
                    time: new Date(Date.now() - 600000).toISOString()
                },
                {
                    id: 5,
                    sender: 'audio_fan@email.com',
                    type: 'user',
                    content: '索尼XM4耳机使用体验真的很棒，降噪效果绝了 👍',
                    time: new Date(Date.now() - 300000).toISOString()
                }
            ];
            this.saveMessages();
        }

        this.renderMessages();
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
            messageDiv.className = `message ${isOwnMessage ? 'own' : 'other'}`;

            messageDiv.innerHTML = `
                <div class="message-bubble">
                    <div class="message-header">
                        <span class="message-sender">${this.getShortEmail(message.sender)}</span>
                        <span class="message-time">${this.formatTime(message.time)}</span>
                    </div>
                    <div class="message-content">${this.parseMessageContent(message.content)}</div>
                    <div class="message-actions">
                        <button class="action-btn" onclick="chatRoom.replyToMessage(${message.id})" title="回复">
                            <i class="fas fa-reply"></i>
                        </button>
                        <button class="action-btn" onclick="chatRoom.copyMessage(${message.id})" title="复制">
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

    // 发送消息
    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const content = messageInput.value.trim();

        if (!content) return;

        const newMessage = {
            id: Date.now(),
            sender: this.currentUser,
            type: 'user',
            content: content,
            time: new Date().toISOString()
        };

        // 添加到消息列表
        this.messages.push(newMessage);
        this.saveMessages();

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

        // 模拟其他用户回复（演示用）
        this.simulateReply(content);
    }

    // 模拟其他用户回复
    simulateReply(userMessage) {
        // 30%概率触发模拟回复
        if (Math.random() < 0.3) {
            setTimeout(() => {
                const replies = this.getSimulatedReplies(userMessage);
                const randomReply = replies[Math.floor(Math.random() * replies.length)];

                const botMessage = {
                    id: Date.now() + 1,
                    sender: this.getRandomOnlineUser(),
                    type: 'user',
                    content: randomReply,
                    time: new Date().toISOString()
                };

                this.messages.push(botMessage);
                this.saveMessages();

                const messageElement = this.createMessageElement(botMessage);
                document.getElementById('messagesContainer').appendChild(messageElement);

                this.scrollToBottom();
                this.showNotification('有新消息', 'info');

            }, 2000 + Math.random() * 3000); // 2-5秒后回复
        }
    }

    // 获取模拟回复
    getSimulatedReplies(userMessage) {
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('iphone') || lowerMessage.includes('手机')) {
            return [
                '什么型号的iPhone？多少钱？',
                '我正好想收个iPhone，能看看照片吗？',
                '用了多久了？电池健康度怎么样？'
            ];
        } else if (lowerMessage.includes('书') || lowerMessage.includes('教材')) {
            return [
                '我好像有这本书，晚上回家找找看',
                '什么版本的？第几版？',
                '电子版的需要吗？'
            ];
        } else if (lowerMessage.includes('耳机')) {
            return [
                '索尼XM4确实不错，我用的也是这个',
                '降噪效果怎么样？续航如何？',
                '多少钱出？有发票吗？'
            ];
        } else if (lowerMessage.includes('价格') || lowerMessage.includes('多少钱')) {
            return [
                '价格还能商量吗？',
                '这个价格包含运费吗？',
                '学生党，能便宜点吗？😊'
            ];
        } else {
            return [
                '听起来不错！',
                '能详细说说吗？',
                '有照片可以看看吗？',
                '支持面交吗？',
                '用了多久了？'
            ];
        }
    }

    // 获取随机在线用户（模拟回复用）
    getRandomOnlineUser() {
        const users = this.onlineUsers.filter(user => user.email !== this.currentUser);
        if (users.length === 0) return 'user' + Math.floor(Math.random() * 1000) + '@email.com';
        return users[Math.floor(Math.random() * users.length)].email;
    }

    // 加载在线用户
    loadOnlineUsers() {
        // 从本地存储加载或使用示例数据
        const savedUsers = localStorage.getItem('onlineUsers');

        if (savedUsers) {
            this.onlineUsers = JSON.parse(savedUsers);
        } else {
            this.onlineUsers = [
                { email: 'tech_lover@email.com', status: 'online', lastActive: new Date() },
                { email: 'book_worm@email.com', status: 'online', lastActive: new Date() },
                { email: 'audio_fan@email.com', status: 'online', lastActive: new Date() },
                { email: 'sneaker_head@email.com', status: 'online', lastActive: new Date() },
                { email: 'home_decor@email.com', status: 'online', lastActive: new Date() }
            ];
        }

        // 添加当前用户
        this.addUserToOnlineList(this.currentUser);
        this.renderOnlineUsers();
        this.updateOnlineCount();
    }

    // 添加用户到在线列表
    addUserToOnlineList(email) {
        if (!this.onlineUsers.find(user => user.email === email)) {
            this.onlineUsers.push({
                email: email,
                status: 'online',
                lastActive: new Date()
            });
            this.saveOnlineUsers();
        }
    }

    // 渲染在线用户列表
    renderOnlineUsers() {
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';

        this.onlineUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = `user-item ${user.email === this.currentUser ? 'active' : ''}`;
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
        document.getElementById('onlineCount').textContent = this.onlineUsers.length;
        document.getElementById('activeUsers').textContent = this.onlineUsers.length;
    }

    // 更新统计信息
    updateStats() {
        document.getElementById('totalMessages').textContent = this.messages.length;
    }

    // 开始模拟更新（在线用户变化、新消息等）
    startSimulatedUpdates() {
        // 模拟用户状态变化
        setInterval(() => {
            this.simulateUserActivity();
        }, 10000);

        // 模拟系统消息
        setInterval(() => {
            this.simulateSystemMessage();
        }, 60000);
    }

    // 模拟用户活动
    simulateUserActivity() {
        // 随机改变一个用户的狀態
        if (this.onlineUsers.length > 1 && Math.random() < 0.3) {
            const randomUser = this.onlineUsers[Math.floor(Math.random() * (this.onlineUsers.length - 1)) + 1];
            const statuses = ['online', 'away', 'busy'];
            randomUser.status = statuses[Math.floor(Math.random() * statuses.length)];
            randomUser.lastActive = new Date();

            this.renderOnlineUsers();
            this.showNotification(`${this.getShortEmail(randomUser.email)} 状态更新为 ${this.getStatusText(randomUser.status)}`, 'info');
        }
    }

    // 模拟系统消息
    simulateSystemMessage() {
        const systemMessages = [
            '💫 温馨提示：交易时请选择人多的公共场所，确保交易安全！',
            '🔔 新功能：现在支持快捷回复了，试试点击闪电图标吧！',
            '🌟 社区活跃度：今日已有 128 条交易信息发布',
            '📱 小贴士：在聊天中长按消息可以复制或回复'
        ];

        if (Math.random() < 0.4) { // 40%概率发送系统消息
            const systemMessage = {
                id: Date.now(),
                type: 'system',
                content: systemMessages[Math.floor(Math.random() * systemMessages.length)],
                time: new Date().toISOString()
            };

            this.messages.push(systemMessage);
            this.saveMessages();

            const messageElement = this.createMessageElement(systemMessage);
            document.getElementById('messagesContainer').appendChild(messageElement);

            this.scrollToBottom();
        }
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
            this.messages = this.messages.filter(msg => msg.type === 'system');
            this.saveMessages();
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

    // 工具函数：获取短邮箱
    getShortEmail(email) {
        return email.split('@')[0];
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

    // 保存数据到本地存储
    saveMessages() {
        localStorage.setItem('chatMessages', JSON.stringify(this.messages));
    }

    saveOnlineUsers() {
        localStorage.setItem('onlineUsers', JSON.stringify(this.onlineUsers));
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

// 初始化聊天室
const chatRoom = new ChatRoom();

// 页面卸载前保存状态
window.addEventListener('beforeunload', () => {
    // 在实际应用中，这里应该通知服务器用户离线
    console.log('用户离开聊天室');
});