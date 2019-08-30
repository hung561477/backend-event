import {Body, HeaderParam, JsonController, Param, Post} from 'routing-controllers';
import {EntityManager, Transaction, TransactionManager} from 'typeorm';
import {ResponseObject} from '../model/response';
import {checkUserToken} from '../middleware/Authentication';
import {Account} from '../entity/Account';
import {User} from '../entity/User';
import {UserEvent} from '../entity/User-event';
import {Event} from '../entity/Event';
import formatDateTime from '../util/formatDateTime';

@JsonController()
export class UserEventController {
    @Post('/userevent/:id')
    @Transaction()
    async addStatusUserEvent(@HeaderParam('token') token: string,
                             @Param('id') id: number,
                             @Body() body: any,
                             @checkUserToken() allowAccess: boolean,
                             @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            // Check event isStatus
            const events = await manager.findOne(Event, {id: id});
            const account = await manager.findOne(Account, {where: {Token: token}});
            const user = await manager.findOne(User, {account: account});
            const isStatus = await manager.findOne(UserEvent, {event: events, user});
            const date = new Date();  // Date
            if (!isStatus) {
                const userEvent = new UserEvent();
                userEvent.event = events;
                userEvent.user = user;
                userEvent.create_date = formatDateTime(new Date(date.getTime()));
                userEvent.status = body.status;
                const result = await manager.save(userEvent);
                if (result) {
                    return new ResponseObject(201, 'Success!');
                }
            } else {
                if (isStatus.status === null) {
                    const resultUpdate = await manager.update(UserEvent, {id: isStatus.id}, {status: body.status});
                    if (resultUpdate.raw.changedRows > 0) {
                        return new ResponseObject(201, 'Change status success!');
                    }
                } else if (isStatus.status === body.status) {
                    const resultUpdate = await manager.update(UserEvent, {id: isStatus.id}, {status: null});
                    if (resultUpdate.raw.changedRows > 0) {
                        return new ResponseObject(201, 'Remove status success!');
                    }
                } else  {
                    const resultUpdate = await manager.update(UserEvent, {id: isStatus.id}, {status: body.status});
                    if (resultUpdate.raw.changedRows > 0) {
                        return new ResponseObject(201, 'Update status success!');
                    }
                }
            }
            return new ResponseObject(204, 'Failed!');
        }
        return new ResponseObject(203, 'Token Expire!');
    }
}
