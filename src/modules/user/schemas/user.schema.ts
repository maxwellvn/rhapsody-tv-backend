import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../../shared/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: [String], enum: Role, default: [Role.USER] })
  roles: Role[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  refreshToken?: string;

  @Prop()
  lastLoginAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ roles: 1 });
UserSchema.index({ createdAt: -1 });

// Ensure virtuals are included in JSON output
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { password?: unknown }).password;
    delete (result as { refreshToken?: unknown }).refreshToken;
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});
