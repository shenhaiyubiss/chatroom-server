'use strict';

const Controller = require('egg').Controller;

class DefaultController extends Controller {
    async sendMsg() {
        const { ctx, app } = this;
        const nsp = app.io.of('/');
        const [ message ] = ctx.args;
        // 向客户端广播消息， 在客户端监听broadcast事件就可以获取消息了
        const { insertId } = await ctx.service.messages.create(message);
        nsp.emit('broadcast', { message_id: insertId, message });
    }
}

module.exports = DefaultController;
