import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Career} from './Career';
import {Inventory} from './Inventory';

@Entity()
export class InventoryCarrer {
    @PrimaryGeneratedColumn()
    id: number;
    @ManyToOne(type => Inventory, inventory => inventory.id)
    @JoinColumn()
    inventory: Inventory;
    @ManyToOne(type => Career, career => career.id)
    @JoinColumn()
    career: Career;
}
