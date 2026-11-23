import { db } from "#server/db";
import { users } from "~~/drizzle/schema";
import { eq } from "drizzle-orm";
import { establishOAuthSession, redirectOAuth } from "#server/utils/oauth";
import { ensureDefaultAccount } from "#server/services/accounts.service";

export default defineOAuthGoogleEventHandler({
    async onSuccess(event, { user }) {
        const email = String(user.email || '').trim().toLowerCase()
        const emailVerified = (user as { email_verified?: boolean }).email_verified

        if (!email || emailVerified === false) {
            return redirectOAuth(event, '/login?error=oauth')
        }

        let dbUser = await db.query.users.findFirst({
            where: eq(users.email, email)
        });

        if (dbUser && dbUser.authProvider !== 'google') {
            return redirectOAuth(event, `/login?error=wrong_provider`);
        }

        if (!dbUser) {
            const [newUser] = await db.insert(users).values({
                email,
                name: user.name ?? '',
                authProvider: 'google',
            }).returning();

            if (!newUser) {
                return redirectOAuth(event, '/login?error=oauth');
            }

            dbUser = newUser;
            await ensureDefaultAccount(newUser.id);
        }

        return establishOAuthSession(event, {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            authProvider: dbUser.authProvider || 'google',
            twoFactorEnabled: dbUser.twoFactorEnabled ?? false,
            sessionVersion: dbUser.sessionVersion
        })
    },

    async onError(event, error) {
        console.error('Google OAuth error:', error);
        return redirectOAuth(event, '/login?error=oauth');
    }
});
