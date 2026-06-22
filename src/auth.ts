import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getMe } from '@/lib/api/auth';
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
        // With the cookie-based flow, login() is called from the browser
        // directly (so the browser receives the Set-Cookie headers).
        // By the time authorize() is called, we just need to verify the
        // user info. The frontend passes user data via the credentials object.
        if (!credentials?.email) return null;

        try {
          // The frontend already called login() and has the user data.
          // We trust the data passed from the frontend signIn() call.
          return {
            id: (credentials as Record<string, string>).id ?? '',
            email: credentials.email,
            name: (credentials as Record<string, string>).name ?? '',
            role: (credentials as Record<string, string>).role ?? '',
            tenantId: (credentials as Record<string, string>).tenantId ?? '',
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
        token.role = user.role;
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.tenantId = token.tenantId;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'vigilens-dev-secret',
};
