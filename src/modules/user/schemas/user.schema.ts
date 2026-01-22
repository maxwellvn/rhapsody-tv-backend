import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../../shared/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ lowercase: true, trim: true, sparse: true })
  email?: string;

  @Prop({ select: false })
  password?: string;

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

  // KingsChat OAuth fields
  @Prop({ sparse: true, unique: true })
  kingsChatId?: string;

  @Prop()
  username?: string;

  @Prop()
  avatar?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 }, { sparse: true });
UserSchema.index({ roles: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ kingsChatId: 1 }, { sparse: true });

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
