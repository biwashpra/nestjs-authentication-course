import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true, // This means we can assign one env value to another key APP_URL=${BASE_URL
    }),
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
