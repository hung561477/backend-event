export class EventModel {
// Auto Create
    inventory: any;
    status: string;

// Step 1
    name: string;
    location: {
        name: string,
        longtitude: number,
        latitude: number
    };
    venue: string;
    date_from: number;
    date_to: number;
    edition: number;
    sponsor_deadline: Date;
    description: string;
    url: string;
    social_link: string;
    ticket_price: string;
    country_code: string;
// Step 2

    tag: string;
    size: number;
    tag_search: string;

    age: {
        status: boolean,
        from: number,
        to: number
    };
    gender: {
        status: boolean,
        male: number,
        female: number,
        order: number
    };
    career: {
        publish: boolean,
        value: any
    };
    civil: {
        publish: boolean,
        single: number,
        married: number,
        separated: number
    };
    household_income: {
        publish: boolean,
        from: number,
        to: number
    };
    residence_location: {
        international: boolean,
        local: boolean,
        national: boolean,
        regional: boolean
    };


// Step 3
    images: any;
    event_amenities: [
        { id: number }
        ];
    event_activations: [
        { id: number }
        ];
    active: string;
}
