import {Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, OneToOne} from 'typeorm';
import {Event} from './Event';
import {EventCarrer} from './Event-carrer';
import {InventoryAmenities} from './Inventory-amenities';
import {InventoryActivations} from './Inventory-activations';

@Entity()
export class Inventory {

    @PrimaryGeneratedColumn()
    id: number;

    @Column('varchar')
    name: string;

    @Column('text')
    tag: string;

    @Column('int')
    budget_from: number;

    @Column('int')
    budget_to: number;

    @Column('varchar')
    status: string;

    @ManyToOne(type => EventCarrer, eventCareer => eventCareer.id)
    @JoinColumn()
    career: EventCarrer;

    @Column({type: 'simple-json'})
    kind_sponsorship: {
        status: string
        value: [
            {
                id: number
                value: string
            }
        ]
    };

    @Column('datetime')
    sponsorship_deadline: Date;

    @Column({type: 'datetime', nullable: true})
    date_from: Date;

    @Column({type: 'datetime', nullable: true})
    date_to: Date;

    @Column('int')
    size: number;

    @Column('text')
    description: string;

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

    @Column({type: 'varchar', nullable: true})
    tag_search: string;

    @Column({type: 'simple-json', nullable: true})
    civil: {
        single: number,
        married: number,
        separated: number,
    };

    @Column({type: 'simple-json', nullable: true})
    household_income: {
        from: number,
        to: number
    };

    @Column({type: 'simple-json', nullable: true})
    residence_location: {
        international: boolean,
        local: boolean,
        national: boolean,
        regional: boolean
    };

    @OneToOne(type => InventoryAmenities, amenities => amenities.id)
    @JoinColumn()
    amenities: InventoryAmenities;
    @ManyToOne(type => InventoryActivations, activations => activations.id)
    @JoinColumn()
    activations: InventoryActivations;

    @ManyToOne(type => Event, event => event.id)
    @JoinColumn()
    event: Event;
}
