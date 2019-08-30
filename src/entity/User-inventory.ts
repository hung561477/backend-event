import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Inventory} from './Inventory';
import {User} from './User';

@Entity()
export class UserInventory {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({type: 'varchar', nullable: true})
    status: string;
    @Column({default: false, nullable: true})
    like: boolean;
    @Column({type: 'datetime', nullable: true})
    create_date: Date; // Date create event
    @ManyToOne(type => Inventory, inventory => inventory.id)
    @JoinColumn()
    inventory: Inventory;
    @ManyToOne(type => User, user => user.id)
    @JoinColumn()
    user: User;
}
