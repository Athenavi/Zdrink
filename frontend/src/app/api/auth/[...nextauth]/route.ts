// 注意：本项目使用自定义的认证管理（useUserStore），不使用 NextAuth
// 此文件保留作为示例，但不应被使用

// 如果需要重新启用 NextAuth，请取消下面的注释并正确配置
/*
import NextAuth, {NextAuthOptions} from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import apiClient from '@/lib/api';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('请输入用户名和密码');
        }

        try {
          // 调用后端的登录接口
          const response = await apiClient.post('/auth/login/', {
            username: credentials.username,
            password: credentials.password
          });

          const { access, refresh, user } = response.data;

          if (!access) {
            throw new Error('登录失败，未返回 token');
          }

          return {
            id: user.id,
            username: user.username,
            email: user.email,
            accessToken: access,
            refreshToken: refresh
          };
        } catch (error: any) {
          console.error('认证失败:', error);
          throw new Error(error.response?.data?.detail || '登录失败，请检查用户名和密码');
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.id = user.id;
        token.username = user.username;
      }
      
      if (trigger === 'update') {
        return {
          ...token,
          ...session
        };
      }
      
      return token;
    },
    
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.id as number,
        username: token.username as string,
        accessToken: token.accessToken as string,
        refreshToken: token.refreshToken as string
      };
      
      return session;
    }
  },
  
  pages: {
    signIn: '/login',
  },
  
  session: {
    strategy: 'jwt',
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
*/

// 空导出以避免 TypeScript 错误
export const GET = () => Response.json({error: 'NextAuth is disabled'});
export const POST = () => Response.json({error: 'NextAuth is disabled'});
