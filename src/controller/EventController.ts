import {Body, Delete, Get, HeaderParam, JsonController, Param, Post, Put, UploadedFile} from 'routing-controllers';
import {checkUserToken} from '../middleware/Authentication';
import {Between, EntityManager, In, LessThan, MoreThan, Not, Transaction, TransactionManager} from 'typeorm';
import {Event} from '../entity/Event';
import {EventModel} from '../model/EventModel';
import {ResponseObject} from '../model/response';
import {Account} from '../entity/Account';
import {User} from '../entity/User';
import {EnumImageType, EnumStatusEvent, EnumStatusUserEvent} from '../enum/Constant';
import {UserEvent} from '../entity/User-event';
import formatDateTime from '../util/formatDateTime';
import {BUCKET_NAME, GCS_URL, HAPPENING_TIME} from '../app.config';
import {Photo} from '../entity/Photos';
import {Image} from '../entity/Image';
import {Inventory} from '../entity/Inventory';
import {deleteFilePromise, uploadImage, uploadImageNew} from '../util/uploadFilePromise';
import {Career} from '../entity/Career';
import {EventCarrer} from '../entity/Event-carrer';
import {Amenities} from '../entity/Amenities';
import {Activations} from '../entity/Activations';
import {EventAmenities} from '../entity/Event-amenities';
import {EventActivations} from '../entity/Event-activations';
import {InventoryCarrer} from '../entity/Inventory-carrer';
import {InventoryActivations} from '../entity/Inventory-activations';
import {InventoryAmenities} from '../entity/Inventory-amenities';
import {UserInventory} from '../entity/User-inventory';
import {fileUploadOptions} from '../middleware/FileUpload';

@JsonController()
export class EventController {

    private async getInventoryOfEvent(event: Event, manager: EntityManager) {
        const inventorys = await manager.find(Inventory, {where: {event}, relations: ['amenities', 'activations', 'career']});
        const temp: any = [];
        for (let i = 0; i < inventorys.length; i++) {
            const userInventory = await manager.find(UserInventory, {relations: ['inventory'], where: {inventory: inventorys[i]}});
            const inventory: any = await manager.find(Inventory, {where: {id: inventorys[i].id}});
            const inCareer = await manager.find(InventoryCarrer, {relations: ['career', 'inventory'], where: {inventory: {id: inventorys[i].id}}});
            const inActivations = await manager.find(InventoryActivations, {relations: ['activations', 'inventory'], where: {inventory: {id: inventorys[i].id}}});
            const inAmenities = await manager.find(InventoryAmenities, {relations: ['amenities', 'inventory'], where: {inventory: {id: inventorys[i].id}}});
            const temp1 = [];
            inCareer.forEach(async (e: any) => {
                temp1.push(e.career);
            });
            const temp2 = [];
            inActivations.forEach(async (e) => {
                temp2.push(e.activations);
            });
            const temp3 = [];
            inAmenities.forEach(async (e) => {
                temp3.push(e.amenities);
            });
            for (let j = 0; j < inventory.length; j++) {
                inventory[j].images = await this.getImageForInventory(inventory[j].id, manager);
                userInventory.forEach(async (userInven) => {
                    if (inventory[j].id === userInven.inventory.id) {
                        inventory[j].userStatus = userInven.status;
                    }
                });
                inventory[j].career = temp1;
                inventory[j].activations = temp2;
                inventory[j].amenities = temp3;
                temp.push(inventory[j]);
            }
        }
        return await temp;
    }

    private async getEventStatus(condition: any, manager: EntityManager) {
        const [userEvents, count] = await manager.findAndCount(UserEvent,
            {
                relations: ['event'], where: condition
            });
        const event: any = [];
        userEvents.forEach((i: any) => {
            i.event.userStatus = i.status;
            event.push(i.event);
        });
        for (let i = 0; i < event.length; i++) {
            event[i].image = await this.getImageForEvent(event[i].id, manager);
        }
        return {event, count};
    }

