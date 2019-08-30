import {Body, Get, JsonController, Post} from 'routing-controllers';
import {EntityManager, Transaction, TransactionManager} from 'typeorm';
import {checkUserToken} from '../middleware/Authentication';
import {ResponseObject} from '../model/response';
import {Amenities} from '../entity/Amenities';
import {AmenitiesModel} from '../model/AmenitiesModel';

@JsonController()
export class AmenitiesController {
    @Post('/amenities')
    @Transaction()
    async craeteAmenities(@checkUserToken() allowAccess: boolean,
                            @Body() body: AmenitiesModel,
                            @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const result = await manager.save(Amenities, body);
            return new ResponseObject(200, 'Create Amenities success', result);
        }
        return new ResponseObject(203, 'Token Expire!');
    }

    @Get('/amenities')
    @Transaction()
    async getAmenities(@checkUserToken() allowAccess: boolean,
                         @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const result = await manager.find(Amenities);
            return new ResponseObject(200, 'Create Amenities success', result);
        }
        return new ResponseObject(203, 'Token Expire!');
    }
}
