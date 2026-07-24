import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true, // This means we can assign one env value to another key APP_URL=${BASE_URL
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
