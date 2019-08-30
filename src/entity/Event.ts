import {Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, OneToMany} from 'typeorm';
import {User} from './User';
import {Photo} from './Photos';
import {Career} from './Career';
import {EventCarrer} from './Event-carrer';
import {Activations} from './Activations';
import {Amenities} from './Amenities';
import {EventAmenities} from './Event-amenities';
import {EventActivations} from './Event-activations';

@Entity()
export class Event {

// Auto create
    @PrimaryGeneratedColumn()
    id: number;  // ID event

    @Column({type: 'varchar', nullable: true})
    status: string; // Status for event { DRAFT, PUSHLISH, DELETE, UPDATE }

    @Column({type: 'datetime', nullable: true})
    create_date: Date; // Date create event

    @ManyToOne(type => User, user => user.id)
    @JoinColumn()
    author: User;  // User create event

    @Column({type: 'int'})
    view: number; // Count view click detail event

// Step 1

    @Column('varchar')
    name: string;

    @Column({type: 'simple-json', nullable: true})
    location: {
        name: string,
        longtitude: number,
        latitude: number
    };

    @Column({type: 'varchar', nullable: true})
    venue: string;

    @Column({type: 'datetime', nullable: true})
    date_from: Date;

    @Column({type: 'datetime', nullable: true})
    date_to: Date;

    @Column('int')
    edition: number;

    @Column({type: 'datetime', nullable: true})
    sponsor_deadline: Date;

    @Column('text')
    description: string;

    @Column({type: 'varchar', nullable: true})
    url: string;

    @Column({type: 'varchar', nullable: true})
    social_link: string;

    @Column({type: 'varchar', nullable: true})
    country_code: string;

    @Column({type: 'varchar', nullable: true})
    ticket_price: string;


// Step 2

    @Column({type: 'varchar', nullable: true})
    tag: string;

    @Column({type: 'varchar', nullable: true})
    tag_search: string;

    @Column({type: 'int', nullable: true})
    size: number;

    @Column({type: 'simple-json', nullable: true})
    age: {
        from: number,
        to: number,
    };

    @Column({type: 'simple-json', nullable: true})
    gender: {
        male: number,
        female: number,
        order: number,
    };

    @OneToMany(type => EventCarrer, eventCarrer => eventCarrer.id)
    @JoinColumn()
    career: EventCarrer;

    @Column({type: 'simple-json', nullable: true})
    civil: {
        publish: boolean,
        single: number,
        married: number,
        separated: number,
    };

    @Column({type: 'simple-json', nullable: true})
    household_income: {
        from: number,
        to: number,
        publish: boolean
    };

    @Column({type: 'simple-json', nullable: true})
    residence_location: {
        international: boolean,
        local: boolean,
        national: boolean,
        regional: boolean
    };

// Step 3

    @Column({type: 'varchar', nullable: true})
    active: string;

    @OneToMany(type => EventAmenities, amenities => amenities.id)
    @JoinColumn()
    amenities: EventAmenities;
    @OneToMany(type => EventCarrer, activation => activation.id)
    @JoinColumn()
    activations: EventActivations;
}
