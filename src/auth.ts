import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('Auth file loaded');
        console.log(
          'Secret:',
          process.env.NEXTAUTH_SECRET || 'vigilens-dev-secret',
        );
        if (!credentials?.email || !credentials?.password) return null;
        const mockUsers = [
          {
            id: '1',
            email: 'demo@vigilens.com',
            password: 'demo123',
            name: 'Alex Morgan',
            image: null,
          },
          {
            id: '2',
            email: 'test@vigilens.com',
            password: 'password',
            name: 'Jordan Lee',
            image: null,
          },
        ];
        console.log('credential', credentials);
        const user = mockUsers.find(
          (u) =>
            u.email === credentials.email &&
            u.password === credentials.password,
        );
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login', error: '/dashboard' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token && session.user)
        (session.user as { id?: string }).id = token.id as string;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'vigilens-dev-secret',
};
