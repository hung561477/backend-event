import {Body, Delete, Get, HeaderParam, JsonController, Param, Post, Put, UploadedFile} from 'routing-controllers';
import {EntityManager, LessThan, MoreThan, Transaction, TransactionManager, Not, IsNull} from 'typeorm';
import {checkUserToken} from '../middleware/Authentication';
import {InventoryModel} from '../model/InventoryModel';
import {Inventory} from '../entity/Inventory';
import {ResponseObject} from '../model/response';
import {Activations} from '../entity/Activations';
import {EventCarrer} from '../entity/Event-carrer';
import {EventAmenities} from '../entity/Event-amenities';
import {EventActivations} from '../entity/Event-activations';
import {Career} from '../entity/Career';
import {Amenities} from '../entity/Amenities';
import {InventoryAmenities} from '../entity/Inventory-amenities';
import {InventoryActivations} from '../entity/Inventory-activations';
import {InventoryCarrer} from '../entity/Inventory-carrer';
import {EnumImageType, EnumStatusEvent, EnumStatusUserEvent} from '../enum/Constant';
import {UserEvent} from '../entity/User-event';
import {Account} from '../entity/Account';
import {User} from '../entity/User';
import {UserInventory} from '../entity/User-inventory';
import {Event} from '../entity/Event';
import {Image} from '../entity/Image';
import {deleteFilePromise, uploadImage, uploadImageNew} from '../util/uploadFilePromise';
import formatDateTime from '../util/formatDateTime';
import {Photo} from '../entity/Photos';
import {BUCKET_NAME, GCS_URL} from '../app.config';
import {fileUploadOptions} from '../middleware/FileUpload';

@JsonController()
export class InventoryController {

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

