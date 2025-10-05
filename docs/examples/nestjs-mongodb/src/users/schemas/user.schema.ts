import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  emailVerified?: Date;

  @Prop({ required: true })
  name: string;

  @Prop()
  password?: string;

  @Prop()
  image?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
