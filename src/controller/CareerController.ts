import {Body, Get, JsonController, Post} from 'routing-controllers';
import {EntityManager, Transaction, TransactionManager} from 'typeorm';
import {ResponseObject} from '../model/response';
import {CareerModel} from '../model/CareerModel';
import {checkUserToken} from '../middleware/Authentication';
import {Career} from '../entity/Career';

@JsonController()
export class CareerController {

    @Post('/carrer')
    @Transaction()
    async craeteCarrer(@checkUserToken() allowAccess: boolean,
                       @Body() body: CareerModel,
                       @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const result = await manager.save(Career, body);
            return new ResponseObject(200, 'Create Career success', result);
        }
        return new ResponseObject(203, 'Token Expire!');
    }

    @Get('/carrer')
    @Transaction()
    async getCarrer(@checkUserToken() allowAccess: boolean,
                   @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const result = await manager.find(Career);
            return new ResponseObject(200, 'Create Career success', result);
        }
        return new ResponseObject(203, 'Token Expire!');
    }
}