    private async getImageForInventory(id: number, manager: EntityManager) {
        const temp: any = [];
        const image: any = await manager.find(Image, {relations: ['photo'], where: {typeId: id, type: EnumImageType.inventory}});

        if (image.length > 0) {
            image.forEach((i: any) => {
                temp.push(i.photo);
            });
            return temp;
        }
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

    // Set day happening soon for event
    private async setHappeningTime(event: any) {
        const date = new Date();
        const replace = (days: any) => {
            return days.toISOString().replace(/([^T]+)T([^\.]+).*/g, '$1');
        };
        for (let i = 0; i < 31; i++) {
            const date_happening = replace(new Date(date.getTime() + ((24 * i) * 60 * 60000)));
            if (replace(event.date_from) === date_happening) {
                event.happening = i;
            }
        }
        return event;
    }

    private async parseJSONEvent(event: any) {
        if (event.age !== null) {
            event.age = JSON.parse(event.age);
        }
        if (event.gender !== null) {
            event.gender = JSON.parse(event.gender);
        }
        if (event.civil !== null) {
            event.civil = JSON.parse(event.civil);
        }
        if (event.household_income !== null) {
            event.household_income = JSON.parse(event.household_income);
        }
        if (event.residence_location !== null) {
            event.residence_location = JSON.parse(event.residence_location);
        }
        if (event.location !== null) {
            event.location = JSON.parse(event.location);
        }
        return event;
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
        const tempAmenities: any = [];
        evAmenities.forEach(async (i: any) => {
            tempAmenities.push(i.amenities);
        });
        event.amenities = tempAmenities;
        const evActivations = await manager.find(EventActivations, {relations: ['activations'], where: {event: event}});
        const tempActivations: any = [];
        evActivations.forEach(async (i: any) => {
            tempActivations.push(i.activations);
        });
        event.activations = tempActivations;
        return event;
    }


// GET EVENT SUMMARY BUYER
    @Get('/eventsummary/buyer')
    @Transaction()
    async getEventSummaryBuyer(@HeaderParam('token') token: string,
                               @checkUserToken() allowAccess: boolean,
                               @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
        const account = await manager.findOne(Account, {where: {token: token}});
        const user = await manager.findOne(User, {relations: ['role'], where: {account: account}});
        const date = new Date();
        const date_now = formatDateTime(new Date(date.getTime()));
        const dateStart = new Date(new Date().getFullYear(), 1, 1); // Month 1
        const dateEnd = new Date(new Date().getFullYear(), 12, 31); // Month 12
        const event = await manager.find(Event, {where: {date_to: LessThan(date_now)}});
        const condition: any = {sponsor_deadline: Between(dateStart, dateEnd)};
        const inventory: any = await manager.find(Inventory, {where: condition, relations: ['event']});
        const userInvenW = await manager.find(UserInventory, {relations: ['inventory'], where: {user: user, status: EnumStatusUserEvent.wishlist}});
        const userInvenR = await manager.find(UserInventory, {relations: ['inventory'], where: {user: user, status: EnumStatusUserEvent.reserved}});
        const temp: any = {
            wishlist: [],
            reserved: [],
            completed: []
        };
        const eventResult: any = {
            wishlist: {
                budget: 0,
                atendees: 0,
                gender: {
                    male: 0,
                    female: 0
                }
            },
            reserved: {
                budget: 0,
                atendees: 0,
                gender: {
                    male: 0,
                    female: 0
                }
            },
            completed: {
                budget: 0,
                atendees: 0,
                gender: {
                    male: 0,
                    female: 0
                }
            },
            total: {
                budget: 0,
                atendees: 0,
                gender: {
                    male: 0,
                    female: 0
                }
            }
        };
        for (let w = 0; w < userInvenW.length; w++) {
            const eventW = await manager.findOne(Inventory, {relations: ['event'], where: {id: userInvenW[w].inventory.id}});
            temp.wishlist.push(eventW);
            for (let i = 1; i < temp.wishlist.length; i++) {
                for (let j = 0; j < i; j++) {
                    if (temp.wishlist[i].event.id === temp.wishlist[j].event.id) {
                        temp.wishlist.shift(temp.wishlist[i]);
                    }
                }
            }
        }
        for (let w = 0; w < userInvenR.length; w++) {
            const eventR = await manager.findOne(Inventory, {relations: ['event'], where: {id: userInvenR[w].inventory.id}});
            temp.reserved.push(eventR);
            for (let i = 1; i < temp.reserved.length; i++) {
                for (let j = 0; j < i; j++) {
                    if (temp.reserved[i].event.id === temp.reserved[j].event.id) {
                        temp.reserved.shift(temp.reserved[i]);
                    }
                }
            }
        }
        for (let e = 0; e < event.length; e++) {
            temp.reserved.forEach((eR: any) => {
                if (eR.event.id === event[e].id) {
                    temp.completed.push(eR);
                }
            });
        }
        const age: any = {
            W: 0,
            R: 0,
            C: 0
        };
        const gender: any = {
            male: {
                W: 0,
                R: 0,
                C: 0
            },
            female: {
                W: 0,
                R: 0,
                C: 0
            }
        };
        eventResult.wishlist.event = temp.wishlist.length;
        eventResult.reserved.event = temp.reserved.length;
        eventResult.completed.event = temp.completed.length;
        temp.wishlist.forEach((eW: any) => {
            eventResult.wishlist.budget += eW.event.household_income.to;
            eventResult.wishlist.atendees += eW.event.size;
            age.W += eW.event.age.to;
            gender.male.W += eW.event.gender.male;
            gender.female.W += eW.event.gender.female;
        });
        temp.reserved.forEach((eR: any) => {
            eventResult.reserved.budget += eR.event.household_income.to;
            eventResult.reserved.atendees += eR.event.size;
            age.R += eR.event.age.to;
            gender.male.R += eR.event.gender.male;
            gender.female.R += eR.event.gender.female;
        });
        temp.completed.forEach((eC: any) => {
            eventResult.completed.budget += eC.event.household_income.to;
            eventResult.completed.atendees += eC.event.size;
            age.C += eC.event.age.to;
            gender.male.C += eC.event.gender.male;
            gender.female.C += eC.event.gender.female;
        });
        // Event Wishlist
        eventResult.wishlist.cost = eventResult.wishlist.budget / eventResult.wishlist.atendees === 0 ? 1 : eventResult.wishlist.atendees;
        eventResult.wishlist.age = age.W = null ? 0 : age.W / eventResult.wishlist.event === 0 ? 1 : eventResult.wishlist.event;
        eventResult.wishlist.gender.male = (gender.male.W = null ? 0 : gender.male.W / eventResult.wishlist.event === 0 ? 1 : eventResult.wishlist.event);
        eventResult.wishlist.gender.female = gender.female.W = null ? 0 : gender.female.W / eventResult.wishlist.event === 0 ? 1 : eventResult.wishlist.event ;

        // Event Reserved
        eventResult.reserved.cost = eventResult.reserved.budget / eventResult.reserved.atendees === 0 ? 1 : eventResult.reserved.atendees;
        eventResult.reserved.age = age.R / eventResult.reserved.event === 0 ? 1 : eventResult.reserved.event;
        eventResult.reserved.gender.male = gender.male.R / eventResult.reserved.event === 0 ? 1 : eventResult.reserved.event;
        eventResult.reserved.gender.female = gender.female.R / eventResult.reserved.event === 0 ? 1 : eventResult.reserved.event;

        // Event Completed
        eventResult.completed.cost = eventResult.completed.budget /  eventResult.completed.atendees === 0 ? 1 : eventResult.completed.atendees;
        eventResult.completed.age = age.C / eventResult.completed.event === 0 ? 1 : eventResult.completed.event;
        eventResult.completed.gender.male = gender.male.C / eventResult.completed.event === 0 ? 1 : eventResult.completed.event;
        eventResult.completed.gender.female = gender.female.C / eventResult.completed.event === 0 ? 1 : eventResult.completed.event;

        eventResult.total.event = temp.wishlist.length + temp.reserved.length + temp.completed.length;
        eventResult.total.budget = eventResult.wishlist.budget + eventResult.reserved.budget + eventResult.completed.budget;
        eventResult.total.atendees = eventResult.wishlist.atendees + eventResult.reserved.atendees + eventResult.completed.atendees;
        eventResult.total.cost = eventResult.total.budget / eventResult.total.atendees === 0 ? 1 : eventResult.total.atendees;
        eventResult.total.age = (eventResult.wishlist.age + eventResult.reserved.age + eventResult.completed.age) / 3;
        eventResult.total.gender.male = (eventResult.wishlist.gender.male + eventResult.reserved.gender.male + eventResult.completed.gender.male) / 3;
        eventResult.total.gender.female = (eventResult.wishlist.gender.female + eventResult.reserved.gender.female + eventResult.completed.gender.female) / 3;
        return new ResponseObject(200, 'Get Event Summary!', eventResult);
        }
        return new ResponseObject(203, 'Token expire!');
    }


