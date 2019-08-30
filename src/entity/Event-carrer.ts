import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Career} from './Career';
import {Event} from './Event';

@Entity()
export class EventCarrer {
    @PrimaryGeneratedColumn()
    id: number;
    @ManyToOne(type => Event, event => event.id)
    @JoinColumn()
    event: Event;
    @ManyToOne(type => Career, career => career.id)
    @JoinColumn()
    career: Career;
    @Column()
    publish: boolean;
}
