import {ExpressErrorMiddlewareInterface, HttpError, Middleware} from 'routing-controllers';
import {ValidationError} from 'class-validator';
import * as express from 'express';
import {ResponseObject} from '../model/response';

/**
 * Express middleware to catch all errors throwed in controlers.
 * Should be first in error chain as it sends response to client.

 * @export
 * @class CustomErrorHandler
 * @implements {ErrorMiddlewareInterface}
 */
@Middleware({type: 'after'})
export class CustomErrorHandler implements ExpressErrorMiddlewareInterface {
    /**
     * Error handler - sets response code and sends json with error message.
     * Handle: standard node error, HttpError, ValidationError and string.
     *
     * @param {any} error An throwed object (error)
     * @param {express.Request} req The Express request object
     * @param {express.Response} res The Express response object
     * @param {express.NextFunction} next The next Express middleware function
     */
    public error(error: any, _req: express.Request, res: express.Response, _next: express.NextFunction): void {
        let responseObject = {} as any;

        // if its an array of ValidationError
        if (Array.isArray(error.errors) && error.errors.every((element) => element instanceof ValidationError)) {
            res.status(200);

            // remove target property
            error.errors.forEach(elm => {
                delete elm.target;
                delete elm.value;
            });


            responseObject = new ResponseObject(400, 'You have error(s) in your request\'s body.', { errors: error.errors });
        } else {
            // set http status
            if (error instanceof HttpError && error.httpCode) {
                res.status(error.httpCode);
            } else {
                res.status(500);
            }

            if (error instanceof Error) {
                const developmentMode: boolean = process.env.NODE_ENV === 'development';

                // set response error fields
                if (error.name && (developmentMode || error.message)) { // show name only if in development mode and if error message exist too
                    responseObject.name = error.name;
                }
                if (error.message) {
                    responseObject.message = error.message;
                }
                if (error.stack && developmentMode) {
                    responseObject.stack = error.stack;
                }
            } else if (typeof error === 'string') {
                responseObject.message = error;
            }
        }
        if (responseObject !== {}) {
            res.json(responseObject);
        }

    }
}