    @Get('/happening/event/wishlist')
    @Transaction()
    async getEventHappeningWishlist(@HeaderParam('token') token: string,
                                    @checkUserToken() allowAccess: boolean,
                                    @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account: account}});
            const date = new Date();
            const dateOption: any = {};
            dateOption.end = new Date(date.getTime() + (HAPPENING_TIME * 60000));
            dateOption.start = new Date(date.getTime());
            const events = await manager.query(
                'SELECT e.* from event as e inner join inventory as i inner join user_inventory as u where u.userId = ? and u.status like ? and e.date_from >= ? and e.date_to <= ? group by e.id',
                [user.id, EnumStatusUserEvent.wishlist, dateOption.start, dateOption.end]);
            // const result: any = await this.getEventStatus(condition, manager);
            for (let i = 0; i < events.length; i++) {
                events[i] = await this.parseJSONEvent(events[i]);
                events[i].image = await this.getImageForEvent(events[i].id, manager);
            }
            return new ResponseObject(200, 'Get Wish List Event Suwccess!', {event: events});
        }
        return new ResponseObject(203, 'Token expire!');
    }

    // GET HAPPENING SOON RESERVED
    @Get('/happening/event/reserved')
    @Transaction()
    async getEventHappeningReserved(@HeaderParam('token') token: string,
                                    @checkUserToken() allowAccess: boolean,
                                    @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account: account}});
            const date = new Date();
            const dateOption: any = {};
            dateOption.end = new Date(date.getTime() + (HAPPENING_TIME * 60000));
            dateOption.start = new Date(date.getTime());
            const events = await manager.query(
                'SELECT e.* from event as e inner join inventory as i inner join user_inventory as u where u.userId = ? and u.status like ? and e.date_from >= ? and e.date_to <= ? group by e.id',
                [user.id, EnumStatusUserEvent.reserved, dateOption.start, dateOption.end]);
            // const result: any = await this.getEventStatus(condition, manager);
            for (let i = 0; i < events.length; i++) {
                events[i] = await this.parseJSONEvent(events[i]);
                events[i].image = await this.getImageForEvent(events[i].id, manager);
            }
            return new ResponseObject(200, 'Get Reserved Event Suwccess!', {event: events});
        }
        return new ResponseObject(203, 'Token expire!');
    }

// GET EVENT ALL SELLER
    @Get('/event/all/seller')
    @Transaction()
    async getEventAllSeller(@HeaderParam('token') token: string,
                            @checkUserToken() allowAccess: boolean,
                            @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            const date = new Date();
            const date_now = formatDateTime(new Date(date.getTime()));
            if (user.role.role === 'SELLER') {
                const events: any = await manager.find(Event, {where: {author: user, date_to: MoreThan(date_now), status: Not(EnumStatusEvent.delete)}});
                const eventSold = await manager.query(
                    'SELECT e.* from event as e inner join inventory as i inner join user_inventory as u where u.inventoryId = i.id and i.eventId = e.id and u.userId = ? and u.status like ? and e.date_from >= ? and e.date_to <= ? and e.status like ? group by e.id',
                    [user.id, EnumStatusUserEvent.sold, date_now, date_now, EnumStatusEvent.publish]);
                const eventOngoging = await manager.find(Event, {
                    where: {author: user, date_to: LessThan(date_now), status: EnumStatusEvent.publish}
                });
                for (let i = 0; i < events.length; i++) {
                    const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: events[i].id}, like: true});
                    events[i].like = countLike;
                    events[i].inventory = await this.getInventoryOfEvent(events[i], manager);
                    events[i].image = await this.getImageForEvent(events[i].id, manager);
                    const countAllInventory = await manager.count(Inventory, {where: {event: events[i]}});
                    const countInventoryWishList = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [events[i].id, EnumStatusUserEvent.wishlist]);
                    const countInventoryReserve = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [events[i].id, EnumStatusUserEvent.reserved]);
                    const countInventorySold = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [events[i].id, EnumStatusUserEvent.sold]);
                    events[i].countInventoryAvailable = +countAllInventory - (+countInventoryWishList[0].total + +countInventoryReserve[0].total + +countInventorySold[0].total);
                    events[i].countInventoryWishlist = +countInventoryWishList[0].total;
                    events[i].countInventorySold = +countInventoryReserve[0].total + +countInventorySold[0].total;
                    eventSold.forEach(async (eS) => {
                        if (events[i].id === eS.id) {
                            events[i].userStatus = 'SOLD';
                        }
                    });
                    eventOngoging.forEach(async (eO) => {
                        if (events[i].id === eO.id) {
                            events[i].userStatus = 'ONGOGING';
                        }
                    });
                    events[i] = await this.getCAA(events[i], manager);
                }
                return new ResponseObject(200, 'Event All', {events, count: events.length});
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }

