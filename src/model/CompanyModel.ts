import { MaxLength, MinLength } from 'class-validator';

export class CompanyModel {
    name: string;
    address: string;
    website: string;
    email: string;
    industry: string;
    description: string;
    image: any;
}
