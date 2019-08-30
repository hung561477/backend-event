import {Body, Get, HeaderParam, JsonController, Param, Post, Put, UploadedFile} from 'routing-controllers';
import {ResponseObject} from '../model/response';
import {EntityManager, Transaction, TransactionManager} from 'typeorm';
import {validate} from 'class-validator';
import {Account} from '../entity/Account';
import {Md5} from 'ts-md5';
import {EXPIRE_TIME, EXPIRE_VERIFY, HASH_STR} from '../app.config';
import formatDateTime from '../util/formatDateTime';
import {User} from '../entity/User';
import {UserModel} from '../model/UserModel';
import {Role} from '../entity/Role';
import {AccountModel} from '../model/AccountModel';
import {Image} from '../entity/Image';
import {EnumImageType} from '../enum/Constant';
import {Photo} from '../entity/Photos';
import {checkUserToken} from '../middleware/Authentication';
import {uploadImage, uploadImageNew} from '../util/uploadFilePromise';
import {Company} from '../entity/Company';
import {sendEmail} from '../emailServer/SendEmail';
import {ChangePassword} from '../model/requestModel/ChangePassword';
import {fileUploadOptions} from '../middleware/FileUpload';
import {environment} from '../../environments/environment';

const request = require('request');

@JsonController()
export class UserController {

    private async changePassFunc(account: Account, manager: EntityManager) {
        const result = await manager.update(Account, {id: account.id}, {password: account.password});
        return result;
    }

    private async getImageForUser(id: number, manager: EntityManager) {
        const temp: any = [];
        const image: any = await manager.find(Image, {relations: ['photo'], where: {typeId: id, type: EnumImageType.user}});
        if (image.length > 0) {
            image.forEach((i: any) => {
                temp.push(i.photo);
            });
            return temp;
        } else {
            return temp;
        }
    }

    private async sendmail(account: any) {
        return new Promise(async function (resolve, reject) {
            const activeLink = process.env.LINK_ACTIVE_VERIFY + account.verify;
            await request('https://storage.googleapis.com/staging.meta-yen-216402.appspot.com/mail/body/verify-account.html', async function (error, response, bodyMail) {
                await request('https://storage.googleapis.com/staging.meta-yen-216402.appspot.com/mail/subject/verify-account.html', async function (errorSubject, responseSubject, bodySubject) {
                    bodyMail = bodyMail.replace('${email}', account.username);
                    bodyMail = bodyMail.replace('${verify_link}', activeLink);
                    bodySubject = bodySubject.replace('${email}', account.username);
                    switch (process.env.LINK_ACTIVE_VERIFY) {
                        case 'http://dev.event.com/verify?hash=' : {
                            bodySubject += ' DEV';
                            break;
                        }
                        case 'http://qa.event.com/verify?hash=' : {
                            bodySubject += ' QA';
                            break;
                        }
                    }
                    const mailVerify = {
                        'subject': bodySubject,
                        'content': bodyMail
                    };
                    const nam = await sendEmail(mailVerify);
                    console.log(nam);
                    resolve();

                });
            });
        });

    }


    @Post('/buyer/signup')
    @Transaction()
    async signUpBuyer(@Body({options: {limit: '20mb'}}) body: UserModel, @TransactionManager() manager: EntityManager) {

        // Declare
        const account = new Account();
        const user = new User();
        const date = new Date();
        // const connection = getConnection();
        const errorValidation = await validate(user, {validationError: {target: false}});
        // Set value for table account
        account.username = body.username;
        account.password = Md5.hashStr(body.password + HASH_STR);
        account.verify = Md5.hashStr(body.username + HASH_STR);
        account.verify_expire = formatDateTime(new Date(date.getTime() + (EXPIRE_VERIFY * 60000)));
        // Check unique user
        const isAccount = await manager.findOne(Account, {username: account.username});
        const isUserPhoneNumber = await manager.findOne(User, {where: {phone: body.phone}});
        if (!isAccount && !isUserPhoneNumber) {
            // Insert data table account
            await manager.save(account);
            const create_date = formatDateTime(new Date(date.getTime()));
            // Get role table
            user.role = await manager.findOne(Role, {role: 'BUYER'});
            // Set value for table user
            user.account = account;
            user.category = body.category;
            user.create_date = create_date;
            user.first_name = body.first_name;
            user.last_name = body.last_name;
            user.phone = body.phone;
            user.company_name = body.company_name;
            // Insert data table User
            const userId: any = await manager.save(user);
            // insert image
            if (body.image !== undefined) {
                const photo = new Photo();
                photo.description = '';
                photo.url = body.image;
                const result = await manager.save(photo);
                if (result) {
                    const image = new Image();
                    image.type = EnumImageType.user;
                    image.typeId = userId.id;
                    image.photo = photo;
                    await manager.save(image);
                }
            }

            if (errorValidation.length > 0) { // this case will not happen, error will throw in global error handler
                return new ResponseObject(400, 'Bad request!');
            } else {
                if (environment.verifyByTeam) {
                    const name = await this.sendmail(account);
                    return new ResponseObject(201, 'Register success!', userId);
                } else {
                    const activeLink = process.env.LINK_ACTIVE_VERIFY + account.verify;
                    const mailVerify = {
                        'email': account.username,
                        'subject': 'Verify Account',
                        'content': activeLink
                    };
                    if (await sendEmail(mailVerify)) {
                        return new ResponseObject(201, 'Register success!', userId);
                    }
                }
            }
        } else {
            if (isAccount && isUserPhoneNumber) {
                return new ResponseObject(407, '{"1": "Username already taken!","2": "Phone Number already taken!"}');
            } else if (isAccount) {
                return new ResponseObject(408, '{"1": "Username already taken!"}');
            } else {
                return new ResponseObject(409, '{"2": "Phone Number already taken!"}');
            }
        }
    }