// GET EVENT SOLD
    @Get('/sold/event')
    @Transaction()
    async getEventSold(@HeaderParam('token') token: string,
                       @checkUserToken() allowAccess: boolean,
                       @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const date = new Date();
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            const date_now = formatDateTime(new Date(date.getTime()));
            // const eventAll: any = await manager.find(Event, {
            //     where: {author: user, date_to: MoreThan(date_now), date_from: LessThan(date_now), status: EnumStatusEvent.publish}
            // });
            const events = await manager.query(
                'SELECT e.* from event as e inner join inventory as i inner join user_inventory as u where u.userId = ? and u.status like ? and e.date_from >= ? and e.date_to <= ? and e.status like ? group by e.id',
                [user.id, EnumStatusUserEvent.sold, date_now, date_now, EnumStatusEvent.publish]);
            for (let i = 0; i < events.length; i++) {
                const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: events[i], like: true, status: EnumStatusUserEvent.sold});
                events[i].like = countLike;
                events[i].userStatus = 'SOLD';
                events[i].inventory = await this.getInventoryOfEvent(events[i], manager);
                events[i].image = await this.getImageForEvent(events[i].id, manager);
                events[i] = await this.getCAA(events[i], manager);
                const countAllInventory = await manager.count(Inventory, {where: {event: events[i]}});
                const countInventoryWishList = await manager.query(
                    'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                    [events[i].id, EnumStatusUserEvent.wishlist]);
                const countInventoryReserve = await manager.query(
                    'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                    [events[i].id, EnumStatusUserEvent.reserved]);
                const countInventorySold = await manager.query(
                    'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                    [events[i].id, EnumStatusUserEvent.sold]);
                events[i].countInventoryAvailable = +countAllInventory - (+countInventoryWishList[0].total + +countInventoryReserve[0].total + +countInventorySold[0].total);
                events[i].countInventoryWishlist = +countInventoryWishList[0].total;
                events[i].countInventorySold = +countInventoryReserve[0].total + +countInventorySold[0].total;
            }
            return new ResponseObject(200, 'SOLD Event!', {event: events, count: events.length});
        }
        return new ResponseObject(203, 'Token Epxire!');
    }

// GET EVENT ONGOING
    @Get('/ongogin/event')
    @Transaction()
    async getEventOngoing(@HeaderParam('token') token: string,
                          @checkUserToken() allowAccess: boolean,
                          @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {account: account});
            const date = new Date();
            const date_now = formatDateTime(new Date(date.getTime()));
            const eventAll: any = await manager.find(Event, {
                where: {author: user, date_from: LessThan(date_now), date_to: MoreThan(date_now), status: EnumStatusEvent.publish}
            });
            console.log(eventAll);
            for (let i = 0; i < eventAll.length; i++) {
                const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: eventAll[i].id}, like: true});
                const countAllInventory = await manager.count(Inventory, {where: {event: eventAll[i]}});
                const countInventoryWishList = await manager.query(
                    'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                    [eventAll[i].id, EnumStatusUserEvent.wishlist]);
                const countInventoryReserve = await manager.query(
                    'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                    [eventAll[i].id, EnumStatusUserEvent.reserved]);
                const countInventorySold = await manager.query(
                    'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                    [eventAll[i].id, EnumStatusUserEvent.sold]);
                eventAll[i].countInventoryAvailable = +countAllInventory - (+countInventoryWishList[0].total + +countInventoryReserve[0].total + +countInventorySold[0].total);
                eventAll[i].countInventoryWishlist = +countInventoryWishList[0].total;
                eventAll[i].countInventorySold = +countInventoryReserve[0].total + +countInventorySold[0].total;
                eventAll[i].like = countLike;
                eventAll[i].userStatus = 'ONGOGING';
                eventAll[i].inventory = await this.getInventoryOfEvent(eventAll[i], manager);
                eventAll[i].image = await this.getImageForEvent(eventAll[i].id, manager);
                eventAll[i] = await this.getCAA(eventAll[i], manager);
            }
            return new ResponseObject(200, 'Ongoing Event!', {event: eventAll, count: eventAll.length});
        }
        return new ResponseObject(203, 'Token Epxire!');
    }

// GET EVENT ALL BUYER
    @Get('/event/all/buyer')
    @Transaction()
    async getEventAllBuyer(@HeaderParam('token') token: string,
                           @checkUserToken() allowAccess: boolean,
                           @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'BUYER') {
                const events: any = await manager.find(Event, {where: {status: EnumStatusEvent.publish}});
                const uEvent = await manager.find(UserEvent, {relations: ['event'], where: {user}});
                for (let i = 0; i < events.length; i++) {
                    const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: events[i].id}, like: true});
                    events[i].like = countLike;
                    events[i].inventory = await this.getInventoryOfEvent(events[i], manager);
                    events[i].image = await this.getImageForEvent(events[i].id, manager);
                    const countAllInventory = await manager.count(Inventory, {where: {event: events[i]}});
                    const countInventoryWishList = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [events[i].id, EnumStatusUserEvent.wishlist]);
                    const countInventoryReserve = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [events[i].id, EnumStatusUserEvent.reserved]);
                    const countInventorySold = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.id = uv.inventoryId and i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [events[i].id, EnumStatusUserEvent.sold]);
                    events[i].countInventoryAvailable = +countAllInventory - (+countInventoryWishList[0].total + +countInventoryReserve[0].total + +countInventorySold[0].total);
                    events[i].countInventoryWishlist = +countInventoryWishList[0].total;
                    events[i].countInventorySold = +countInventoryReserve[0].total + +countInventorySold[0].total;
                    uEvent.forEach(async (ue: any) => {
                        if (events[i].id === ue.event.id) {
                            events[i].userStatus = ue.status;
                        }
                    });
                }
                return new ResponseObject(200, 'Event All', {events, count: events.length});
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }


    // GET EVENT ALL BUYER
    @Get('/happening/event/all')
    @Transaction()
    async getEventHappeningAllBuyer(@HeaderParam('token') token: string,
                                    @checkUserToken() allowAccess: boolean,
                                    @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account: account}});
            const date = new Date();
            const dateOption: any = {};
            dateOption.end = new Date(date.getTime() + (HAPPENING_TIME * 60000));
            dateOption.start = new Date(date.getTime());
            const events = await manager.query(
                'SELECT e.* from event as e inner join inventory as i inner join user_inventory as u where u.userId = ? and e.date_from >= ? and e.date_to <= ? group by e.id',
                [user.id, dateOption.start, dateOption.end]);

            for (let i = 0; i < events.length; i++) {
                events[i] = await this.parseJSONEvent(events[i]);
                events[i].image = await this.getImageForEvent(events[i].id, manager);
            }
            return new ResponseObject(200, 'Get ALL Event Suwccess!', events);
        }
        return new ResponseObject(203, 'Token expire!');
    }

