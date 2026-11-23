import { beforeAll, describe, expect, it } from 'vitest'
import { setup, fetch, url } from '@nuxt/test-utils/e2e'
import { eq } from 'drizzle-orm'
import { Hash } from '@adonisjs/hash'
import { Scrypt } from '@adonisjs/hash/drivers/scrypt'
import { db } from '#server/db'
import { accounts, assoTransactionsCategories, transactions, users } from '~~/drizzle/schema'
import { resetDb } from '../helpers/db'

await setup({ server: true })

type JsonObject = Record<string, unknown>

const readJson = async <T = JsonObject>(response: Response): Promise<T> => {
    const text = await response.text()
    return (text ? JSON.parse(text) : null) as T
}

class ApiClient {
    private cookies = new Map<string, string>()

    get cookieHeader(): string {
        return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ')
    }

    setCookieHeader(header: string): void {
        for (const part of header.split(';')) {
            const separator = part.indexOf('=')
            if (separator <= 0) continue

            const name = part.slice(0, separator).trim()
            const value = part.slice(separator + 1).trim()

            if (!value || /max-age=0/i.test(part)) {
                this.cookies.delete(name)
            } else {
                this.cookies.set(name, value)
            }
        }
    }

    async request(path: string, options: RequestInit = {}): Promise<Response> {
        const headers = new Headers(options.headers)

        if (this.cookies.size > 0) {
            headers.set('cookie', this.cookieHeader)
        }

        if (options.body && !headers.has('content-type')) {
            headers.set('content-type', 'application/json')
        }

        const response = await fetch(url(path), { ...options, headers })
        const setCookie = response.headers.get('set-cookie')

        if (setCookie) {
            this.setCookieHeader(setCookie)
        }

        return response
    }

    async json<T = JsonObject>(path: string, options: RequestInit = {}): Promise<{ status: number; body: T }> {
        const response = await this.request(path, options)
        return { status: response.status, body: await readJson<T>(response) }
    }

    post<T = JsonObject>(path: string, body: unknown): Promise<{ status: number; body: T }> {
        return this.json<T>(path, { method: 'POST', body: JSON.stringify(body) })
    }

    patch<T = JsonObject>(path: string, body: unknown): Promise<{ status: number; body: T }> {
        return this.json<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
    }

    delete<T = JsonObject>(path: string): Promise<{ status: number; body: T }> {
        return this.json<T>(path, { method: 'DELETE' })
    }
}

const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
const aliceEmail = `alice-${suffix}@example.com`
const bobEmail = `bob-${suffix}@example.com`
const password = 'mot-de-passe-e2e'

const alice = new ApiClient()
const bob = new ApiClient()

type RegisteredUser = { id: string; email: string; name: string }
type Category = { id: string; name: string; typeTransaction: string; userId: string | null }

let aliceUser: RegisteredUser
let aliceAccountId: string
let categoryId: string
let transactionId: string
let budgetId: string

const createCategory = async (client: ApiClient, name: string, typeTransaction = 'depense') => {
    const result = await client.post<{ category: Category }>('/api/categories', { name, typeTransaction })
    expect(result.status).toBe(200)
    return result.body.category
}

