import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './modules/user/schemas/user.schema';
import { Role } from './shared/enums/role.enum';
import { Logger } from '@nestjs/common';

async function seed() {
  const logger = new Logger('Seed');
  
  logger.log('Starting seed process...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const userModel = app.get<Model<User>>(getModelToken(User.name));

  const adminEmail = 'odunoyemayowa@gmail.com';
  const adminPassword = 'lolamarsh';

  try {
    // Check if admin already exists
    const existingAdmin = await userModel.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      logger.log(`Admin user already exists: ${adminEmail}`);
      
      // Update to ensure admin role
      if (!existingAdmin.roles.includes(Role.ADMIN)) {
        existingAdmin.roles.push(Role.ADMIN);
        await existingAdmin.save();
        logger.log('Updated existing user with admin role');
      }
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 12);
      
      const admin = new userModel({
        fullName: 'Admin User',
        email: adminEmail,
        password: hashedPassword,
        roles: [Role.USER, Role.ADMIN],
        isActive: true,
        isEmailVerified: true,
      });

      await admin.save();
      logger.log(`Admin user created: ${adminEmail}`);
    }

    logger.log('Seed completed successfully!');
  } catch (error) {
    logger.error('Seed failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
