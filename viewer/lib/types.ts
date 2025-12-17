// TypeScript interfaces for ShortDrama API responses

export interface Series {
    id: string;
    title: string;
    description?: string;
    language: string;
    genres: string[];
    defaultCoinCost: number;
}

export interface Episode {
    id: string;
    episodeNumber: number;
    status: string;
    lockType: 'FREE' | 'AD' | 'COINS';
    coinCost: number;
    videoUrl: string | null;
    thumbnailUrl: string | null;
    subtitlesUrl: string | null;
    durationSec?: number;
}

export interface Viewer {
    coins: number;
    unlocked: boolean;
    watched: boolean;
    lastSeriesId: string | null;
    lastEpisodeId: string | null;
}

export interface FeedItem {
    series: Series;
    episode: Episode;
    viewer: Viewer;
}

export interface FeedResponse {
    items: FeedItem[];
}

export interface SeriesListItem {
    id: string;
    title: string;
    language: string;
    genres: string[];
    episodeCount: number;
    coverUrl: string | null;
}

export interface SeriesListResponse {
    items: SeriesListItem[];
}

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        coins: number;
    };
}

export interface UnlockResponse {
    unlocked: boolean;
    coins?: number;
    granted?: number;
}