    private async getInventoryOfEvent(event: Event, manager: EntityManager) {
        const inventorys: any = await manager.find(Inventory, {where: {event}, relations: ['amenities', 'activations', 'career']});
        const temp = [];
        for (let i = 0; i < inventorys.length; i++) {
            const inventory = await manager.find(Inventory, {where: {id: inventorys[i].id}});
            const inCareer = await manager.find(InventoryCarrer, {relations: ['career', 'inventory'], where: {inventory: {id: inventorys[i].id}}});
            const inActivations = await manager.find(InventoryActivations, {relations: ['activations', 'inventory'], where: {inventory: {id: inventorys[i].id}}});
            const inAmenities = await manager.find(InventoryAmenities, {relations: ['amenities', 'inventory'], where: {inventory: {id: inventorys[i].id}}});
            const temp1 = [];
            inCareer.forEach(async (item: any) => {
                temp1.push(item.career);
            });
            const temp2 = [];
            inActivations.forEach(async (item: any) => {
                temp2.push(item.activations);
            });
            const temp3 = [];
            inAmenities.forEach(async (item: any) => {
                temp3.push(item.amenities);
            });
            inventory.forEach((item: any) => {
                item.career = temp1;
                item.activations = temp2;
                item.amenities = temp3;
                temp.push(i);
            });
        }
        return await temp;
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

    private async getUserStatus(id: number, userInventory: any) {
        let status = '';
        for (let u = 0; u < userInventory.length; u++) {
            if (userInventory[u].inventory.id === id) {
                status = userInventory[u].status;
            }
        }
        return status;
    }

    @Post('/inventory/image')
    @Transaction()
    async uploadInventoryImage(@HeaderParam('token') token: string,
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

// CREATE INVENTORY
    @Post('/inventory')
    @Transaction()
    async createInventory(@HeaderParam('token') token: string,
                          @Body({options: {limit: '20mb'}}) body: InventoryModel,
                          @checkUserToken() allowAccess: boolean,
                          @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const inventory: any = new Inventory();
            inventory.status = '';
            inventory.name = body.name;
            inventory.tag = body.tag;
            inventory.budget_from = body.budget_from;
            inventory.budget_to = body.budget_to;
            inventory.kind_sponsorship = body.kind_sponsorship;
            inventory.description = body.description;
            inventory.sponsorship_deadline = body.sponsorship_deadline;
            inventory.size = body.size;
            inventory.tag_search = body.tag_search;
            // VALUE OF EVENT INPUT
            inventory.age = body.age;
            inventory.gender = body.gender;
            // INSERT CAREER (1)
            inventory.civil = body.civil;
            inventory.household_income = body.household_income;
            inventory.residence_location = body.residence_location;
            // INSERT AMENITIES (2)
            // INSERT ACTIVATIONS (3)
            // SAVE INVENTORY SQL
            const result: any = await manager.save(inventory);

            // ACTION (0)
            // if (body.images !== undefined) {
            //     for (const item of body.images) {
            //         await uploadImage(item, manager, {type: 'inventory', value: inventory});
            //     }
            //     result.image = await this.getImageForInventory(result.id, manager);
            // }
            // ACTION (1)
            if (body.career !== undefined) {
                // SET CAREER FOR SQL
                for (const car of body.career) {
                    const career = await manager.findOne(Career, {where: {id: car.id}});
                    await manager.save(InventoryCarrer, {inventory, career});
                }
                // GET CAREER ON SQL
                const inCareer = await manager.find(InventoryCarrer, {relations: ['career'], where: {inventory: result}});
                const temp = [];
                inCareer.forEach(async (i: any) => {
                    temp.push(i.career);
                });
                result.career = temp;
            } else {
                inventory.career = null;
            }
            // ACTION (2)
            if (body.amenities !== undefined) {
                // SET AMENITIES FOR SQL
                for (const ame of body.amenities) {
                    const amenities = await manager.findOne(Amenities, {where: {id: ame.id}});
                    await manager.save(InventoryAmenities, {inventory, amenities});
                }
                // GET AMENITIES ON SQL
                const inAmenities = await manager.find(InventoryAmenities, {relations: ['amenities'], where: {inventory: result}});
                const temp = [];
                inAmenities.forEach(async (i: any) => {
                    temp.push(i.amenities);
                });
                result.amenities = temp;
            } else {
                inventory.amenities = null;
            }
            // ACTION (3)
            if (body.activations !== undefined) {
                // SET ACTIVATIONS FOR SQL
                for (const act of body.activations) {
                    const activations = await manager.findOne(Activations, {where: {id: act.id}});
                    await manager.save(InventoryActivations, {inventory, activations});
                }
                // GET ACTIVATIONS ON SQL
                const inActivations: any = await manager.find(InventoryActivations, {relations: ['activations'], where: {inventory: result}});
                const temp = [];
                inActivations.forEach(async (i) => {
                    temp.push(i.activations);
                });
                result.activations = temp;
            } else {
                inventory.activations = null;
            }
            return new ResponseObject(200, ' Create inventory!', result);
        }
        return new ResponseObject(203, 'Token expire!!');
    }

    @Post('/inventorys')
    @Transaction()
    async createNewInventory(@HeaderParam('token') token: string,
                             @Body({options: {limit: '50mb'}}) body: InventoryModel[],
                             @checkUserToken() allowAccess: boolean,
                             @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const currentEvent = await manager.findOne(Event, {where: {id: body[0].eventId}});
            for (let inven = 0; inven < body.length; inven++) {
                const inventory = new Inventory();
                inventory.status = '';
                inventory.name = body[inven].name;
                inventory.tag = body[inven].tag;
                inventory.budget_from = body[inven].budget_from;
                inventory.budget_to = body[inven].budget_to;
                inventory.kind_sponsorship = body[inven].kind_sponsorship;
                inventory.description = body[inven].description;
                inventory.sponsorship_deadline = body[inven].sponsorship_deadline == null ? new Date() : body[inven].sponsorship_deadline;
                inventory.size = body[inven].size;
                inventory.tag_search = body[inven].tag_search;
                inventory.date_from = new Date(body[inven].date_from);
                ;
                inventory.date_to = new Date(body[inven].date_to);
                ;
                // VALUE OF EVENT INPUT
                inventory.age = body[inven].age;
                inventory.gender = body[inven].gender;
                // INSERT CAREER (1)
                inventory.civil = body[inven].civil;
                inventory.household_income = body[inven].household_income;
                inventory.residence_location = body[inven].residence_location;
                inventory.event = currentEvent;
                // INSERT AMENITIES (2)
                // INSERT ACTIVATIONS (3)
                // SAVE INVENTORY SQL
                const result: any = await manager.save(inventory);

                // ACTION (0)
                if (body[inven].images !== undefined) {
                    for (const item of body[inven].images) {
                        const photo = new Photo();
                        photo.description = '';
                        photo.url = item.url;
                        const resultPhoto = await manager.save(photo);
                        if (resultPhoto) {
                            const image = new Image();
                            image.type = EnumImageType.inventory;
                            image.typeId = result.id;
                            image.photo = photo;
                            await manager.save(image);
                        }
                    }
                    result.image = await this.getImageForInventory(result.id, manager);
                }
                // ACTION (1)
                if (body[inven].career !== undefined) {
                    // SET CAREER FOR SQL
                    for (const car of body[inven].career) {
                        const career = await manager.findOne(Career, {where: {id: car.id}});
                        await manager.save(InventoryCarrer, {inventory, career});
                    }
                    // GET CAREER ON SQL
                    const inCareer = await manager.find(InventoryCarrer, {relations: ['career'], where: {inventory: result}});
                    const temp = [];
                    inCareer.forEach(async (i: any) => {
                        temp.push(i.career);
                    });
                    result.career = temp;
                } else {
                    inventory.career = null;
                }
                // ACTION (2)
                if (body[inven].amenities !== undefined) {
                    // SET AMENITIES FOR SQL
                    for (const ame of body[inven].amenities) {
                        const amenities = await manager.findOne(Amenities, {where: {id: ame.id}});
                        await manager.save(InventoryAmenities, {inventory, amenities});
                    }
                    // GET AMENITIES ON SQL
                    const inAmenities = await manager.find(InventoryAmenities, {relations: ['amenities'], where: {inventory: result}});
                    const temp = [];
                    inAmenities.forEach(async (i: any) => {
                        temp.push(i.amenities);
                    });
                    result.amenities = temp;
                } else {
                    inventory.amenities = null;
                }
                // ACTION (3)
                if (body[inven].activations !== undefined) {
                    // SET ACTIVATIONS FOR SQL
                    for (const act of body[inven].activations) {
                        const activations = await manager.findOne(Activations, {where: {id: act.id}});
                        await manager.save(InventoryActivations, {inventory, activations});
                    }
                    // GET ACTIVATIONS ON SQL
                    const inActivations: any = await manager.find(InventoryActivations, {relations: ['activations'], where: {inventory: result}});
                    const temp = [];
                    inActivations.forEach(async (i) => {
                        temp.push(i.activations);
                    });
                    result.activations = temp;
                } else {
                    inventory.activations = null;
                }

            }
            return new ResponseObject(200, ' Create inventorys!');
        }
        return new ResponseObject(203, 'Token expire!!');
    }