    @Post('/avatar/upload')
    @Transaction()
    async avatarUpload(@UploadedFile('image', {options: fileUploadOptions}) file: any,
                       @TransactionManager() manager: EntityManager) {

        const url = await uploadImageNew(file, manager);
        return new ResponseObject(200, 'upload picture success!', {url: url});
    }

    @Post('/seller/signup')
    @Transaction()
    async signUpSeller(@Body({options: {limit: '20mb'}}) body: UserModel, @TransactionManager() manager: EntityManager) {

        // Declare
        const account = new Account();
        const user = new User();
        // Set create date
        const date = new Date();
        // const connection = getConnection();
        const errorValidation = await validate(user, {validationError: {target: false}});
        // Set value for table account
        account.username = body.username;
        account.password = Md5.hashStr(body.password + HASH_STR);
        account.verify = Md5.hashStr(body.username + HASH_STR);
        account.verify_expire = formatDateTime(new Date(date.getTime() + (EXPIRE_VERIFY * 60000)));
        const company = await manager.findOne(Company, {id: body.company});
        // Check unique user
        const isAccount = await manager.findOne(Account, {username: account.username});
        const isUserPhoneNumber = await manager.findOne(User, {where: {phone: body.phone}});
        if (!isAccount && !isUserPhoneNumber) {

            // Insert account for sql
            await manager.save(account);
            const create_date = formatDateTime(new Date(date.getTime()));
            // Get role table
            user.role = await manager.findOne(Role, {role: 'SELLER'});

            user.account = account;
            user.category = body.category;
            user.create_date = create_date;
            user.first_name = body.first_name;
            user.last_name = body.last_name;
            user.phone = body.phone;
            user.company = company;
            // Insert data table User
            const userId: any = await manager.save(user);
            if (body.image !== undefined) {
                const photo = new Photo();
                photo.description = '';
                photo.url = body.image;
                const result = await manager.save(photo);
                if (result) {
                    const image = new Image();
                    image.type = EnumImageType.user;
                    image.typeId = userId.id;
                    image.photo = photo;
                    await manager.save(image);
                }
            }
            if (errorValidation.length > 0) { // this case will not happen, error will throw in global error handler
                return new ResponseObject(400, 'Bad request!');
            } else {
                if (environment.verifyByTeam) {
                    const name = await this.sendmail(account);
                    return new ResponseObject(201, 'Register success!', userId);
                } else {
                    const activeLink = process.env.LINK_ACTIVE_VERIFY + account.verify;
                    const mailVerify = {
                        'email': account.username,
                        'subject': 'Verify Account',
                        'content': activeLink
                    };
                    if (await sendEmail(mailVerify)) {
                        return new ResponseObject(201, 'Register success!', userId);
                    }
                }
            }
        } else {
            if (isAccount && isUserPhoneNumber) {
                return new ResponseObject(407, '{"1": "Username already taken!","2": "Phone Number already taken!"}');
            } else if (isAccount) {
                return new ResponseObject(408, '{"1": "Username already taken!"}');
            } else {
                return new ResponseObject(409, '{"2": "Phone Number already taken!"}');
            }
        }
    }

