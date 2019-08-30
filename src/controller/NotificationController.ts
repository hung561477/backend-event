import {Body, Get, HeaderParam, JsonController, Param, Post, Put} from 'routing-controllers';
import {EntityManager, Transaction, TransactionManager} from 'typeorm';
import {checkUserToken} from '../middleware/Authentication';
import {Account} from '../entity/Account';
import {User} from '../entity/User';
import {ResponseObject} from '../model/response';
import {NotificationBell} from '../entity/Notification-bell';

@JsonController()
export class NotificationController {
    @Get('/notification/get')
    @Transaction()
    async getNotificationByToken(@HeaderParam('token') token: string,
                                 @checkUserToken() allowAccess: boolean,
                                 @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const listNotification = await manager.find(NotificationBell, {where: {user_id: account.id, status: true}});
            return new ResponseObject(200, 'List NotificationBell ', listNotification);
        }
        return new ResponseObject(203, 'Token Expire');
    }

    @Post('/notification/post/:id')
    @Transaction()
    async postNotificationHaveReaded(@HeaderParam('token') token: string,
                                     @Param('id') id: number,
                                     @Body() body: any,
                                     @checkUserToken() allowAccess: boolean,
                                     @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const result = await manager.update(NotificationBell, {id: id}, {status: false});
            if (result.raw.changedRows > 0) {
                return new ResponseObject(200, 'Notification ' + id + 'have reaed');
            } else {
                return  new ResponseObject(500, 'update notification false');
            }
        }
        return new ResponseObject(203, 'Token Expire');
    }

}