    @Delete('/inventory/:id')
    @Transaction()
    async deleteInven(@HeaderParam('token') token: string,
                      @checkUserToken() allowAccess: boolean,
                      @Param('id') id: number,
                      @TransactionManager() manager: EntityManager
    ) {
        if (allowAccess) {
            const inventory = await manager.findOne(Inventory, {where: {id: id}});
            if (inventory !== undefined) {
                const statusAmeities = await manager.delete(InventoryActivations, {inventory: inventory});
                const statusActivation = await manager.delete(InventoryActivations, {inventory: inventory});
                const statusCarrer = await manager.delete(InventoryCarrer, {inventory: inventory});
                const status = await manager.delete(Inventory, {id: id});
                console.log(status.raw.affectedRows)
                if (status.raw.affectedRows > 0) {
                    await manager.delete(Image, {type: EnumImageType.inventory, typeId: id});
                    return new ResponseObject(205, 'Delete done!');
                } else {
                    return new ResponseObject(204, 'Delete failed');
                }
            }else {
                return new ResponseObject(404, 'not found inventory');
            }
        } else {
            return new ResponseObject(203, 'Token expire!');
        }
    }

// EDITED INVENTORY
    @Put('/inventory/:id')
    @Transaction()
    async editInventory(@HeaderParam('token') token: string,
                        @Body({options: {limit: '20mb'}}) body: InventoryModel,
                        @Param('id') id: number,
                        @checkUserToken() allowAccess: boolean,
                        @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const result = await manager.update(Inventory,
                {id},
                {
                    name: body.name,
                    tag: body.tag,
                    budget_from: body.budget_from,
                    budget_to: body.budget_to,
                    kind_sponsorship: body.kind_sponsorship,
                    description: body.description,
                    sponsorship_deadline: body.sponsorship_deadline,
                    date_from: new Date(body.date_from),
                    date_to: new Date(body.date_to),
                    size: body.size,
                    age: body.age,
                    gender: body.gender,
                    tag_search: body.tag_search,
                    // INSERT CAREER (1)
                    civil: body.civil,
                    household_income: body.household_income,
                    residence_location: body.residence_location
                    // INSERT AMENITIES (2)
                    // INSERT ACTIVATIONS (3)
                });
            const inventory: any = await manager.findOne(Inventory, id);
            // ACTION (0)
            // Find image for SQL cloud
            const iServer = await manager.find(Image, {
                relations: ['photo'],
                where: {typeId: +id, type: EnumImageType.inventory}
            });
            // Delete image on server Google cloud storage
            for (let i = 0; i < iServer.length; i++) {
                const photo = await manager.findOne(Photo, {where: {id: iServer[i].photo.id}});
                // deleteFilePromise({name: photo.url.replace(`${GCS_URL}${BUCKET_NAME}/`, '')})
                //     .then(async () => {
                await manager.delete(Image, {type: EnumImageType.inventory, typeId: inventory.id});
                await manager.delete(Photo, {id: iServer[i].photo.id});
                result.raw.changedRows = 20;
                // });
            }// Upload file image on gcloud
            for (const item of body.images) {
                const photo = new Photo();
                photo.description = '';
                photo.url = item.url;
                const resultPhoto = await manager.save(photo);
                if (resultPhoto) {
                    const image = new Image();
                    image.type = EnumImageType.inventory;
                    image.typeId = +id;
                    image.photo = photo;
                    await manager.save(image);
                }
            }
            inventory.image = await this.getImageForInventory(+id, manager);

            if (body.career !== undefined) {
                // DELETE CAREER FOR SQL
                await manager.delete(InventoryCarrer, {inventory: inventory});
                // SET CAREER FOR SQL
                const temp = [];
                for (const car of body.career) {
                    const career = await manager.findOne(Career, {where: {id: car.id}});
                    temp.push(career);
                    await manager.save(InventoryCarrer, {inventory: inventory, career: career});
                }
                inventory.career = temp;
            } else {
                inventory.career = null;
            }
            // ACTION (2)
            if (body.amenities !== undefined) {
                // DELETE AMENITIES FOR SQL
                await manager.delete(InventoryAmenities, {inventory: inventory});
                // SET AMENITIES FOR SQL
                const temp = [];
                for (const ame of body.amenities) {
                    const amenities = await manager.findOne(Amenities, {where: {id: ame.id}});
                    temp.push(amenities);
                    await manager.save(InventoryAmenities, {inventory: inventory, amenities: amenities});
                }
                inventory.amenities = temp;
            } else {
                inventory.amenities = null;
            }
            // ACTION (3)
            if (body.activations !== undefined) {
                // DELETE ACTIVATIONS FOR SQL
                await manager.delete(InventoryActivations, {inventory: inventory});
                // SET ACTIVATIONS FOR SQL
                const temp = [];
                for (const act of body.activations) {
                    const activations = await manager.findOne(Activations, {where: {id: act.id}});
                    temp.push(activations);
                    await manager.save(InventoryActivations, {inventory: inventory, activations: activations});
                }
                inventory.activations = temp;
            } else {
                inventory.activations = null;
            }
            return new ResponseObject(200, 'Inventory Edit Success!', inventory);
        }
        return new ResponseObject(203, 'Token expire!');
    }

