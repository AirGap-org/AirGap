import { describe, expect, it } from 'vitest'
import { isCloudflareIP, isIPInCidrs } from '#server/utils/cloudflareIP'
import { resolveProxiedClientIP } from '#server/utils/clientIP'

describe('Cloudflare client IP', () => {
    it('reconnaît les plages IPv4 Cloudflare', () => {
        expect(isCloudflareIP('104.16.0.1')).toBe(true)
        expect(isCloudflareIP('104.23.255.255')).toBe(true)
        expect(isCloudflareIP('104.24.0.0')).toBe(true)
        expect(isCloudflareIP('104.27.255.255')).toBe(true)
        expect(isCloudflareIP('104.28.0.0')).toBe(false)
        expect(isCloudflareIP('172.64.10.20')).toBe(true)
        expect(isCloudflareIP('8.8.8.8')).toBe(false)
    })

    it('reconnaît les plages IPv6 Cloudflare', () => {
        expect(isCloudflareIP('2606:4700::1')).toBe(true)
        expect(isCloudflareIP('2400:cb00::1')).toBe(true)
        expect(isCloudflareIP('2001:db8::1')).toBe(false)
    })

    it('rejette les valeurs invalides', () => {
        expect(isCloudflareIP(undefined)).toBe(false)
        expect(isCloudflareIP('')).toBe(false)
        expect(isCloudflareIP('pas-une-ip')).toBe(false)
    })

    it('gère une liste de proxies de confiance', () => {
        expect(isIPInCidrs('10.20.0.2', ['10.20.0.0/24'])).toBe(true)
        expect(isIPInCidrs('10.20.5.102', ['10.20.0.0/24'])).toBe(false)
        expect(isIPInCidrs('10.20.0.2', ['pas-un-cidr', '10.20.0.2/32'])).toBe(true)
        expect(isIPInCidrs('8.8.8.8', [])).toBe(false)
    })

    it('accepte CF-Connecting-IP depuis Cloudflare ou un proxy de confiance', () => {
        expect(resolveProxiedClientIP('104.16.0.1', '203.0.113.5')).toBe('203.0.113.5')
        expect(resolveProxiedClientIP('2606:4700::1', '198.51.100.7')).toBe('198.51.100.7')
        expect(resolveProxiedClientIP('10.20.0.2', '203.0.113.5', ['10.20.0.0/24'])).toBe('203.0.113.5')
        expect(resolveProxiedClientIP('8.8.8.8', '203.0.113.5')).toBeUndefined()
        expect(resolveProxiedClientIP('10.20.0.2', '203.0.113.5', [])).toBeUndefined()
        expect(resolveProxiedClientIP('104.16.0.1', 'pas-une-ip')).toBeUndefined()
        expect(resolveProxiedClientIP('104.16.0.1', undefined)).toBeUndefined()
    })
})