// GET EVENT COMPLETED
    @Get('/completed/event')
    @Transaction()
    async getEventCompleted(@HeaderParam('token') token: string,
                            @checkUserToken() allowAccess: boolean,
                            @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            const date = new Date();
            const date_now = formatDateTime(new Date(date.getTime()));
            if (user.role.role === 'BUYER') {
                const event: any = await manager.find(Event, {date_to: MoreThan(date_now), date_from: LessThan(date_now), status: EnumStatusEvent.publish});
                const uEvent = await manager.find(UserEvent, {
                    relations: ['event'], where: {
                        user, status: In([EnumStatusUserEvent.wishlist, EnumStatusUserEvent.reserved])
                    }
                });
                for (let i = 0; i < event.length; i++) {
                    const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: event[i].id}, like: true});
                    event[i].like = countLike;
                    event[i].inventory = await this.getInventoryOfEvent(event[i].event, manager);
                    event[i].image = await this.getImageForEvent(event[i].id, manager);
                    uEvent.forEach(async (uE) => {
                        if (event[i].id === uE.event.id) {
                            event[i].userStatus = uE.status;
                        }
                    });
                    event[i] = await this.getCAA(event[i], manager);
                }
                return new ResponseObject(200, 'Event Completed !!', {event, count: event.length});
            }
        }
        return new ResponseObject(203, 'Token Epxire!');
    }

// GET EVENT WISHLIST
    @Get('/wishlist/event')
    @Transaction()
    async getEventWishlist(@HeaderParam('token') token: string,
                           @checkUserToken() allowAccess: boolean,
                           @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'BUYER') {
                const temp: any = {};
                const ex: any = [];
                const event: any = await manager.find(UserEvent, {relations: ['event'], where: {user, status: EnumStatusUserEvent.wishlist}});
                if (event.length > 0) {
                    for (let i = 0; i < event.length; i++) {
                        const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: event[i].id}, like: true});
                        event[i].like = countLike;
                        event[i].event.inventory = await this.getInventoryOfEvent(event[i].event, manager);
                        event[i].event.image = await this.getImageForEvent(event[i].event.id, manager);
                        event[i].event.userStatus = event[i].status;
                        event[i] = await this.getCAA(event[i].event, manager);
                        ex.push(event[i]);
                        temp.event = ex;
                        temp.count = i + 1;
                    }
                } else {
                    temp.event = [];
                    temp.count = 0;
                }
                return new ResponseObject(200, 'Event Reserved !!', temp);
            }
        }
        return new ResponseObject(203, 'Token Epxire!');
    }

// GET EVENT RESERVED
    @Get('/reserved/event')
    @Transaction()
    async getEventReserved(@HeaderParam('token') token: string,
                           @checkUserToken() allowAccess: boolean,
                           @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'BUYER') {
                const temp: any = {};
                const ex: any = [];
                const event: any = await manager.find(UserEvent, {relations: ['event'], where: {user, status: EnumStatusUserEvent.reserved}});
                if (event.length > 0) {
                    for (let i = 0; i < event.length; i++) {
                        const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: event[i].id}, like: true});
                        event[i].like = countLike;
                        event[i].event.inventory = await this.getInventoryOfEvent(event[i].event, manager);
                        event[i].event.image = await this.getImageForEvent(event[i].event.id, manager);
                        event[i].event.userStatus = event[i].status;
                        event[i] = await this.getCAA(event[i].event, manager);
                        ex.push(event[i]);
                        temp.event = ex;
                        temp.count = i + 1;
                    }
                } else {
                    temp.event = [];
                    temp.count = 0;
                }
                return new ResponseObject(200, 'Event Reserved !!', temp);
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }

// GET EVENT TOP ONGOING
    @Get('/topongoing/event')
    @Transaction()
    async getEventTopOngoing(@HeaderParam('token') token: string,
                             @checkUserToken() allowAccess: boolean,
                             @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const date = new Date();
            const date_now = formatDateTime(new Date(date.getTime()));
            const eventAll: any = await manager.find(Event, {
                where: {date_to: MoreThan(date_now), date_from: LessThan(date_now), status: EnumStatusEvent.publish}
            });
            for (let i = 0; i < eventAll.length; i++) {
                const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: eventAll[i].id}, like: true});
                eventAll[i].like = countLike;
                eventAll[i].inventory = await this.getInventoryOfEvent(eventAll[i], manager);
                eventAll[i].image = await this.getImageForEvent(eventAll[i].id, manager);
                eventAll[i] = await this.getCAA(eventAll[i], manager);
                const [eventW, countW] = await manager.findAndCount(UserEvent, {
                    relations: ['event'],
                    where: {event: eventAll[i], status: EnumStatusUserEvent.wishlist}
                });
                eventAll[i].wishlist = countW;
            }
            return new ResponseObject(200, 'Top Ongoing Event!', {event: eventAll, count: eventAll.length});
        }
        return new ResponseObject(203, 'Token Expire!');
    }