// GET INVENTORY
    @Get('/inventory/:id')
    @Transaction()
    async getInventory(@HeaderParam('token') token: string,
                       @Param('id') id: number,
                       @checkUserToken() allowAccess: boolean,
                       @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const inventory = await manager.find(Inventory, {where: {id}});
            const inCareer = await manager.find(InventoryCarrer, {relations: ['career', 'inventory'], where: {inventory: {id}}});
            const inActivations = await manager.find(InventoryActivations, {relations: ['activations', 'inventory'], where: {inventory: {id}}});
            const inAmenities = await manager.find(InventoryAmenities, {relations: ['amenities', 'inventory'], where: {inventory: {id}}});
            const temp1 = [];
            inCareer.forEach(async (i: any) => {
                temp1.push(i.career);
            });
            const temp2 = [];
            inActivations.forEach(async (i) => {
                temp2.push(i.activations);
            });
            const temp3 = [];
            inAmenities.forEach(async (i) => {
                temp3.push(i.amenities);
            });
            let temp4: any = [];
            for (let i = 0; i < inventory.length; i++) {
                temp4 = await this.getImageForInventory(+inventory[i].id, manager);
            }

            inventory.forEach((i: any) => {
                i.career = temp1;
                i.activations = temp2;
                i.amenities = temp3;
                i.image = temp4;
            });
            return new ResponseObject(200, 'Inventory Detail', inventory);
        }
        return new ResponseObject(203, 'Token expire!');
    }


