import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('verification_tokens')
export class VerificationToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  identifier: string;

  @Column({ unique: true })
  token: string;

  @Column()
  expires: Date;
}
