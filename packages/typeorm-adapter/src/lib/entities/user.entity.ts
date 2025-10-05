import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '@nexus-auth/core';

@Entity('users')
export class UserEntity implements User {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'timestamp', nullable: true, name: 'email_verified' })
  emailVerified!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  image!: string | null;

  @Column({ type: 'varchar', nullable: true, name: 'reset_token' })
  resetToken!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'reset_token_expiry' })
  resetTokenExpiry!: Date | null;

  @Column({ type: 'varchar', nullable: true, name: 'verification_token' })
  verificationToken!: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'verification_token_expiry' })
  verificationTokenExpiry!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}