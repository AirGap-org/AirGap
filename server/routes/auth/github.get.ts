import {db} from "#server/db";
import {eq} from "drizzle-orm";
import {users} from "~~/drizzle/schema";
import { establishOAuthSession, redirectOAuth } from "#server/utils/oauth";

export default defineOAuthGitHubEventHandler({
    config: {
        scope: ['user:email']
    },

    async onSuccess(event, {user, tokens}) {
        let userEmail = user.email;

        if (!userEmail) {
            try {
                const res = await $fetch<Array<{ email: string; primary: boolean }>>(
                    'https://api.github.com/user/emails',
                    {
                        headers:
                            {
                                Authorization: `Bearer ${tokens.access_token}`,
                                'User-Agent': 'AirGap'
                            }
                    }
                );
                userEmail = res?.find((e) => e.primary)?.email || res?.[0]?.email || null;
            } catch (e) {
                console.error('Failed to fetch GitHub email:', e);
                return redirectOAuth(event, '/login?error=oauth');
            }
        }

        if (!userEmail) {
            return redirectOAuth(event, '/login?error=oauth');
        }

        let dbUser = await db.query.users.findFirst({
            where: eq(users.email, userEmail)
        });

        if (dbUser && dbUser.authProvider !== 'github') {
            return redirectOAuth(event, `/login?error=wrong_provider`);
        }

        if (!dbUser) {
            const [newUser] = await db.insert(users).values({
                email: userEmail,
                name: user.name ?? '',
                authProvider: 'github',
            }).returning();

            if (!newUser) {
                return redirectOAuth(event, '/login?error=oauth');
            }

            dbUser = newUser;
        }

        return establishOAuthSession(event, {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            authProvider: dbUser.authProvider || 'github',
            twoFactorEnabled: dbUser.twoFactorEnabled ?? false
        })
    },

    async onError(event, error) {
        console.error('GitHub OAuth error:', error);
        return redirectOAuth(event, '/login?error=oauth');
    }
});
