import {Storage} from '@google-cloud/storage/build/src';
import {BUCKET_NAME, BUCKET_NAME_PROD, GCS_URL} from '../app.config';
import {Photo} from '../entity/Photos';
import {EntityManager} from 'typeorm';
import {Image} from '../entity/Image';
import {EnumImageType} from '../enum/Constant';

export const uploadFilePromise = (options: any) => {
    return new Promise((resolve, reject) => {
        const storage = new Storage();
        const bucket = storage.bucket(BUCKET_NAME);
        const option = {public: true};
        // const imagesBuffer = Buffer.from(options.file, 'base64');
        const file = bucket.file(options.name);
        let url = '';
        file.save(options.file, option, async (err) => {
            if (!err) {
                url = `${GCS_URL}${BUCKET_NAME}/${options.name}`;
                const photo = new Photo();
                photo.description = options.desc;
                photo.url = url;
                const result = await options.manager.save(photo);
                resolve(result);
            } else {
                console.log(err);
                console.log('Can not save images to cloud bucket');
            }
        });
    });
};

export const uploadFilePromiseNew = (options: any) => {
    return new Promise((resolve, reject) => {
        const storage = new Storage({
            projectId: 'my-project-1531468691662',
            keyFilename: 'src/util/my-project-1531468691662-prod.json',
        });
        const bucket = storage.bucket(process.env.BUCKET_NAME);
        const option = {
            gzip: true,
            metadata: {
                // Enable long-lived HTTP caching headers
                // Use only if the contents of the file will never change
                // (If the contents will change, use cacheControl: 'no-cache')
                cacheControl: 'public, max-age=31536000',
            },
            public: true
        };
        // const imagesBuffer = Buffer.from(options.file, 'base64');
        const file = bucket.file('/images/' + options.name);
        let url = '';
        file.save(options.file, option, async (err) => {
            if (!err) {
                url = `${GCS_URL}${process.env.BUCKET_NAME}/images/${options.name}`;
                resolve(url);
            } else {
                console.log(err);
                console.log('Can not save images to cloud bucket');
            }
        });
    });
};

export const deleteFilePromise = (options: any) => {
    return new Promise((resolve, reject) => {
        const storage = new Storage();
        const bucket = storage.bucket(BUCKET_NAME);
        const file = bucket.file(options.name);
        file.delete().then(() => {
            resolve();
        });
    });
};

export const uploadImageNew = async (file: any, manager: EntityManager) => {

    // Set create date
    const date = new Date();
    const create_date = date.getTime();
    console.log(file);
    const options = {
        file: file.buffer,
        name: file.originalname,
        desc: '',
        manager
    };

    return await uploadFilePromiseNew(options)
        .then(async (url: any) => {
            return url;
        });
};

export const uploadImage = (body: any, manager: EntityManager, type: any) => {
    const base64Data = body.file;
    // Set create date
    const date = new Date();
    const create_date = date.getTime();
    let nameImage;
    if (body.extension === 'png' && body.extension === 'jpg') {
        nameImage = create_date + '.' + body.extension;
    } else {
        nameImage = create_date + '.' + 'png';
    }
    const options = {
        file: base64Data,
        name: nameImage,
        desc: body.description,
        manager
    };

    return uploadFilePromise(options)
        .then(async (photo: Photo) => {
            const image = new Image();
            switch (type.type) {
                case 'event': {
                    image.type = EnumImageType.event;
                    image.typeId = type.value.id;
                    image.photo = photo;
                    await manager.save(image);
                    return image;
                }
                case 'user': {
                    image.type = EnumImageType.user;
                    image.typeId = type.value.id;
                    image.photo = photo;
                    await manager.save(image);
                    return image;
                }
                case 'inventory': {
                    image.type = EnumImageType.inventory;
                    image.typeId = type.value.id;
                    image.photo = photo;
                    await manager.save(image);
                    return image;
                }
            }
        });
};
