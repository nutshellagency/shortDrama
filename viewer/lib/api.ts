// API client for ShortDrama backend

import type { AuthResponse, FeedResponse, SeriesListResponse, UnlockResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiResponse<T> {
    ok: boolean;
    status: number;
    data: T;
}

async function api<T>(path: string, opts: RequestInit = {}): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_URL}${path}`, {
        ...opts,
        headers: {
            ...opts.headers,
        },
    });

    let data: T;
    try {
        data = await res.json();
    } catch {
        data = {} as T;
    }

    return { ok: res.ok, status: res.status, data };
}

function authHeaders(token: string | null): HeadersInit {
    return token ? { authorization: `Bearer ${token}` } : {};
}

export async function guestLogin(): Promise<ApiResponse<AuthResponse>> {
    return api<AuthResponse>('/auth/guest', { method: 'POST' });
}

export async function getFeed(token: string): Promise<ApiResponse<FeedResponse>> {
    return api<FeedResponse>('/feed/home', {
        headers: authHeaders(token),
    });
}

export async function getSeriesList(token: string): Promise<ApiResponse<SeriesListResponse>> {
    return api<SeriesListResponse>('/feed/series', {
        headers: authHeaders(token),
    });
}

export async function unlockEpisode(
    token: string,
    episodeId: string,
    method: 'ad' | 'coins'
): Promise<ApiResponse<UnlockResponse>> {
    return api<UnlockResponse>(`/episode/${episodeId}/unlock`, {
        method: 'POST',
        headers: {
            ...authHeaders(token),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method }),
    });
}

export async function updateProgress(
    token: string,
    episodeId: string,
    watched: boolean
): Promise<ApiResponse<{ ok: boolean }>> {
    return api<{ ok: boolean }>(`/episode/${episodeId}/progress`, {
        method: 'POST',
        headers: {
            ...authHeaders(token),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ watched }),
    });
}

export async function markViewed(
    token: string,
    episodeId: string
): Promise<ApiResponse<{ ok: boolean }>> {
    return api<{ ok: boolean }>(`/episode/${episodeId}/viewed`, {
        method: 'POST',
        headers: authHeaders(token),
    });
}
