import { z } from 'zod';

const envSchema = z.object({
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_BACKEND_URL: z.string().url(),
});

export const env = envSchema.parse(process.env);