// GET EVENT NOT PUBLISH
    @Get('/notpublish/event')
    @Transaction()
    async getEventNotPublish(@HeaderParam('token') token: string,
                             @checkUserToken() allowAccess: boolean,
                             @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'SELLER') {
                const event: any = await manager.find(Event, {where: {author: user, status: EnumStatusEvent.create}});
                for (let i = 0; i < event.length; i++) {
                    const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: event[i].id}, like: true});
                    event[i].like = countLike;
                    event[i].inventory = await this.getInventoryOfEvent(event[i], manager);
                    event[i].image = await this.getImageForEvent(event[i].id, manager);
                    event[i] = await this.getCAA(event[i], manager);
                }
                return new ResponseObject(200, 'Not Publish Event', {event, count: event.length});
            }
        }
        return new ResponseObject(203, 'Token expire!');
    }

    /** GET EVENT RECENTLY SOLD
     * Create By ZinT
     * @param token
     * @param allowAccess
     * @param manager
     */
    @Get('/recentsold/event')
    @Transaction()
    async getEventRecentlySold(@HeaderParam('token') token: string,
                               @checkUserToken() allowAccess: boolean,
                               @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'SELLER') {
                const date = new Date();
                const date_now = new Date(date.getTime());
                const temp: any = [];
                // const event: any = await manager.find(Event, {where: {author: user, status: EnumStatusEvent}});
                const events = await manager.query(
                    'SELECT e.* from event as e inner join inventory as i inner join user_inventory as u where u.inventoryId = i.id and i.eventId = e.id and e.authorId = ? and u.status like ? and e.status like ? group by e.id',
                    [user.id, EnumStatusUserEvent.sold, EnumStatusEvent.publish]);
                for (let i = 0; i < events.length; i++) {
                    const date30 = new Date(date.getTime() + ((24 * i) * 60 * 60000));
                    if (date30 > events[i].date_to.getTime() && date_now < events[i].date_to.getTime()) {
                        const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: events[i].id}, like: true});
                        events[i].like = countLike;
                        events[i].inventory = await this.getInventoryOfEvent(events[i], manager);
                        events[i].image = await this.getImageForEvent(events[i].id, manager);
                        events[i] = await this.getCAA(events[i], manager);
                        temp.push(events[i]);
                    }
                }
                return new ResponseObject(200, 'Event Wish list success', {event: temp, count: temp.length});
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }

    /**
     * GET PAST EVENT
     * Create By ZinT
     * @param token
     * @param id
     * @param allowAccess
     * @param body
     * @param manager
     */
    @Get('/past/event')
    @Transaction()
    async getPastEvent(@HeaderParam('token') token: string,
                       @checkUserToken() allowAccess: boolean,
                       @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'SELLER') {
                const date = new Date();
                const date_now = formatDateTime(new Date(date.getTime()));
                const events: any = await manager.find(Event, {where: {date_to: LessThan(date_now), status: EnumStatusEvent.publish, author: user}});
                for (let i = 0; i < events.length; i++) {
                    const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: events[i].id}, like: true});
                    events[i].like = countLike;
                    events[i].inventory = await this.getInventoryOfEvent(events[i], manager);
                    events[i].image = await this.getImageForEvent(events[i].id, manager);
                    events[i] = await this.getCAA(events[i], manager);
                    const countAllInventory = await manager.count(Inventory, {where: {event: events[i]}});
                    const countInventoryWishList = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [events[i].id, EnumStatusUserEvent.wishlist]);
                    const countInventoryReserve = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [events[i].id, EnumStatusUserEvent.reserved]);
                    const countInventorySold = await manager.query(
                        'select count(*) as total from (select i.id from inventory as i inner join user_inventory as uv where i.eventId = ? and uv.status like ?  group by i.id) as Z',
                        [events[i].id, EnumStatusUserEvent.sold]);
                    events[i].countInventoryAvailable = +countAllInventory - (+countInventoryWishList[0].total + +countInventoryReserve[0].total + +countInventorySold[0].total);
                    events[i].countInventoryWishlist = +countInventoryWishList[0].total;
                    events[i].countInventorySold = +countInventoryReserve[0].total + +countInventorySold[0].total;
                }
                return new ResponseObject(200, 'Past Event list success', {events, count: events.length});
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }

