import { Body, HeaderParam, JsonController, Param, Post } from 'routing-controllers';
import { EntityManager, Transaction, TransactionManager } from 'typeorm';
import { ResponseObject } from '../model/response';
import { checkUserToken } from '../middleware/Authentication';
import { Account } from '../entity/Account';
import { User } from '../entity/User';
import { Inventory } from '../entity/Inventory';
import { UserInventory } from '../entity/User-inventory';
import formatDateTime from '../util/formatDateTime';
import { EnumStatusUserEvent } from '../enum/Constant';
import { NotificationBell } from '../entity/Notification-bell';
import { Event } from '../entity/Event';
// import {NotificationEmailQueued} from '../entity/Notification-email-queued';
import { Company } from '../entity/Company';


@JsonController()
export class UserInventoryController {

    private async mapNotificationEmail(account: Account, user: User, inventory: Inventory, templateName: string) {
        // const notificationEmail = new NotificationEmailQueued();
        // notificationEmail.user_id = account.id;
        // notificationEmail.template_name = templateName;
        // notificationEmail.status = true;
        // notificationEmail.should_send_on = 1;
        // notificationEmail.first_name = user.first_name;
        // notificationEmail.last_name = user.last_name;
        // notificationEmail.inventory_name = inventory.name;
        // notificationEmail.event_name = inventory.event.name;
        // notificationEmail.send_to = account.username;
        // if (user.company_name == null) {
        //     user.company_name = 'Company';
        // }
        // notificationEmail.company_name = user.company_name;
        // notificationEmail.created = new Date();
        // notificationEmail.updated = new Date();
        // return notificationEmail;
    }

    private async mapNotificationBell(account: Account, message: string) {
        const notificationBell = new NotificationBell();
        notificationBell.user_id = account.id;
        notificationBell.status = true;
        notificationBell.subject = message;
        notificationBell.created = new Date();
        notificationBell.updated = new Date();
        return notificationBell;
    }

    private async addNotificationForAllBuyerInWishList(inventory: Inventory, manager: EntityManager, message: string) {
        // const listUserWishList = await manager.find(UserInventory, {where: {inventory: inventory, status: EnumStatusUserEvent.wishlist}, relations: ['user', 'inventory']});
        // for (let i = 0; i < listUserWishList.length; i++) {
        //     const userNotice = await manager.findOne(User, {where: {id: listUserWishList[i].user.id}, relations: ['account']});
        //     let notificationBell: NotificationBell;
        // let notificationEmail: NotificationEmailQueued;
        // if (message === 'unreserved') {
        //     notificationBell = await this.mapNotificationBell(userNotice.account, 'Change of status to available for INVENTORY');
        //     notificationEmail = await this.mapNotificationEmail(userNotice.account, listUserWishList[i].user, inventory, 'send-buyer-wishlist-action-unreserved.html');
        // } else {
        //     notificationBell = await this.mapNotificationBell(userNotice.account, 'An item on your wishlist has been reserved by another brand');
        //     notificationEmail = await this.mapNotificationEmail(userNotice.account, listUserWishList[i].user, inventory, 'send-buyer-wishlist-action-reserved.html');
        // }
        // await manager.save(notificationBell);
        // await manager.save(notificationEmail);
        // }
    }

    private async addNotificationForBuyerReserved(account: Account, manager: EntityManager, inventory: Inventory, user: User) {
        // notification for bell
        // const notificationBell = await this.mapNotificationBell(account, 'You have reserved a sponsorship opportunity for EVENT NAME');
        // await manager.save(notificationBell);

        // // notification for email
        // const notificationEmail = await this.mapNotificationEmail(account, user, inventory, 'send-buyer-reserved-action-reserved.html');
        // const notificationEmailReminder = await this.mapNotificationEmail(account, user, inventory, 'send-buyer-reserved-action-reserved-reminder.html');
        // notificationEmailReminder.should_send_on = 24;
        // await manager.save(notificationEmail);
        // await manager.save(notificationEmailReminder);
    }

    private async addNotificationForSellerSold(account: Account, manager: EntityManager, user: User, inventory: Inventory) {
        // const notificationBell = await this.mapNotificationBell(account, 'You have completed a deal for EVENT NAME');
        // await manager.save(notificationBell);
        // // notification for email
        // const notificationEmail = await this.mapNotificationEmail(account, user, inventory, 'send-seller-action-sold.html');
        // await manager.save(notificationEmail);
    }


    private async addNotificationForSellerReserved(inventory: Inventory, userBuyer: User, manager: EntityManager) {
        // const event = await manager.findOne(Event, {where: {id: inventory.event.id}, relations: ['author']});
        // const user = await manager.findOne(User, {where: {id: event.author.id}, relations: ['account']});
        // const notificationBell = await this.mapNotificationBell(user.account, 'An inventory in your event has been reserved');
        // await manager.save(notificationBell);
        // // notification for email
        // const notificationEmail = await this.mapNotificationEmail(user.account, user, inventory, 'send-seller-action-reserved.html');
        // notificationEmail.company_name = userBuyer.company_name;
        // const notificationEmailReminder = await this.mapNotificationEmail(user.account, user, inventory, 'send-seller-action-reserved-reminder.html');
        // notificationEmailReminder.should_send_on = 24;
        // await manager.save(notificationEmail);
    }

