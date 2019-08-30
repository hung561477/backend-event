import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Amenities} from './Amenities';
import {Event} from './Event';

@Entity()
export class EventAmenities {
    @PrimaryGeneratedColumn()
    id: number;
    @ManyToOne(type => Event, event => event.id)
    @JoinColumn()
    event: Event;
    @ManyToOne(type => Amenities, amenities => amenities.id)
    @JoinColumn()
    amenities: Amenities;
}