// CHANGE STATUS EVENT
    @Put('/changestatusevent/:id')
    @Transaction()
    async changeStatusEvent(@HeaderParam('token') token: string,
                            @Param('id') id: number,
                            @checkUserToken() allowAccess: boolean,
                            @Body() body: any,
                            @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const author = await manager.findOne(User, {account: account});
            // Publish event go live
            const result = await manager.update(
                Event,
                {id, author},
                {status: body.status}
            );
            if (result.raw.changedRows > 0) {
                return new ResponseObject(200, 'Change status success!');
            }
            return new ResponseObject(204, 'Update failed!!');
        }
        return new ResponseObject(203, 'Token expire!');
    }


    @Post('/event/like/:id')
    @Transaction()
    async likeEvent(@HeaderParam('token') token: string,
                    @Param('id') id: number,
                    @checkUserToken() allowAccess: boolean,
                    @TransactionManager() manager: EntityManager) {
        const event = await manager.findOne(Event, id);
        const account = await manager.findOne(Account, {where: {token: token}});
        const user = await manager.findOne(User, {account: account});
        const isLike = await manager.findOne(UserEvent, {event: event, user});
        if (allowAccess) {
            const date = new Date(); // Create Date Now
            if (!isLike) {
                const userEvent = new UserEvent();
                userEvent.like = true;
                userEvent.event = event;
                userEvent.user = user;
                userEvent.create_date = formatDateTime(new Date(date.getTime()));
                const result = await manager.save(userEvent);
                if (result) {
                    return new ResponseObject(201, 'Thanks!');
                }
            } else {
                const resultUpdate = await manager.update(UserEvent, {id: isLike.id, user}, {like: !isLike.like});
                return new ResponseObject(201, 'Thanks!');
            }
        }
        return new ResponseObject(203, 'Token expire');

    }


    /** GET EVENT DETAIL
     * Create By ZinT
     * @param token
     * @param allowAccess
     * @param id
     * @param manager
     */
    @Get('/event/detail/:id')
    @Transaction()
    async getDetailEvent(@HeaderParam('token') token: string,
                         @checkUserToken() allowAccess: boolean,
                         @Param('id') id: number,
                         @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            const eventGet: any = await manager.findOne(Event, {relations: ['author'], where: {id: +id}});
            if (eventGet.status === EnumStatusEvent.publish || eventGet.author.id === user.id) {
                await manager.update(Event, {id: eventGet.id}, {view: +eventGet.view + 1});
                const event: any = await manager.findOne(Event, id);
                const [eventLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: id}, like: true});
                event.like = countLike;
                event.image = await this.getImageForEvent(+id, manager);
                event.inventory = await this.getInventoryOfEvent(event, manager);
                const result = await this.getCAA(event, manager);
                return new ResponseObject(200, 'Event Detail!', result);
            }
        }
        return new ResponseObject(203, 'Token expire');
    }

    /** EDIT EVENT DONE
     * Create By ZinT
     * @param token
     * @param id
     * @param allowAccess
     * @param body
     * @param manager
     */
    @Put('/event/:id')
    @Transaction()
    async updateEvent(@HeaderParam('token') token: string,
                      @Param('id') id: number,
                      @checkUserToken() allowAccess: boolean,
                      @Body({options: {limit: '20mb'}}) body: EventModel,
                      @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const author = await manager.findOne(User, {account: account});
            const event: any = await manager.findOne(Event, {id, author});
            const result = await manager.update(
                Event,
                {id: id, author},
                {
                    name: body.name,
                    location: body.location,
                    venue: body.venue,
                    date_from: new Date(body.date_from),
                    date_to: new Date(body.date_to),
                    edition: body.edition,
                    sponsor_deadline: body.sponsor_deadline,
                    description: body.description,
                    url: body.url,
                    social_link: body.social_link,
                    ticket_price: body.ticket_price,
                    tag: body.tag,
                    tag_search: body.tag_search,
                    size: body.size,
                    // INSERT CAREER
                    age: body.age,
                    gender: body.gender,
                    civil: body.civil,
                    household_income: body.household_income,
                    residence_location: body.residence_location,
                    active: body.active,
                    country_code: body.country_code,
                    // event_amenities: body.event_amenities,
                    // event_activation: body.event_activation,
                });
            // Find image for SQL cloud
            const imgServer = await manager.find(Image, {
                relations: ['photo'],
                where: {typeId: +id, type: EnumImageType.event}
            });
            // Delete image on server Google cloud storage
            if (imgServer !== undefined) {
                for (let i = 0; i < imgServer.length; i++) {
                    const photo = await manager.findOne(Photo, {where: {id: imgServer[i].photo.id}});
                    // deleteFilePromise({name: photo.url.replace(`${GCS_URL}${BUCKET_NAME}/`, '')})
                    //     .then(async () => {
                    await manager.delete(Image, {type: EnumImageType.event, typeId: event.id});
                    await manager.delete(Photo, {id: imgServer[i].photo.id});
                    result.raw.changedRows = 20;
                    // });
                }
            }
            // Upload file image on gcloud
            for (const item of body.images) {
                const photo = new Photo();
                photo.description = '';
                photo.url = item.url;
                const resultPhoto = await manager.save(photo);
                if (resultPhoto) {
                    const image = new Image();
                    image.type = EnumImageType.event;
                    image.typeId = +id;
                    image.photo = photo;
                    await manager.save(image);
                }
            }
            event.image = await this.getImageForEvent(+id, manager);
            // Find inventory on server
            const inventoryServer = await manager.find(Inventory, {
                relations: ['event'],
                where: {event: event}
            });
            // INSERT CAREER
            if (body.career !== undefined) {
                // DELETE CAREER FOR SQL
                await manager.delete(EventCarrer, {event: event});
                const temp: any = {
                    value: []
                };
                // SET CAREER FOR SQL
                for (const car of body.career.value) {
                    const career = await manager.findOne(Career, {where: {id: car.id}});
                    const careers = await manager.save(EventCarrer, {event, career, publish: body.career.publish});
                    temp.publish = careers.publish;
                    temp.value.push(careers.career);
                    result.raw.changedRows = 21;
                }
                event.career = temp;
            } else {
                result.raw.changedRows = 21;
                event.career = null;
            }

            // INSERT AMENITIES
            if (body.event_amenities !== undefined) {
                // DELETE AMENITIES FOR SQL
                await manager.delete(EventAmenities, {event: event});
                // SAVE AMENITIES FOR SQL
                for (const ame of body.event_amenities) {
                    const amenities = await manager.findOne(Amenities, {where: {id: ame.id}});
                    await manager.save(EventAmenities, {event, amenities});
                }
                const evAmenities = await manager.find(EventAmenities, {relations: ['amenities'], where: {event: event}});
                const temp: any = [];
                evAmenities.forEach(async (i: any) => {
                    temp.push(i.amenities);
                    result.raw.changedRows = 21;
                });
                event.amenities = temp;
            } else {
                result.raw.changedRows = 21;
                event.amenities = null;
            }

            // INSERT ACTIVATIONS
            if (body.event_activations !== undefined) {
                // DELETE ACTIVATIONS FOR SQL
                await manager.delete(EventActivations, {event: event});
                // SAVE ACTIVATIONS FOR SQL
                for (const act of body.event_activations) {
                    const activations = await manager.findOne(Activations, {where: {id: act.id}});
                    await manager.save(EventActivations, {event, activations});
                }
                const evActivations = await manager.find(EventActivations, {relations: ['activations'], where: {event: event}});
                const temp: any = [];
                evActivations.forEach(async (i: any) => {
                    temp.push(i.activations);
                    result.raw.changedRows = 21;
                });
                event.activations = temp;
            } else {
                result.raw.changedRows = 21;
                event.activations = null;
            }

            if (result.raw.changedRows > 0) {
                return new ResponseObject(200, 'Edit success!', {event: event, count: 1});
            }
        }
        return new ResponseObject(203, 'Token expire!');
    }

    /** DELETE EVENT
     * Create By ZinT
     * @param token
     * @param allowAccess
     * @param id
     * @param manager
     */
    @Delete('/event/:id')
    @Transaction()
    async deleteEvent(@HeaderParam('token') token: string,
                      @checkUserToken() allowAccess: boolean,
                      @Param('id') id: number,
                      @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {account: account});
            const event = await manager.update(
                Event,
                {author: user, id},
                {status: EnumStatusEvent.delete});
            if (event.raw.changedRows > 0) {
                return new ResponseObject(205, 'Delete done!');
            }
            return new ResponseObject(204, 'Delete failed');
        }
        return new ResponseObject(203, 'Token Expire!');
    }


    @Post('/event/image')
    @Transaction()
    async uploadEventImage(@HeaderParam('token') token: string,
                           @UploadedFile('image', {options: fileUploadOptions}) file: any,
                           @checkUserToken() allowAccess: boolean,
                           @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const url = await uploadImageNew(file, manager);
            return new ResponseObject(200, 'upload picture success!', {url: url});
        } else {
            return new ResponseObject(203, 'Token Expire!');
        }
    }

    /** CREATE EVENT DONE
     * Create By ZinT
     * @param token
     * @param id
     * @param body
     * @param allowAccess
     * @param manager
     */
    @Post('/event')
    @Transaction()
    async createEvent(@HeaderParam('token') token: string,
                      @Body({options: {limit: '50mb'}}) body: EventModel,
                      @checkUserToken() allowAccess: boolean,
                      @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            // Check user
            const account = await manager.findOne(Account, {where: {token: token}});
            // await manager.update(Inventory, 1, {name: 'inventory 1', event: ev});
            const event = new Event();
            const date = new Date();  // Date
            // Auto create

            event.author = await manager.findOne(User, {account: account});
            event.create_date = formatDateTime(new Date(date.getTime()));
            event.status = EnumStatusEvent.create;
            event.view = 0;
            // Step 1

            event.name = body.name;
            event.location = body.location;
            event.venue = body.venue;
            event.date_from = new Date(body.date_from);
            event.date_to = new Date(body.date_to);
            event.edition = body.edition;
            event.sponsor_deadline = body.sponsor_deadline;
            event.description = body.description;
            event.url = body.url;
            event.social_link = body.social_link;
            event.ticket_price = body.ticket_price;
            event.country_code = body.country_code ;
            // Step 2

            event.tag = body.tag;
            event.tag_search = body.tag_search;
            event.size = body.size;
            // INSERT CAREER (1)
            event.age = body.age;
            event.gender = body.gender;
            event.civil = body.civil;
            event.household_income = body.household_income;
            event.residence_location = body.residence_location;

            /** Step 3
             * INSERT IMAGES (2)
             * INSERT AMENITIES (3)
             * INSERT ACTIVATIONS (4)
             **/
            event.active = body.active;
            if (event.date_from < event.date_to) {
                const eventRes = await manager.save(event);
                // ACTION (1)
                if (body.career !== undefined) {
                    for (const car of body.career.value) {
                        const career = await manager.findOne(Career, {where: {id: car.id}});
                        await manager.save(EventCarrer, {event, career, publish: body.career.publish});
                    }
                    const evCareer = await manager.find(EventCarrer, {relations: ['career'], where: {event: event}});
                    const temp: any = {
                        value: []
                    };
                    evCareer.forEach(async (i: any) => {
                        temp.value.push(i.career);
                        temp.publish = i.publish;
                    });
                    event.career = temp;
                } else {
                    event.career = null;
                }
                // ACTION (2)
                for (const item of body.images) {
                    const photo = new Photo();
                    photo.description = '';
                    photo.url = item.url;
                    const result = await manager.save(photo);
                    if (result) {
                        const image = new Image();
                        image.type = EnumImageType.event;
                        image.typeId = eventRes.id;
                        image.photo = photo;
                        await manager.save(image);
                    }
                }
                // ACTION (3)
                if (body.event_amenities !== undefined) {
                    for (let i = 0; i < body.event_amenities.length; i++) {
                        const amenities = await manager.findOne(Amenities, {where: {id: body.event_amenities[i].id}});
                        const eventAmenities = new EventAmenities();
                        eventAmenities.event = event;
                        eventAmenities.amenities = amenities;
                        const ame = await manager.save(eventAmenities);
                    }
                    const evAmenities = await manager.find(EventAmenities, {relations: ['amenities'], where: {event: event}});
                    const temp: any = [];
                    evAmenities.forEach(async (i: any) => {
                        temp.push(i.amenities);
                    });
                    event.amenities = temp;
                } else {
                    event.amenities = null;
                }
                // ACTION (4)
                if (body.event_activations !== undefined) {
                    for (const act of body.event_activations) {
                        const activations = await manager.findOne(Activations, {where: {id: act.id}});
                        await manager.save(EventActivations, {event, activations});
                    }
                    const evActivations = await manager.find(EventActivations, {relations: ['activations'], where: {event: event}});
                    const temp: any = [];
                    evActivations.forEach(async (i: any) => {
                        temp.push(i.activations);
                    });
                    event.activations = temp;
                } else {
                    event.activations = null;
                }
                // // Step 4
                // for (const item of body.inventory) {
                //     await manager.update(Inventory, {id: item.id}, {event});
                // }
                return new ResponseObject(201, 'Create event success!', eventRes);
            }
            return new ResponseObject(205, 'Date From & Date ');

        }

        return new ResponseObject(203, 'Token Expire!');
    }
}