    private async addNotificationForBuyerSoldAndUnSold(userInventory: UserInventory, userSeller: User, manager: EntityManager, message: string, inventory: Inventory) {
        // const user = await manager.findOne(User, {where: {id: userInventory.user.id}, relations: ['account']});
        // let notificationBell: NotificationBell;
        // let notificationEmail: NotificationEmailQueued;
        // if (message === 'unsold') {
        //     notificationBell = await this.mapNotificationBell(user.account, 'Change of status to unsold for INVENTORY NAME');
        //     notificationEmail = await this.mapNotificationEmail(user.account, user, inventory, 'send-buyer-reserved-action-unsold.html');
        // } else {
        //     notificationBell = await this.mapNotificationBell(user.account, 'Sponsorship confirmation for EVENT NAME');
        //     notificationEmail = await this.mapNotificationEmail(user.account, user, inventory, 'send-buyer-reserved-action-sold.html');
        // }
        // const company = await manager.findOne(Company, {where: {id: userSeller.company}});
        // if (company) {
        //     notificationEmail.company_name = company.name;
        // } else {
        //     notificationEmail.company_name = 'Company';
        // }
        // await manager.save(notificationBell);
        // await manager.save(notificationEmail);

    }


    @Post('/userinventory/:id')
    @Transaction()
    async addStatusUserEvent(@HeaderParam('token') token: string,
        @Param('id') id: number,
        @Body() body: any,
        @checkUserToken() allowAccess: boolean,
        @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            // Check event isStatus
            const account = await manager.findOne(Account, { where: { token: token } });
            const user = await manager.findOne(User, { relations: ['role'], where: { account: account } });
            const date = new Date();  // Date
            const inventory = await manager.findOne(Inventory, { where: { id: id }, relations: ['event'] });
            const userInven = await manager.find(UserInventory, { where: { inventory: inventory }, relations: ['user', 'inventory'] });
            switch (user.role.role) {
                case 'BUYER': {
                    // check condition
                    for (let i = 0; i < userInven.length; i++) {
                        // delete if conflict
                        if (user.id === userInven[i].user.id) {
                            if (userInven[i].status === body.status) {
                                await manager.delete(UserInventory, { inventory: inventory, user: user });
                                if (body.status === EnumStatusUserEvent.reserved) {
                                    await this.addNotificationForAllBuyerInWishList(inventory, manager, 'unreserved');
                                }
                                return new ResponseObject(201, 'Remove status inventory!');
                            }
                            // return if already reserved
                        } else if (body.status === EnumStatusUserEvent.reserved && userInven[i].status === EnumStatusUserEvent.reserved) {
                            return new ResponseObject(203, 'This inventory has been selected please select another inventory!');
                        }
                    }
                    // change status or add new if pass condition
                    const userInvenByOne = await manager.findOne(UserInventory, { where: { user: user, inventory: inventory }, relations: ['user', 'inventory'] });
                    if (userInvenByOne === undefined) {
                        const userInve = new UserInventory();
                        userInve.status = body.status;
                        userInve.inventory = inventory;
                        userInve.create_date = formatDateTime(new Date(date.getTime()));
                        userInve.user = user;
                        const inventoryId = await manager.save(userInve);
                        if (inventoryId.status === EnumStatusUserEvent.reserved) {
                            await this.addNotificationForAllBuyerInWishList(inventory, manager, 'An item on your wishlist has been reserved by another brand');
                            await this.addNotificationForBuyerReserved(account, manager, inventory, user);
                            await this.addNotificationForSellerReserved(inventory, user, manager);
                        }
                        return new ResponseObject(200, `Thanks you choice ${body.status}!`);
                    } else {
                        const reusult = await manager.update(UserInventory, { inventory: inventory, user: user }, { status: body.status });
                        if (reusult.raw.changedRows > 0) {
                            if (body.status === EnumStatusUserEvent.reserved) {
                                await this.addNotificationForAllBuyerInWishList(inventory, manager, 'reserved');
                                await this.addNotificationForBuyerReserved(account, manager, inventory, user);
                                await this.addNotificationForSellerReserved(inventory, user, manager);
                            }
                            return new ResponseObject(201, `Change status ${body.status} inventory!`);
                        }
                    }
                    break;
                }

                case 'SELLER': {
                    let userInvenTemp: UserInventory;
                    // detect user have reserved
                    for (let i = 0; i < userInven.length; i++) {
                        if (userInven[i].status === EnumStatusUserEvent.reserved) {
                            userInvenTemp = userInven[i];
                        }
                    }
                    if (userInvenTemp !== undefined) {
                        const userInvenHaveReserved = await manager.findOne(UserInventory, { where: { id: userInvenTemp.id }, relations: ['user'] });
                        // delete if seller already sold
                        for (let i = 0; i < userInven.length; i++) {
                            if (user.id === userInven[i].user.id) {
                                if (userInven[i].status === body.status) {
                                    await manager.delete(UserInventory, { inventory: inventory, user: user });
                                    if (userInvenTemp !== undefined) {
                                        await this.addNotificationForBuyerSoldAndUnSold(userInvenHaveReserved, user, manager, 'unsold', inventory);
                                    }
                                    return new ResponseObject(201, `Inventory update remove ${body.status}!`);
                                }
                            }
                        }
                        // update status sold if pass all condition
                        const result = await manager.update(UserInventory, { inventory: inventory, user: userInvenHaveReserved.user }, { status: body.status });
                        if (result.raw.changedRows > 0) {
                            await this.addNotificationForBuyerSoldAndUnSold(userInvenHaveReserved, user, manager, 'sold', inventory);
                            await this.addNotificationForSellerSold(account, manager, user, inventory);
                            return new ResponseObject(201, `Invnentory changed ${body.status}!`);
                        }
                    } else {
                        return new ResponseObject(500, `Don't have user reserved this inventory`);
                    }
                    break;
                }
            }
        }
        return new ResponseObject(203, 'Token Expire!');
    }
}
