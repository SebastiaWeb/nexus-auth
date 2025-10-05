import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  type: string;

  @Column()
  provider: string;

  @Column()
  providerAccountId: string;

  @Column({ nullable: true })
  refresh_token: string | null;

  @Column({ nullable: true })
  access_token: string | null;

  @Column({ nullable: true })
  expires_at: number | null;

  @Column({ nullable: true })
  token_type: string | null;

  @Column({ nullable: true })
  scope: string | null;

  @Column({ nullable: true })
  id_token: string | null;

  @Column({ nullable: true })
  session_state: string | null;

  @ManyToOne(() => User, (user) => user.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;
}
