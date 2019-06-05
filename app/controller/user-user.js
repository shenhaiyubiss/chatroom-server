'use strict';

const Controller = require('egg').Controller;
const { isEmpty } = require('lodash');
const assert = require('assert');

class UserUserController extends Controller {
    /**
     * 主动加群
     */
    async create() {
        const { friend_id } = this.ctx.request.body;
        const { id } = this.ctx.service.auth.decodeToken();
        const ret = await this.app.mysql.query(
            'SELECT * FROM user_user_relation AS uu WHERE user_id = ? AND friend_id = ?',
            [id, friend_id]
        );
        assert(isEmpty(ret), '对方已经是你的好友');
        await this.app.mysql.insert('user_user_relation', {
            user_id: id,
            friend_id,
            created_at: new Date()
        });
        await this.app.mysql.insert('user_user_relation', {
            user_id: friend_id,
            friend_id: id,
            created_at: new Date()
        });

        this.ctx.body = {
            data: {}
        };
    }
}

module.exports = UserUserController;
