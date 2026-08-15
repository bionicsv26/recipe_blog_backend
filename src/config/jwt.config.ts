import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  accessExpiresIn: Number(process.env.JWT_ACCESS_EXPIRATION),
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  refreshExpiresIn: Number(process.env.JWT_REFRESH_EXPIRATION),
}));