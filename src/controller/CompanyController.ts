import {Body, Get, HeaderParam, JsonController, Param, Post, Put} from 'routing-controllers';
import {EntityManager, Transaction, TransactionManager} from 'typeorm';
import {CompanyModel} from '../model/CompanyModel';
import {Company} from '../entity/Company';
import {ResponseObject} from '../model/response';
import {Image} from '../entity/Image';
import {EnumImageType} from '../enum/Constant';
import {Photo} from '../entity/Photos';
import {deleteFilePromise, uploadFilePromise} from '../util/uploadFilePromise';
import {checkUserToken} from '../middleware/Authentication';
import {Account} from '../entity/Account';
import {User} from '../entity/User';
import {BUCKET_NAME, GCS_URL} from '../app.config';

@JsonController()
export class CompanyController {

    private async uploadFile(body: any, manager: EntityManager, company: Company) {
        const base64Data = body.file.replace(/^data:image\/png;base64,/, '');

        // Set create date
        const date = new Date();
        const create_date = date.getTime();
        const nameImage = create_date + '.' + body.extension;
        const options = {
            file: base64Data,
            name: nameImage,
            desc: body.description,
            manager
        };
        return uploadFilePromise(options)
            .then(async (photo: Photo) => {
                const image = new Image();
                image.type = EnumImageType.company;
                image.typeId = company.id;
                image.photo = photo;
                await manager.save(image);
                return image;
            });
    }

    @Post('/company')
    @Transaction()
    async createCompany(@Body({options: {limit: '20mb'}}) body: CompanyModel,
                        @TransactionManager() manager: EntityManager) {
        const company = new Company();
        company.name = body.name;
        company.address = body.address;
        company.website = body.website;
        company.industry = body.industry;
        company.description = body.description;
        const companyResult = await manager.save(company);
        // insert image
        if (body.image !== undefined) {
            const photo = new Photo();
            photo.description = '';
            photo.url = body.image;
            const result = await manager.save(photo);
            if (result) {
                const image = new Image();
                image.type = EnumImageType.company;
                image.typeId = companyResult.id;
                image.photo = photo;
                await manager.save(image);
            }
        }
        if (companyResult) {
            return new ResponseObject(201, 'Create company success!', companyResult);
        } else {
            return new ResponseObject(400, 'Warning!');
        }
    }

    @Get('/company')
    @Transaction()
    async getCompany(@HeaderParam('token') token: string,
                     @checkUserToken() allowAccess: boolean,
                     @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const account = await manager.findOne(Account, {where: {token: token}});
            const user: any = await manager.findOne(User, {relations: ['company'], where: {account: account}});
            const image: any = await manager.find(Image, {relations: ['photo'], where: {typeId: user.company.id, type: EnumImageType.company}});
            user.company.image = image[0].photo.url;
            return new ResponseObject(200, 'Company!!', user.company);
        }
        return new ResponseObject(203, 'Token Expire!');
    }

    @Put('/company/:id')
    @Transaction()
    async editCompnay(@HeaderParam('token') token: string,
                      @Param('id') id: number,
                      @checkUserToken() allowAccess: boolean,
                      @Body({options: {limit: '20Mb'}}) body: CompanyModel,
                      @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const result = await manager.update(Company,
                {id},
                {
                    name: body.name,
                    address: body.address,
                    website: body.website,
                    email: body.email,
                    description: body.description
                });
            // Find image for SQL cloud
            const imgServer = await manager.find(Image, {
                relations: ['photo'],
                where: {typeId: id, type: EnumImageType.company}
            });
            // Delete image on server Google cloud storage
            for (let i = 0; i < imgServer.length; i++) {
                const photo = await manager.findOne(Photo, {where: {id: imgServer[i].photo.id}});
                await manager.delete(Image, {type: EnumImageType.company, typeId: id});
                await manager.delete(Photo, {id: imgServer[i].photo.id});
                result.raw.changedRows = 2;
            }
            // Upload file image on gcloud
            const company: any = await manager.findOne(Company, id);
            if (body.image !== undefined) {
                const photo = new Photo();
                photo.description = '';
                photo.url = body.image;
                const photoResult = await manager.save(photo);
                if (photoResult) {
                    const image = new Image();
                    image.type = EnumImageType.company;
                    image.typeId = company.id;
                    image.photo = photo;
                    await manager.save(image);
                    company.image = image.photo.url;
                }
            }
            return new ResponseObject(200, 'Edit success!', company);
        }
        return new ResponseObject(203, 'Token Expire!');
    }
}