describe('E2E CRUD', () => {
    beforeAll(async () => {
        await resetDb()

        const aliceRegistration = await alice.post<{ user: RegisteredUser }>('/api/auth/register', {
            name: 'Alice E2E',
            email: aliceEmail,
            password
        })
        expect(aliceRegistration.status).toBe(200)
        aliceUser = aliceRegistration.body.user

        const bobRegistration = await bob.post<{ user: RegisteredUser }>('/api/auth/register', {
            name: 'Bob E2E',
            email: bobEmail,
            password
        })
        expect(bobRegistration.status).toBe(200)
        expect(bobRegistration.body.user.email).toBe(bobEmail)

        const [account] = await db.select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.userId, aliceUser.id))

        expect(account?.id).toBeTruthy()
        aliceAccountId = account!.id
    })

    it('inscription, session, utilisateur et dashboard', async () => {
        expect(aliceUser.email).toBe(aliceEmail)
        expect(alice.cookieHeader).toBeTruthy()

        const session = await alice.json<{ user: RegisteredUser }>('/api/_auth/session')
        expect(session.status).toBe(200)
        expect(session.body.user.id).toBe(aliceUser.id)

        expect((await alice.json('/api/user')).status).toBe(200)
        expect((await alice.json('/api/dashboard')).status).toBe(200)
    })

    it('login avec mauvais puis bon mot de passe', async () => {
        const wrong = await new ApiClient().post('/api/auth/login', {
            email: aliceEmail,
            password: 'mauvais-mot-de-passe'
        })
        expect(wrong.status).toBe(401)

        const client = new ApiClient()
        const login = await client.post<{ success?: boolean; requiresTwoFactor?: boolean }>('/api/auth/login', {
            email: aliceEmail,
            password
        })
        expect(login.status).toBe(200)
        expect(login.body.success).toBe(true)
        expect(client.cookieHeader).toBeTruthy()
    })

    it('CRUD catégories et protection des catégories globales', async () => {
        const category = await createCategory(alice, `Catégorie E2E ${suffix}`)
        categoryId = category.id

        const list = await alice.json<{ categories: Category[] }>('/api/categories')
        expect(list.status).toBe(200)
        expect(list.body.categories.some(entry => entry.id === categoryId)).toBe(true)

        const update = await alice.patch<{ category: Category }>(`/api/categories/${categoryId}`, {
            name: `Catégorie E2E modifiée ${suffix}`,
            typeTransaction: 'revenu'
        })
        expect(update.status).toBe(200)
        expect(update.body.category.typeTransaction).toBe('revenu')

        expect((await alice.json(`/api/categories/${categoryId}`)).status).toBe(200)
        expect((await alice.delete(`/api/categories/${categoryId}`)).status).toBe(200)
        expect((await alice.json(`/api/categories/${categoryId}`)).status).toBe(404)

        const globalCategory = list.body.categories.find(entry => entry.userId === null)
        expect(globalCategory).toBeTruthy()
        expect((await alice.patch(`/api/categories/${globalCategory!.id}`, { name: 'interdit' })).status).toBe(403)
        expect((await alice.delete(`/api/categories/${globalCategory!.id}`)).status).toBe(403)
        categoryId = globalCategory!.id
    })

    it('CRUD transaction avec vérification des associations', async () => {
        const created = await alice.post<{ transaction: { id: string } }>('/api/transactions', {
            amount: 42.5,
            description: `Transaction E2E ${suffix}`,
            date: '2026-11-10T00:00:00.000Z',
            accountId: null,
            typeTransaction: 'depense',
            categoryId
        })
        expect(created.status).toBe(200)
        transactionId = created.body.transaction.id

        const list = await alice.json<{ transactions: Array<{ id: string }> }>('/api/transactions')
        expect(list.status).toBe(200)
        expect(list.body.transactions.some(entry => entry.id === transactionId)).toBe(true)
        expect((await alice.json(`/api/transactions/${transactionId}`)).status).toBe(200)

        const updated = await alice.patch<{ transaction: { amount: string } }>(`/api/transactions/${transactionId}`, {
            amount: 55.5,
            description: `Transaction E2E modifiée ${suffix}`,
            categoryId
        })
        expect(updated.status).toBe(200)

        expect((await alice.delete(`/api/transactions/${transactionId}`)).status).toBe(200)
        expect((await alice.json(`/api/transactions/${transactionId}`)).status).toBe(404)

        const associations = await db.select()
            .from(assoTransactionsCategories)
            .where(eq(assoTransactionsCategories.transactionId, transactionId))
        expect(associations).toHaveLength(0)
    })

    it('CRUD budget', async () => {
        const created = await alice.post<{ budget: { id: string } }>('/api/budgets', {
            name: `Budget E2E ${suffix}`,
            amount: 300,
            startDate: '2026-11-01T00:00:00.000Z',
            endDate: '2026-11-30T00:00:00.000Z',
            accountId: null,
            categoryIds: [categoryId]
        })
        expect(created.status).toBe(200)
        budgetId = created.body.budget.id

        expect((await alice.json('/api/budgets')).status).toBe(200)
        expect((await alice.json(`/api/budgets/${budgetId}`)).status).toBe(200)

        const updated = await alice.patch(`/api/budgets/${budgetId}`, {
            name: `Budget E2E modifié ${suffix}`,
            amount: 350,
            categoryIds: [categoryId]
        })
        expect(updated.status).toBe(200)

        expect((await alice.delete(`/api/budgets/${budgetId}`)).status).toBe(200)
        expect((await alice.json(`/api/budgets/${budgetId}`)).status).toBe(404)
    })

    it('import CSV, déduplication et catégorie privée', async () => {
        const importedCategoryName = `Import E2E ${suffix}`
        const payload = {
            transactions: [
                {
                    date: '2026-11-12T00:00:00.000Z',
                    description: `Import un ${suffix}`,
                    amount: 19.99,
                    accountId: aliceAccountId,
                    categoryName: importedCategoryName,
                    typeTransaction: 'depense'
                },
                {
                    date: '2026-11-13T00:00:00.000Z',
                    description: `Import deux ${suffix}`,
                    amount: 29.99,
                    accountId: aliceAccountId,
                    categoryName: importedCategoryName,
                    typeTransaction: 'depense'
                }
            ]
        }

        const first = await alice.post<{ count: number }>('/api/transactions/import', payload)
        expect(first.status).toBe(200)
        expect(first.body.count).toBe(2)

        const second = await alice.post<{ count: number }>('/api/transactions/import', payload)
        expect(second.status).toBe(200)
        expect(second.body.count).toBe(0)

        const categoriesList = await alice.json<{ categories: Category[] }>('/api/categories')
        const importedCategory = categoriesList.body.categories.find(entry => entry.name === importedCategoryName)
        expect(importedCategory?.userId).toBe(aliceUser.id)

        const importedRows = await db.select()
            .from(transactions)
            .where(eq(transactions.accountId, aliceAccountId))
        expect(importedRows).toHaveLength(2)
    })

    it('classify et predict avec IA désactivée', async () => {
        const classify = await alice.post<{ aiEnabled: boolean; transactions: JsonObject[] }>('/api/transactions/classify', {
            transactions: [{ description: 'Test IA', amount: 10 }]
        })
        expect(classify.status).toBe(200)
        expect(classify.body.aiEnabled).toBe(false)
        expect(classify.body.transactions).toHaveLength(1)

        const predict = await alice.post('/api/transactions/predict', { libelle: 'Test IA', montant: 10 })
        expect(predict.status).toBe(503)
    })

    it('profil, email et mot de passe', async () => {
        const profile = await alice.patch('/api/user/profile', { name: 'Alice Modifiée' })
        expect(profile.status).toBe(200)

        const email = await alice.patch('/api/user/email', {
            email: `alice-new-${suffix}@example.com`,
            currentPassword: password
        })
        expect(email.status).toBe(200)

        const oldCookie = alice.cookieHeader

        const passwordUpdate = await alice.patch('/api/user/password', {
            currentPassword: password,
            newPassword: 'nouveau-mot-de-passe-e2e',
            confirmPassword: 'nouveau-mot-de-passe-e2e'
        })
        expect(passwordUpdate.status).toBe(200)

        const staleClient = new ApiClient()
        staleClient.setCookieHeader(oldCookie)
        expect((await staleClient.json('/api/user')).status).toBe(401)

        const relogin = await new ApiClient().post('/api/auth/login', {
            email: `alice-new-${suffix}@example.com`,
            password: 'nouveau-mot-de-passe-e2e'
        })
        expect(relogin.status).toBe(200)
    })

    it('isolation cross-user sur transactions et budgets', async () => {
        const bobCategory = await createCategory(bob, `Catégorie Bob ${suffix}`)

        const bobTransaction = await bob.post<{ transaction: { id: string } }>('/api/transactions', {
            amount: 10,
            description: `Transaction Bob ${suffix}`,
            date: '2026-11-14T00:00:00.000Z',
            accountId: null,
            typeTransaction: 'depense',
            categoryId: bobCategory.id
        })
        expect(bobTransaction.status).toBe(200)

        const bobBudget = await bob.post<{ budget: { id: string } }>('/api/budgets', {
            name: `Budget Bob ${suffix}`,
            amount: 100,
            startDate: '2026-11-01T00:00:00.000Z',
            endDate: '2026-11-30T00:00:00.000Z',
            categoryIds: [bobCategory.id]
        })
        expect(bobBudget.status).toBe(200)

        expect((await alice.json(`/api/transactions/${bobTransaction.body.transaction.id}`)).status).toBe(404)
        expect((await alice.patch(`/api/transactions/${bobTransaction.body.transaction.id}`, { amount: 1 })).status).toBe(404)
        expect((await alice.delete(`/api/transactions/${bobTransaction.body.transaction.id}`)).status).toBe(404)

        expect((await alice.json(`/api/budgets/${bobBudget.body.budget.id}`)).status).toBe(404)
        expect((await alice.patch(`/api/budgets/${bobBudget.body.budget.id}`, { amount: 1 })).status).toBe(404)
        expect((await alice.delete(`/api/budgets/${bobBudget.body.budget.id}`)).status).toBe(404)

        expect((await bob.json(`/api/transactions/${bobTransaction.body.transaction.id}`)).status).toBe(200)
        expect((await bob.json(`/api/budgets/${bobBudget.body.budget.id}`)).status).toBe(200)
    })

    it('refuse la reconfiguration 2FA quand elle est active', async () => {
        await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, aliceUser.id))

        try {
            const response = await alice.post('/api/auth/2fa/setup', {})
            expect(response.status).toBe(409)
        } finally {
            await db.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, aliceUser.id))
        }
    })

    it('santé, headers de sécurité et calendrier', async () => {
        const health = await new ApiClient().json('/api/health')
        expect(health.status).toBe(200)

        const page = await new ApiClient().request('/login')
        expect(page.status).toBe(200)
        expect(page.headers.get('content-security-policy')).toContain('default-src')
        expect(page.headers.get('x-frame-options')).toBe('DENY')

        expect((await alice.json('/api/calendar/years')).status).toBe(200)
        expect((await alice.json('/api/calendar/months')).status).toBe(200)
        expect((await alice.json('/api/calendar/quarters')).status).toBe(200)
        expect((await alice.json('/api/calendar?year=2026&month=11')).status).toBe(200)
        expect((await alice.json('/api/calendar?year=2026&month=13')).status).toBe(400)
        expect((await alice.json('/api/calendar?year=2026&quarter=5')).status).toBe(400)
    })

    it('connecte un ancien compte scrypt et migre le hash vers bcrypt', async () => {
        const legacyEmail = `legacy-${suffix}@example.com`
        const legacyPassword = 'ancien-mot-de-passe-e2e'
        const hasher = new Hash(new Scrypt({}))
        const legacyHash = await hasher.make(legacyPassword)

        const [legacyUser] = await db.insert(users).values({
            email: legacyEmail,
            name: 'Legacy E2E',
            password: legacyHash,
            authProvider: 'local'
        }).returning()

        expect(legacyUser?.id).toBeTruthy()
        expect(legacyUser?.password?.startsWith('$scrypt$')).toBe(true)

        const client = new ApiClient()
        const login = await client.post('/api/auth/login', {
            email: legacyEmail,
            password: legacyPassword
        })
        expect(login.status).toBe(200)
        expect((await client.json('/api/user')).status).toBe(200)

        const [stored] = await db.select({ password: users.password })
            .from(users)
            .where(eq(users.id, legacyUser!.id))

        expect(stored?.password?.startsWith('$2')).toBe(true)
        expect(stored?.password?.startsWith('$scrypt$')).toBe(false)
    })
})
