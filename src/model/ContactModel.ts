import { IsEmail, MinLength, MaxLength } from 'class-validator';

export class ContactModel {

    email: string;
    description: string;
    name: string;
    first_name: string;
    last_name: string;
}