    @Post('/login')
    @Transaction()
    async Login(@Body() body: AccountModel, @TransactionManager() manager: EntityManager) {
        // Declare
        const account = new Account();
        const errorValidation = await validate(account, {validationError: {target: false}});
        if (errorValidation.length > 0) { // this case will not happen, error will throw in global error handler
            return new ResponseObject(400, 'Bad request!');
        }
        // Set value for table account
        account.username = body.username;
        account.password = Md5.hashStr(body.password + HASH_STR);
        const date = new Date();
        account.token = Md5.hashStr(account.username + account.password + date);
        account.token_expire = formatDateTime(new Date(date.getTime() + (EXPIRE_TIME * 60000)));
        const accountResult: any = await manager.update(Account,
            {username: account.username, password: account.password},
            {token: account.token, token_expire: account.token_expire});
        if (accountResult.raw.changedRows === 1) {
            // Get account
            const accID = await manager.findOne(Account, {username: account.username});
            if (accID.active) {
                // Get user table
                const user = await manager.findOne(User, {relations: ['role'], where: {account: accID}});
                const results: any = {};
                results.username = account.username;
                results.token = account.token;
                results.first_name = user.first_name;
                results.last_name = user.last_name;
                const image: any = await this.getImageForUser(user.id, manager);
                if (image.length > 0) {
                    results.avatar = image[0].url;
                } else {
                    results.avatar = '';
                }
                results.role = user.role.role;
                return new ResponseObject(200, 'Login success!!!', results);
            } else {
                return new ResponseObject(204, 'Account not verify!');
            }
        } else {
            return new ResponseObject(400, 'Username & Password wrong!');
        }
    }

