// Empty = same domain: the Vite dev server (or the host) forwards /api and /uploads to the backend.
const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export const apiUrl = (path: string) => `${API_ORIGIN}/api${path}`;

/** Uploaded dish photos are saved on the backend as /uploads/...; web links are used as they are. */
export const assetUrl = (url: string | null) => (url?.startsWith('/uploads/') ? `${API_ORIGIN}${url}` : url);
