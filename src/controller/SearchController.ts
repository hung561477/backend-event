import {Between, EntityManager, In, LessThan, Like, MoreThan, Not, Transaction, TransactionManager} from 'typeorm';
import {Body, HeaderParam, JsonController, Post} from 'routing-controllers';
import {SearchModel} from '../model/SearchModel';
import {checkUserToken} from '../middleware/Authentication';
import {ResponseObject} from '../model/response';
import {User} from '../entity/User';
import {Event} from '../entity/Event';
import {EnumImageType, EnumStatusEvent, EnumStatusUserEvent} from '../enum/Constant';
import {UserEvent} from '../entity/User-event';
import {Account} from '../entity/Account';
import {EventCarrer} from '../entity/Event-carrer';
import {EventAmenities} from '../entity/Event-amenities';
import {EventActivations} from '../entity/Event-activations';
import {Inventory} from '../entity/Inventory';
import {Image} from '../entity/Image';

@JsonController()
export class SearchController {

    private async search(user: User, manager: EntityManager, body: SearchModel) {
        const condition: any = {
            status: Not(EnumStatusEvent.delete)
        };
        let searchSQL = 'select * from event as e where ';

        if (body.keyword.length > 0) {
            searchSQL += '(';
            for (let i = 0; i < body.keyword.length; i++) {
                if (i === body.keyword.length - 1) {
                    searchSQL += ' e.name like "%' + body.keyword[i].value + '%" ) and';
                    break;
                }
                searchSQL += ' e.name like "%' + body.keyword[i].value + '%" or';
            }
            // condition.name = Like('%' + body.keyword + '%');
        }
        if (body.venue.length > 0) {
            searchSQL += '(';
            for (let i = 0; i < body.venue.length; i++) {
                if (i === body.venue.length - 1) {
                    searchSQL += ' e.venue like "%' + body.venue[i].value + '%" ) and';
                    break;
                }
                searchSQL += ' e.venue like "%' + body.venue[i].value + '%" or';
            }
            // condition.venue = Like('%' + body.venue + '%');
        }
        if (body.date_from && body.date_to) {
            searchSQL += ' e.date_from <= ? and e.date_from >= ?';
            // condition.date_from = Between(body.date_from, body.date_to);
        }
        // const event = await manager.find(Event, {
        //     where: condition
        // });

        const events = await manager.query(searchSQL, [body.date_to, body.date_from]);
        return await this.setStatusEvent(manager, user, events);
    }

    // Get Career and Activations , Amenities
    private async getCAA(event: any, manager: EntityManager) {
        const evCareer = await manager.find(EventCarrer, {relations: ['career'], where: {event: event}});
        const tempCareer: any = {
            value: []
        };
        evCareer.forEach(async (i: any) => {
            tempCareer.value.push(i.career);
            tempCareer.publish = i.publish;
        });
        event.career = tempCareer;
        const evAmenities = await manager.find(EventAmenities, {relations: ['amenities'], where: {event: event}});
        const tempAmenities: any = {
            value: []
        };
        evAmenities.forEach(async (i: any) => {
            tempAmenities.value.push(i.amenities);
            tempAmenities.publish = i.publish;
        });
        event.amenities = tempAmenities;
        const evActivations = await manager.find(EventActivations, {relations: ['activations'], where: {event: event}});
        const tempActivations: any = {
            value: []
        };
        evActivations.forEach(async (i: any) => {
            tempActivations.value.push(i.activations);
            tempActivations.publish = i.publish;
        });
        event.activations = tempActivations;
        return event;
    }

    private async setStatusEvent(manager: EntityManager, user: User, event: any) {
        const userEvent = await manager.find(UserEvent, {relations: ['event'], where: {user: user}});
        userEvent.forEach((i: any) => {
            event.forEach((j: any) => {
                if (i.event.id === j.id) {
                    j.userStatus = i.status;
                }
            });
        });
        return {event, count: event.length};
    }

    private async getInventoryOfEvent(event: Event, manager: EntityManager) {
        return await manager.find(Inventory, {where: {event}});
    }

    private async getImageForEvent(id: number, manager: EntityManager) {
        const temp: any = [];
        const image: any = await manager.find(Image, {relations: ['photo'], where: {typeId: id, type: EnumImageType.event}});
        if (image.length > 0) {
            image.forEach((i: any) => {
                temp.push(i.photo);
            });
            return temp;
        }
    }

    @Post('/search/event')
    @Transaction()
    async searchEvent(@Body() body: SearchModel,
                      @HeaderParam('token') token: string,
                      @checkUserToken() allowAccess: boolean,
                      @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account: account}});
            if (user.role.role === 'BUYER') {
                const result = await this.search(user, manager, body);
                for (let i = 0; i < result.event.length; i++) {
                    result.event[i].inventory = await this.getInventoryOfEvent(result.event[i], manager);
                    result.event[i].image = await this.getImageForEvent(result.event[i].id, manager);
                    result.event[i] = await this.getCAA(result.event[i], manager);
                    const countAllInventory = await manager.count(Inventory, {where: {event: result.event[i]}});
                    const countInventoryWishList = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [result.event[i].id, EnumStatusUserEvent.wishlist]);
                    const countInventoryReserve = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [result.event[i].id, EnumStatusUserEvent.reserved]);
                    const countInventorySold = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [result.event[i].id, EnumStatusUserEvent.sold]);
                    result.event[i].countInventoryAvailable = +countAllInventory - (+countInventoryWishList[0].total + +countInventoryReserve[0].total + +countInventorySold[0].total);
                    result.event[i].countInventoryWishlist = +countInventoryWishList[0].total;
                    result.event[i].countInventorySold = +countInventoryReserve[0].total + +countInventorySold[0].total;
                }
                return new ResponseObject(200, ' Success!', result);
            } else {
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }
}
