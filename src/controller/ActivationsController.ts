import {EntityManager, Transaction, TransactionManager} from 'typeorm';
import {Body, Get, JsonController, Post} from 'routing-controllers';
import {ResponseObject} from '../model/response';
import {checkUserToken} from '../middleware/Authentication';
import {ActivationsModel} from '../model/ActivationsModel';
import {Activations} from '../entity/Activations';

@JsonController()
export class ActivationsController {
    @Post('/activations')
    @Transaction()
    async craeteActivations(@checkUserToken() allowAccess: boolean,
                       @Body() body: ActivationsModel,
                       @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const result = await manager.save(Activations, body);
            return new ResponseObject(200, 'Create Activations success', result);
        }
        return new ResponseObject(203, 'Token Expire!');
    }

    @Get('/activations')
    @Transaction()
    async getActivations(@checkUserToken() allowAccess: boolean,
                    @TransactionManager() manager: EntityManager) {
        if (allowAccess) {
            const result = await manager.find(Activations);
            return new ResponseObject(200, 'Create Activations success', result);
        }
        return new ResponseObject(203, 'Token Expire!');
    }
}