// GET INVENTORY WISHLIST BUYER
    @Get('/wishlist/inventory')
    @Transaction()
    async getInventoryWishlist(@HeaderParam('token') token: string,
                               @checkUserToken() allowAccess: boolean,
                               @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'BUYER') {
                const inventory = await manager.find(UserInventory, {relations: ['inventory'], where: {user, status: EnumStatusUserEvent.wishlist}});
                const temp = [];
                let inve: any;
                for (let i = 0; i < inventory.length; i++) {
                    inve = await manager.find(Inventory, {relations: ['event'], where: {id: inventory[i].inventory.id}});
                    inve[0].userStatus = EnumStatusUserEvent.wishlist;
                    const event: any = await manager.findOne(Event, {id: inve[0].event.id});
                    const [inventoryLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: inve[0].event.id}, like: true});
                    event.like = countLike;
                    event.image = await this.getImageForEvent(+inve[0].event.id, manager);
                    inve[0].image = await this.getImageForInventory(+inventory[i].inventory.id, manager);
                    event.inventory = await this.getInventoryOfEvent(event, manager);
                    inve[0].event = await this.getCAA(event, manager);
                    temp.push(inve[0]);
                }
                return new ResponseObject(200, 'Event Wishlist !!', {inventory: temp, count: temp.length});
            }
        }
        return new ResponseObject(203, 'Token Epxire!');
    }

// GET EVENT RESERVED
    @Get('/reserved/inventory')
    @Transaction()
    async getInventoryReserved(@HeaderParam('token') token: string,
                               @checkUserToken() allowAccess: boolean,
                               @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'BUYER') {
                const inventory = await manager.find(UserInventory, {relations: ['inventory'], where: {user, status: EnumStatusUserEvent.reserved}});
                const temp = [];
                let inve: any;
                for (let i = 0; i < inventory.length; i++) {
                    inve = await manager.find(Inventory, {relations: ['event'], where: {id: inventory[i].inventory.id}});
                    inve[0].userStatus = EnumStatusUserEvent.reserved;
                    const event: any = await manager.findOne(Event, {id: inve[0].event.id});
                    const [inventoryLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: inve[0].event.id}, like: true});
                    event.like = countLike;
                    event.image = await this.getImageForEvent(+inve[0].event.id, manager);
                    inve[0].image = await this.getImageForInventory(+inventory[i].inventory.id, manager);
                    event.inventory = await this.getInventoryOfEvent(event, manager);
                    inve[0].event = await this.getCAA(event, manager);
                    temp.push(inve[0]);
                }
                return new ResponseObject(200, 'Event Reserved !!', {inventory: temp, count: temp.length});
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }

