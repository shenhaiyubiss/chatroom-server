'use strict';
module.exports = app => {
    return class ChatService extends app.Service {
        /**
         * 根据用户id获取他的好友列表
         * @param {number} uid 用户id
         */
        async getFriendListById(uid) {
            const data = [uid];
            const sql =
                'SELECT u.id,u.name,u.avatar,u.created_at,u.status FROM user_user_relation AS uu INNER JOIN user AS u ON uu.friend_id = u.id WHERE uu.user_id = ?';
            const originList = await this.app.mysql.query(sql, data);
            return this.joinMsgInfoToPrivateList(originList, uid);
        }

        /**
         * 根据用户id获取他加的群组列表
         * @param {number} uid 用户id
         */
        async getGroupListById(uid) {
            const originList = await this.app.mysql.query(
                'SELECT * FROM group_user_relation AS gu JOIN group_info AS g ON gu.to_group_id = g.to_group_id WHERE gu.user_id = ?',
                [uid]
            );
            const msgInfoList = await this.joinMsgInfoToGroupList(originList);
            return await this.joinUnReadCountToGroupList(msgInfoList);
        }

        /**
         * 没登录的默认群
         */
        async getDefaultGroup() {
            const originList = await this.app.mysql.select('group_info', {
                where: {
                    to_group_id: 'cb437f5a-7557-11e9-8f9e-2a86e4085a59'
                }
            });
            return await this.joinMsgInfoToGroupList(originList);
        }

        /**
         * 给群列表加上最新消息
         * @param {array} originList 原始群列表
         */
        async joinMsgInfoToGroupList(originList) {
            return await Promise.all(
                originList.map(async item => {
                    const { to_group_id } = item;
                    const ret = await this.ctx.service.groupMsg.getHistoryList({
                        groupId: to_group_id,
                        page: 1,
                        size: 1
                    });
                    if (!ret[0]) {
                        // 新建的群或没消息的群
                        return item;
                    }
                    const { message, from_user_id, created_at } = ret[0];
                    const { name } = await this.ctx.service.user.findOne({
                        id: from_user_id
                    });
                    return {
                        ...item,
                        lastest_message_info: {
                            from_user_id,
                            from_user_name: name,
                            last_message: message,
                            created_at
                        }
                    };
                })
            );
        }

        /**
         * 给群列表加上未读消息数
         * @param {arrat} originList 原始群列表
         */
        async joinUnReadCountToGroupList(originList) {
            const { id: uid } = this.ctx.service.auth.decodeToken();
            return await Promise.all(
                originList.map(async item => {
                    const { to_group_id } = item;
                    const ret = await this.app.mysql.query(
                        'SELECT latest_read_time FROM group_user_relation as gu where gu.to_group_id = ? and gu.user_id = ?',
                        [to_group_id, uid]
                    );
                    const { latest_read_time } = ret[0];
                    const ret2 = await this.app.mysql.query(
                        'SELECT count(created_at) as unread FROM group_msg as g where UNIX_TIMESTAMP(g.created_at) > UNIX_TIMESTAMP(?) and g.to_group_id = ?',
                        [latest_read_time, to_group_id]
                    );
                    return {
                        ...item,
                        ...ret2[0]
                    };
                })
            );
        }

        /**
         * 给私聊列表加上最新消息
         * @param {array} originList 原始群列表
         * @param {number} from_user_id 发送方id
         */
        async joinMsgInfoToPrivateList(originList, from_user_id) {
            return await Promise.all(
                originList.map(async item => {
                    const { id } = item;
                    const ret = await this.ctx.service.privateMsg.getHistoryList(
                        {
                            from_user_id,
                            to_user_id: id,
                            page: 1,
                            size: 1
                        }
                    );
                    if (!ret[0]) {
                        return item;
                    }
                    const { message, created_at } = ret[0];
                    return {
                        ...item,
                        lastest_message_info: {
                            last_message: message,
                            created_at
                        }
                    };
                })
            );
        }
    };
};
