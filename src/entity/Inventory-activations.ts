import {Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn} from 'typeorm';
import {Activations} from './Activations';
import {Inventory} from './Inventory';

@Entity()
export class InventoryActivations {
    @PrimaryGeneratedColumn()
    id: number;
    @ManyToOne(type => Inventory, inventory => inventory.id)
    @JoinColumn()
    inventory: Inventory;
    @ManyToOne(type => Activations, activations => activations.id)
    @JoinColumn()
    activations: Activations;
}