// GET INVENTORY ALL BUYER
    @Get('/inventory/all/buyer')
    @Transaction()
    async getInventoryAllBuyer(@HeaderParam('token') token: string,
                               @checkUserToken() allowAccess: boolean,
                               @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'BUYER') {
                const inventoryIds = await manager.query(
                    'select i.id,uv.status from inventory as i inner join user_inventory as uv where uv.userId = ? and uv.inventoryId = i.id and (uv.status like ? or uv.status like ?)',
                    [user.id, EnumStatusUserEvent.wishlist, EnumStatusUserEvent.reserved]);
                const inventorys: any = [];
                for (let i = 0; i < inventoryIds.length; i++) {
                    const inventory: any = await manager.findOne(Inventory, {where: {id: inventoryIds[i].id}, relations: ['event']});
                    const [inventoryLike, countLike] = await manager.findAndCount(UserEvent, {event: inventory.event, like: true});
                    if (inventory.event !== null) {
                        inventory.event.like = countLike;
                        inventory.event.image = await this.getImageForEvent(inventory.event.id, manager);
                        inventory.event = await this.getCAA(inventory.event, manager);
                    }
                    inventory.image = await this.getImageForInventory(inventory.id, manager);
                    inventory.userStatus = inventoryIds[i].status;
                    inventorys.push(inventory);
                }
                return new ResponseObject(200, 'Event All', {inventory: inventorys, count: inventorys.length});
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }

    @Post('/inventorys/chart')
    @Transaction()
    async getInventorysChart(@HeaderParam('token') token: string,
                             @checkUserToken() allowAccess: boolean,
                             @Body({options: {limit: '20mb'}}) body: any,
                             @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'BUYER') {
                const inventoryIds = await manager.query(
                    'select i.id,uv.status from inventory as i inner join user_inventory as uv where uv.userId = ? and uv.inventoryId = i.id and (uv.status like ? or uv.status like ? or uv.status like ?)',
                    [user.id, EnumStatusUserEvent.wishlist, EnumStatusUserEvent.reserved, EnumStatusUserEvent.sold]);
                const res = [];
                const element = {
                    code: '',
                    value: 0,
                    longtitude: 0,
                    latitude: 0,
                    status: ''
                };
                for (let i = 0; i < inventoryIds.length; i++) {
                    const event = await manager.findOne(Event, {where: {id: inventoryIds[i].id, date_from: LessThan(body.date_from)}});
                    if (event) {
                        if (event.country_code !== undefined) {
                            const code = {...element};
                            code.code = event.country_code;
                            code.latitude = event.location.latitude;
                            code.longtitude = event.location.longtitude;
                            code.status = inventoryIds[i].status;
                            code.value = 1;
                            res.push(code);
                        }
                    }
                }
                for (let i = 0; i < res.length; i++) {
                    for (let j = i + 1; j < res.length; j++) {
                        if (res[i].code === res[j].code) {
                            res[i].value += +res[j].value;
                            res.splice(j, 1);
                        }
                    }
                }
                //console.log(res)
                return new ResponseObject(200, 'Inventorys All', res);
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }

// GET INVENTORY ALL BUYER
    @Get('/chart/buyer')
    @Transaction()
    async getChartBuyer(@HeaderParam('token') token: string,
                        @checkUserToken() allowAccess: boolean,
                        @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            if (user.role.role === 'BUYER') {
                const userInven = await manager.find(UserInventory, {relations: ['inventory'], where: {user}});
                const inventory: any = await manager.find(Inventory, {relations: ['event'], where: {event: Not(IsNull())}});
                console.log(inventory);
                for (let i = 0; i < inventory.length; i++) {
                    const [inventoryLike, countLike] = await manager.findAndCount(UserEvent, {event: {id: inventory[i].event.id}, like: true});
                    inventory[i].event.like = countLike;
                    inventory[i].image = await this.getImageForInventory(inventory[i].id, manager);
                    inventory[i].event.image = await this.getImageForEvent(inventory[i].event.id, manager);
                    inventory[i].event = await this.getCAA(inventory[i].event, manager);
                    inventory[i].userStatus = await this.getUserStatus(inventory[i].id, userInven);
                }
                const temp: any = {
                    jan: {wishlist: 0, reserved: 0, sold: 0}, feb: {wishlist: 0, reserved: 0, sold: 0}, mar: {wishlist: 0, reserved: 0, sold: 0},
                    apr: {wishlist: 0, reserved: 0, sold: 0}, may: {wishlist: 0, reserved: 0, sold: 0}, jun: {wishlist: 0, reserved: 0, sold: 0},
                    jul: {wishlist: 0, reserved: 0, sold: 0}, aug: {wishlist: 0, reserved: 0, sold: 0}, sep: {wishlist: 0, reserved: 0, sold: 0},
                    oct: {wishlist: 0, reserved: 0, sold: 0}, nov: {wishlist: 0, reserved: 0, sold: 0}, dec: {wishlist: 0, reserved: 0, sold: 0}
                };
                for (let i = 0; i < inventory.length; i++) {
                    if (inventory[i].event.date_to.getMonth() + 1 === 1) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.jan.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.jan.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.jan.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 2) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.feb.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.feb.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.feb.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 3) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.mar.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.mar.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.mar.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 4) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.apr.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.apr.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.apr.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 5) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.may.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.may.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.may.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 6) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.jun.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.jun.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.jun.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 7) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.jul.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.jul.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.jul.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 8) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.aug.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.aug.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.aug.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 9) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.sep.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.sep.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.sep.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 10) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.oct.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.oct.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.oct.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 11) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.nov.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.nov.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.nov.sold += inventory[i].size;
                        }
                    } else if (inventory[i].event.date_to.getMonth() + 1 === 12) {
                        if (inventory[i].userStatus === EnumStatusUserEvent.wishlist) {
                            temp.dec.wishlist += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.reserved) {
                            temp.dec.reserved += inventory[i].size;
                        } else if (inventory[i].userStatus === EnumStatusUserEvent.sold) {
                            temp.dec.sold += inventory[i].size;
                        }
                    }
                }
                return new ResponseObject(200, 'Event All', temp);
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }


