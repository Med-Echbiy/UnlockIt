/**
 * IGDB API Client for UnlockIt
 *
 * IMPORTANT: These credentials are for UnlockIt only.
 * Rate limit: 4 requests per second per IP address
 * No daily/monthly limits as of IGDB API v4
 */

import { invoke } from "@tauri-apps/api/core";

const IGDB_CLIENT_ID = "n34rlgq5er0kv6r5dzhrfd08l68jlp";
const IGDB_CLIENT_SECRET = "nv9h3hh92gqsg1ifvaixx700fvpj61";
const IGDB_TOKEN_URL = "https://id.twitch.tv/oauth2/token";

interface IGDBToken {
  access_token: string;
  expires_in: number;
  token_type: string;
  obtained_at: number;
}

interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  cover?: {
    id: number;
    url: string;
    image_id: string;
  };
  screenshots?: Array<{
    id: number;
    url: string;
    image_id: string;
  }>;
  artworks?: Array<{
    id: number;
    url: string;
    image_id: string;
  }>;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  involved_companies?: Array<{
    company: {
      id: number;
      name: string;
    };
    developer: boolean;
    publisher: boolean;
  }>;
  release_dates?: Array<{
    id: number;
    date: number;
    platform: number;
  }>;
  aggregated_rating?: number;
  aggregated_rating_count?: number;
  rating?: number;
  rating_count?: number;
  websites?: Array<{
    id: number;
    url: string;
    category: number;
  }>;
  game_modes?: Array<{
    id: number;
    name: string;
  }>;
  themes?: Array<{
    id: number;
    name: string;
  }>;
}

class IGDBClient {
  private token: IGDBToken | null = null;
  private tokenPromise: Promise<string> | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private readonly REQUEST_DELAY = 250; // 4 requests per second = 250ms delay

  /**
   * Get or refresh the access token
   */
  private async getAccessToken(): Promise<string> {
    // If token exists and is still valid (with 5 min buffer)
    if (
      this.token &&
      Date.now() < this.token.obtained_at + (this.token.expires_in - 300) * 1000
    ) {
      return this.token.access_token;
    }

    // If there's already a token request in progress, wait for it
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Create new token request
    this.tokenPromise = (async () => {
      try {
        const response = await fetch(
          `${IGDB_TOKEN_URL}?client_id=${IGDB_CLIENT_ID}&client_secret=${IGDB_CLIENT_SECRET}&grant_type=client_credentials`,
          { method: "POST" }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to get IGDB token: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        this.token = {
          ...data,
          obtained_at: Date.now(),
        };

        return this.token!.access_token;
      } finally {
        this.tokenPromise = null;
      }
    })();

    return this.tokenPromise;
  }

  /**
   * Rate-limited request queue processor
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0) {
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      if (timeSinceLastRequest < this.REQUEST_DELAY) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.REQUEST_DELAY - timeSinceLastRequest)
        );
      }

      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Make a rate-limited request to IGDB API using Tauri backend
   */
  private async makeRequest<T>(endpoint: string, body: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const request = async () => {
        try {
          const token = await this.getAccessToken();

          const response = await invoke<any>("fetch_igdb_data", {
            clientId: IGDB_CLIENT_ID,
            accessToken: token,
            endpoint,
            query: body,
          });

          resolve(response as T);
        } catch (error) {
          // Check if it's a rate limit error
          if (error && typeof error === "string" && error.includes("429")) {
            // Rate limited - wait and retry
            await new Promise((resolve) => setTimeout(resolve, 1000));
            this.requestQueue.unshift(request); // Re-queue at front
            return;
          }
          reject(error);
        }
      };

      this.requestQueue.push(request);
      this.processQueue();
    });
  }

  /**
   * Search for games by name
   */
  async searchGames(
    searchTerm: string,
    limit: number = 10
  ): Promise<IGDBGame[]> {
    const query = `
      search "${searchTerm}";
      fields name, summary, storyline, cover.url, cover.image_id, 
             screenshots.url, screenshots.image_id,
             artworks.url, artworks.image_id,
             genres.name, 
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             release_dates.date, release_dates.platform,
             aggregated_rating, aggregated_rating_count, rating, rating_count,
             websites.url, websites.category,
             game_modes.name, themes.name;
      limit ${limit};
      where version_parent = null & category = 0;
    `;

    return this.makeRequest<IGDBGame[]>("games", query);
  }

  /**
   * Get game by exact name match
   */
  async getGameByName(gameName: string): Promise<IGDBGame | null> {
    const query = `
      fields name, summary, storyline, cover.url, cover.image_id, 
             screenshots.url, screenshots.image_id,
             artworks.url, artworks.image_id,
             genres.name, 
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             release_dates.date, release_dates.platform,
             aggregated_rating, aggregated_rating_count, rating, rating_count,
             websites.url, websites.category,
             game_modes.name, themes.name;
      where name = "${gameName.replace(
        /"/g,
        '\\"'
      )}" & version_parent = null & category = 0;
      limit 1;
    `;

    const results = await this.makeRequest<IGDBGame[]>("games", query);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get game by IGDB ID
   */
  async getGameById(gameId: number): Promise<IGDBGame | null> {
    const query = `
      fields name, summary, storyline, cover.url, cover.image_id, 
             screenshots.url, screenshots.image_id,
             artworks.url, artworks.image_id,
             genres.name, 
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             release_dates.date, release_dates.platform,
             aggregated_rating, aggregated_rating_count, rating, rating_count,
             websites.url, websites.category,
             game_modes.name, themes.name;
      where id = ${gameId};
      limit 1;
    `;

    const results = await this.makeRequest<IGDBGame[]>("games", query);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Convert IGDB image ID to full URL
   * @param imageId - IGDB image ID
   * @param size - Image size (t_thumb, t_cover_small, t_cover_big, t_screenshot_med, t_screenshot_big, t_1080p)
   */
  getImageUrl(
    imageId: string,
    size:
      | "thumb"
      | "cover_small"
      | "cover_big"
      | "screenshot_med"
      | "screenshot_big"
      | "1080p" = "cover_big"
  ): string {
    return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
  }

  /**
   * Batch search multiple games
   */
  async batchSearchGames(
    gameNames: string[]
  ): Promise<Map<string, IGDBGame | null>> {
    const results = new Map<string, IGDBGame | null>();

    // Process in batches to respect rate limits
    for (const gameName of gameNames) {
      try {
        const game = await this.getGameByName(gameName);
        results.set(gameName, game);
      } catch (error) {
        console.error(`Failed to fetch IGDB data for ${gameName}:`, error);
        results.set(gameName, null);
      }
    }

    return results;
  }
}

// Singleton instance
export const igdbClient = new IGDBClient();

// Export types
export type { IGDBGame, IGDBToken };
