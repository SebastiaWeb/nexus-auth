
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Account } from '@nexus-auth/core';
import { UserEntity } from './user.entity.js';

@Entity('accounts')
@Index(['provider', 'providerAccountId'], { unique: true })
export class AccountEntity implements Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar' })
  type!: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ type: 'varchar', name: 'provider_account_id' })
  providerAccountId!: string;

  @Column({ type: 'varchar', nullable: true, name: 'refresh_token' })
  refresh_token!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'access_token' })
  access_token!: string | null;

  @Column({ type: 'bigint', nullable: true, name: 'expires_at' })
  expires_at!: number | null;

  @Column({ type: 'varchar', nullable: true, name: 'token_type' })
  token_type!: string | null;

  @Column({ type: 'varchar', nullable: true })
  scope!: string | null;

  @Column({ type: 'text', nullable: true, name: 'id_token' })
  id_token!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'session_state' })
  session_state!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, (user) => user.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
