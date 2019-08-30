import {Body, JsonController, Post} from 'routing-controllers';
import {EntityManager, Transaction, TransactionManager} from 'typeorm';
import {ContactModel} from '../model/ContactModel';
import {Contact} from '../entity/Contact';
import {ResponseObject} from '../model/response';

@JsonController()
export class ContactController {

    @Post('/contact')
    @Transaction()
    async submitContact(@Body() body: ContactModel,
                        @TransactionManager() manager: EntityManager) {
        const contact = new Contact();
        contact.name = body.name;
        contact.email = body.email;
        contact.first_name = body.first_name;
        contact.last_name = body.last_name;
        contact.description = body.description;
        const result = await manager.save(Contact, contact);
        return new ResponseObject(200, 'Submit success!', result);
    }
}
