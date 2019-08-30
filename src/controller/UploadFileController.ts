import {JsonController, Post, Body, Res, Get} from 'routing-controllers';
import {EntityManager, Transaction, TransactionManager} from 'typeorm';
import {ResponseObject} from '../model/response';
import {Storage} from '@google-cloud/storage/build/src';
import {BUCKET_NAME, GCS_URL} from '../app.config';
import {Photo} from '../entity/Photos';
import {deleteFilePromise} from '../util/uploadFilePromise';

@JsonController()
export class UploadFileControllerController {

    public uploadFilePromise(options: any) {
        return new Promise((resolve, reject) => {
            const storage = new Storage();
            const bucket = storage.bucket(BUCKET_NAME);
            const option = {public: true};
            const imagesBuffer = Buffer.from(options.file, 'base64');
            const file = bucket.file(options.name);
            let url = '';
            file.save(imagesBuffer, option, async (err) => {
                if (!err) {
                    url = `${GCS_URL}${BUCKET_NAME}/${options.name}`;
                    const photo = new Photo();
                    photo.description = options.desc;
                    photo.url = url;
                    const result = await options.manager.save(photo);
                    resolve(new ResponseObject(200, 'Upload file done!', result));
                }
            });
        });
    }

    @Post('/upload')
    @Transaction()
    async uploadFile(
        @Body({options: {limit: '20mb'}}) body: any,
        @TransactionManager() manager: EntityManager) {
        if (body) {
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
            return this.uploadFilePromise(options)
                .then((result) => {
                    return result;
                });
        }
        return new ResponseObject(404, 'Upload Fail!!!');
    }

    @Get('/xoa')
    @Transaction()
    async xoahinh() {
        return deleteFilePromise({})
            .then(() => {
                return new ResponseObject(111, 'Xoa duoc roi!');
            });
    }
}
