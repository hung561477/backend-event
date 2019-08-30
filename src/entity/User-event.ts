import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Event} from './Event';
import {User} from './User';

@Entity()
export class UserEvent {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({type: 'varchar', nullable: true})
    status: string;
    @Column({default: false, nullable: true})
    like: boolean;
    @Column({type: 'datetime', nullable: true})
    create_date: Date; // Date create event
    @ManyToOne(type => Event, event => event.id)
    @JoinColumn()
    event: Event;
    @ManyToOne(type => User, user => user.id)
    @JoinColumn()
    user: User;
}
