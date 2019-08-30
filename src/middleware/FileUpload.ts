import multer = require('multer');


export const fileUploadOptions =
        multer.diskStorage({
            destination: (req: any, file: any, cb: any) => {
            },
            filename: (req: any, file: any, cb: any) => {
            },
        });
;
