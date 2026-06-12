import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { login } from '@/lib/api/auth';
import { ApiError } from '@/types/api';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const result = await login({
            email: credentials.email,
            password: credentials.password,
          });

          const { user, access_token, refresh_token } = result.data;

          return {
            id: user.id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            image: null,
            accessToken: access_token,
            refreshToken: refresh_token,
            role: user.role,
            tenantId: user.tenant_id,
          };
        } catch (error) {
          if (error instanceof ApiError) {
            throw new Error(error.message);
          }
          return null;
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/login', newUser: '/signup' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.accessToken = token.accessToken;
      session.user.role = token.role;
      session.user.tenantId = token.tenantId;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'vigilens-dev-secret',
};
