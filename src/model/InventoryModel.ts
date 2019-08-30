export class InventoryModel {
    name: string;
    tag: string;
    budget_from: number;
    budget_to: number;
    kind_sponsorship: {
        status: string,
        value: [
            {
                id: number,
                value: string
            }
        ]
    };
    description: string;
    sponsorship_deadline: Date;
    size: number;
    date_from: number;
    date_to: number;
    tag_search: string;

    age: {
        from: number,
        to: number
    };
    gender: {
        male: number,
        female: number,
        order: number,
    };
    civil: {
        single: number,
        married: number,
        separated: number
    };
    household_income: {
        from: number,
        to: number
    };
    residence_location: {
        international: boolean,
        local: boolean,
        national: boolean,
        regional: boolean
    };
    career: any;
    amenities: any;
    activations: any;
    images: any;
    eventId: any;
}
