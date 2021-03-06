'use strict';
const { secret } = require('../../utils/token');
const jwt = require('jsonwebtoken');
// 校验token信息
module.exports = function connection() {
    return async (ctx, next) => {
        const { socket } = ctx;
        const { token } = socket.handshake.query;
        // 验证token
        try {
            // 没登录也要把默认群加到socket里，这样没登录才收的到消息
            const defaultGroup = await ctx.service.group.getDefaultGroup();
            if (!defaultGroup[0]) {
                return;
            }
            const { to_group_id } = defaultGroup[0];
            ctx.socket.join(to_group_id); // 默认群id
            const { id } = jwt.verify(token, secret);
            // 更新用户socket信息
            await ctx.service.user.update({
                id,
                socket_id: socket.id,
                status: 1
            });
            // 把room加进socket
            const groupList = await ctx.service.group.getGroupsByUserId(id);
            for (const item of groupList) {
                ctx.socket.join(item.to_group_id);
            }
            // 查用户信息
            const user = await ctx.service.user.findOne({
                id
            });
            if (!user) {
                return;
            }
            const { name, avatar } = user;
            // 返回通过登录验证消息
            socket.emit('auth', {
                login: true,
                userInfo: {
                    id,
                    username: name,
                    avatar
                }
            });

            await next();
        } catch (err) {
            if (err instanceof jwt.TokenExpiredError) {
                socket.emit('auth', {
                    login: false
                });
            }
            if (err instanceof jwt.JsonWebTokenError) {
                socket.emit('warn', '请登录后参与聊天哦');
                return;
            }
            socket.emit('error', err);
        }
    };
};
