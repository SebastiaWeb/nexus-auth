import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Account } from './Account';
import { Session } from './Session';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  emailVerified: Date | null;

  @Column()
  name: string;

  @Column({ nullable: true })
  password: string | null;

  @Column({ nullable: true })
  image: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Account, (account) => account.user)
  accounts: Account[];

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];
}
