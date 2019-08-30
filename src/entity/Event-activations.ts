import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Event} from './Event';
import {Activations} from './Activations';

@Entity()
export class EventActivations {
    @PrimaryGeneratedColumn()
    id: number;
    @ManyToOne(type => Event, event => event.id)
    @JoinColumn()
    event: Event;
    @ManyToOne(type => Activations, activations => activations.id)
    @JoinColumn()
    activations: Activations;
}