// GET INVENTORY ALL SELLER
    @Get('/all/inventory/seller')
    @Transaction()
    async getAllInventorySeller(@HeaderParam('token') token: string,
                                @checkUserToken() allowAccess: boolean,
                                @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account}});
            const date = new Date();
            const date_now = formatDateTime(new Date(date.getTime()));
            const event = await manager.find(Event, {relations: [], where: {author: user, date_from: MoreThan(date_now)}});
            const inve: any = [];
            let sold = 0;
            for (let index = 0; index < event.length; index++) {
                const [inventoryLike, countLike] = await manager.findAndCount(UserEvent, {event: event[index], like: true});
                const [inventory, countInventory] = await manager.findAndCount(Inventory, {relations: ['event'], where: {event: event[index]}});
                for (let j = 0; j < inventory.length; j++) {
                    const [usInveW, usInveWCount] = await manager.findAndCount(UserInventory, {relations: ['inventory'], where: {inventory: inventory[j], status: EnumStatusUserEvent.wishlist}});
                    const usInve = await manager.find(UserInventory, {relations: ['inventory'], where: {inventory: inventory[j]}});
                    let temp: any = {};
                    temp = inventory[j];
                    temp.wishlist = usInveWCount;
                    if (usInve[0] !== undefined) {
                        if (usInve[0].status === EnumStatusUserEvent.reserved) {
                            temp.userStatus = usInve[0].status;
                        } else if (usInve[0].status === EnumStatusUserEvent.sold) {
                            temp.userStatus = usInve[0].status;
                            sold += 1;
                        }
                    } else {
                        temp.userStatus = '';
                    }
                    temp.sold = sold;
                    temp.total = countInventory;
                    temp.event.like = countLike;
                    inve.push(temp);
                }
            }
            return new ResponseObject(200, 'Inventory All Seller Inventory!', {inventory: inve, count: inve.length});
        }
        return new ResponseObject(203, 'Token Epxire!');
    }

// GET INVENTORY SOLD SELLER
    @Get('/sold/inventory/seller')
    @Transaction()
    async getSoldInvnetorySeller(@HeaderParam('token') token: string,
                                 @checkUserToken() allowAccess: boolean,
                                 @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {relations: ['role'], where: {account: account}});
            const event = await manager.find(Event, {where: {user: user}});
            const inventorySold = await manager.find(UserInventory, {relations: ['inventory'], where: {status: EnumStatusUserEvent.sold}});
            const temp: any = [];
            for (let i = 0; i < inventorySold.length; i++) {
                const eventI: any = await manager.findOne(Inventory, {relations: ['event'], where: {id: inventorySold[i].inventory.id}});
                eventI.image = await this.getImageForInventory(eventI.id, manager);
                eventI.event.image = await this.getImageForEvent(eventI.event.id, manager);
                eventI.event = await this.getCAA(eventI.event, manager);
                event.forEach((e: any) => {
                    if (eventI.event.id === e.id) {
                        temp.push(eventI);
                    }
                });
            }
            return new ResponseObject(200, 'Inventory Sold Seller Inventory!', {inventory: temp, count: temp.length});
        }
        return new ResponseObject(203, 'Token Epxire!');
    }
}