    @Get('/user')
    @Transaction()
    async getInfo(@HeaderParam('token') token: string,
                  @checkUserToken() allowAccess: boolean,
                  @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user = await manager.findOne(User, {relations: ['role', 'company'], where: {account}});
            const result: any = user;

            if (user.role.role === 'SELLER') {
                const imageC: any = await manager.findOne(Image, {
                    relations: ['photo'], where: {type: EnumImageType.company, typeId: user.company.id}
                });
                if (imageC !== undefined) {
                    const photoC = await manager.findOne(Photo, {id: imageC.photo.id});
                    if (photoC !== undefined) {
                        result.company.image = photoC.url;
                    }
                }
            }

            const image: any = await manager.findOne(Image, {
                relations: ['photo'], where: {type: EnumImageType.user, typeId: user.id}
            });

            if (image !== undefined) {
                const photo = await manager.findOne(Photo, {id: image.photo.id});
                if (photo !== undefined) {
                    result.image = photo.url;
                }
            }
            return new ResponseObject(200, 'User info!', result);
        }
        return new ResponseObject(203, 'Token Expire');
    }

    @Get('/user/company')
    @Transaction()
    async getUserCompany(@HeaderParam('token') token: string,
                         @checkUserToken() allowAccess: boolean,
                         @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user: any = await manager.find(User, {relations: ['company'], where: {account}});
            const company = user[0].company;
            const listUser: any = await manager.find(User, {where: {company: company}});
            for (let i = 0; i < listUser.length; i++) {
                const listAccount = await manager.find(User, {relations: ['account'], where: {id: listUser[i].id}});
                for (let j = 0; j < listAccount.length; j++) {
                    listUser[i].email = listAccount[j].account.username;
                    listUser[i].username = listAccount[j].account.username;
                }
            }
            return new ResponseObject(200, 'User info!', listUser);
        }
        return new ResponseObject(203, 'Token Expire');
    }

    @Put('/user/:id')
    @Transaction()
    async EditUser(@HeaderParam('token') token: string,
                   @checkUserToken() allowAccess: boolean,
                   @Param('id') id: number,
                   @Body({options: {limit: '20mb'}}) body: UserModel,
                   @TransactionManager() manager: EntityManager) {
        if (!allowAccess) {
            return new ResponseObject(203, 'Token expire!');
        }

        const currentUser = await manager.findOne(User, {relations: ['account'], where: {id}});
        const currentAcc = await manager.findOne(Account, {where: {token: token}});


        if (currentUser.account.id === currentAcc.id) {
            // is allow update account
            if (body.first_name) {
                currentUser.first_name = body.first_name;
            }

            if (body.last_name) {
                currentUser.last_name = body.last_name;
            }

            if (body.phone) {
                currentUser.phone = body.phone;
            }

            if (body.password) {
                currentAcc.password = Md5.hashStr(body.password + HASH_STR);
            }

            return Promise.all([
                manager.save(currentUser),
                manager.save(currentAcc)
            ])
                .then((updateResult) => {
                    console.log(updateResult);
                    return new ResponseObject(201, 'Update user success');
                }, (err) => {
                    return new ResponseObject(403, 'Update user unsuccess', err);
                });


        } else {
            // is not allow update another user account
            return new ResponseObject(402, 'You can\'t update another user');
        }


        // // Declare
        // const account = new Account();
        // const user = new User();
        // // const connection = getConnection();
        // const errorValidation = await validate(user, {validationError: {target: false}});
        // // Set value for table account
        // // const userEdit = await manager.findOne(User, {relations: ['account'], where: {id}});
        // // const acc = userEdit.account.id;
        // account.password = Md5.hashStr(body.password + HASH_STR);
        // // await manager.update(Account, {id: acc}, account);
        // user.first_name = body.first_name;
        // user.last_name = body.last_name;
        // user.phone = body.phone;
        // const result = await manager.update(User, id, user);
        // // Check unique user
        // if (errorValidation.length > 0) { // this case will not happen, error will throw in global error handler
        //     return new ResponseObject(400, 'Bad request!');
        // } else {
        //     if (result.raw.changedRows > 0) {
        //         return new ResponseObject(201, 'Edit done!', await manager.findOne(User, id));
        //     }
        //     return new ResponseObject(204, 'Edit Fail!');
        // }

    }

    @Post('/user/change_password')
    @Transaction()
    async changePassword(@HeaderParam('token') token: string,
                         @checkUserToken() allowAccess: boolean,
                         @Body() body: ChangePassword,
                         @TransactionManager() manager: EntityManager) {

        if (allowAccess) {
            if (body.old_password != null && body.new_password != null) {
                const account = await manager.findOne(Account, {where: {token: token}});

                if (account !== undefined) {
                    if (account.password === Md5.hashStr(body.old_password + HASH_STR)) {
                        account.password = Md5.hashStr(body.new_password + HASH_STR);
                        const result = await this.changePassFunc(account, manager);
                        if (result.raw.changedRows > 0) {
                            return new ResponseObject(200, 'Change success');
                        } else {
                            return new ResponseObject(500, 'Internal server error');
                        }
                    } else {
                        return new ResponseObject(400, 'The old password was wrong');
                    }
                } else {
                    return new ResponseObject(404, 'Not found any account');
                }
            } else {
                return new ResponseObject(400, 'Incorrect params body');
            }
        } else {
            return new ResponseObject(203, 'Token expire!');
        }
    }

    @Post('/user/change_password_forgot')
    @Transaction()
    async changePasswordForgot(@HeaderParam('token') token: string,
                               @checkUserToken() allowAccess: boolean,
                               @Body() body: ChangePassword,
                               @TransactionManager() manager: EntityManager) {

        if (allowAccess) {
            if (body.new_password != null) {
                const account = await manager.findOne(Account, {where: {token: token}});
                if (account !== undefined) {
                    account.password = Md5.hashStr(body.new_password + HASH_STR);
                    const result = await this.changePassFunc(account, manager);
                    if (result.raw.changedRows > 0) {
                        return new ResponseObject(200, 'Change success');
                    } else {
                        return new ResponseObject(500, 'Internal server error');
                    }
                } else {
                    return new ResponseObject(404, 'Not found any account');
                }
            } else {
                return new ResponseObject(400, 'Incorrect params body');
            }
        } else {
            return new ResponseObject(203, 'Token expire!');
        }
    }

    @Get('/user/forgot_password/:username')
    @Transaction()
    async forgotPassword(@Param('username') username: string,
                         @TransactionManager() manager: EntityManager) {
        const account = await manager.findOne(Account, {where: {username: username}});
        if (account !== undefined) {
            const date = new Date();
            account.token = Md5.hashStr(account.username + account.password + date);
            account.token_expire = formatDateTime(new Date(date.getTime() + (EXPIRE_TIME * 60000)));
            const result = await manager.update(Account,
                {id: account.id},
                {token: account.token, token_expire: account.token_expire});
            if (result.raw.changedRows > 0) {
                request('https://storage.googleapis.com/staging.meta-yen-216402.appspot.com/mail/body/forgot-password-mail.html', async function (error, response, body) {
                    request('https://storage.googleapis.com/staging.meta-yen-216402.appspot.com/mail/subject/forgot-password-mail.html', async function (errorSubject, responseSubject, bodySubject) {
                        const linkChange = process.env.LINK_ACTIVE_VERIFY.replace('verify?hash=', '')
                        body = body.replace('${link_verify}', linkChange + '/forgot/' + account.token);
                        const mail = {
                            'email': account.username,
                            'subject': bodySubject,
                            'content': body,
                        };
                        const sendMailStatus = await sendEmail(mail);
                        if (sendMailStatus) {
                            return new ResponseObject(200, 'Reset success');
                        } else {
                            return new ResponseObject(500, 'Could not send email to confirm');
                        }
                    });
                });
            } else {
                return new ResponseObject(500, 'Internal server error');
            }
        } else {
            return new ResponseObject(404, 'Not found any account by username in system');
        }
    }

}
