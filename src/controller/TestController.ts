import {Get, JsonController} from 'routing-controllers';
import {ResponseObject} from '../model/response';

@JsonController()
export class TestController {
    @Get('/test')
    getInfo() {
        if (1 - 1 === 2) {
            return 1;
        }
        return 2;
    }
}
