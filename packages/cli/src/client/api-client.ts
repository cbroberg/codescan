import axios, { AxiosInstance } from 'axios';
import { SearchRequest, SearchResult, Repository, IndexingStatus } from '@codescan/shared';

/**
 * HTTP client for communicating with CodeScan API
 */
export class ApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string = process.env.API_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: `${baseUrl}/api`,
      timeout: 600000, // 10 minutes for long-running indexing operations
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.success;
    } catch {
      return false;
    }
  }

  // ===== Indexing =====

  /**
   * Start building index for a repository
   */
  async buildIndex(path: string, name?: string): Promise<void> {
    await this.client.post('/index/build', { path, name });
  }

  /**
   * Get indexing status and progress
   */
  async getIndexStatus(): Promise<IndexingStatus> {
    const response = await this.client.get('/index/status');
    return response.data.data;
  }

  /**
   * Start file watcher
   */
  async startWatcher(): Promise<void> {
    await this.client.post('/index/watch/start');
  }

  /**
   * Stop file watcher
   */
  async stopWatcher(): Promise<void> {
    await this.client.post('/index/watch/stop');
  }

  // ===== Repositories =====

  /**
   * Get all repositories
   */
  async getRepositories(): Promise<Repository[]> {
    const response = await this.client.get('/repositories');
    return response.data.data;
  }

  /**
   * Get repository by ID
   */
  async getRepository(id: string): Promise<Repository> {
    const response = await this.client.get(`/repositories/${id}`);
    return response.data.data;
  }

  /**
   * Get repository technologies
   */
  async getRepositoryTechnologies(id: string): Promise<string[]> {
    const response = await this.client.get(`/repositories/${id}/technologies`);
    return response.data.data.map((t: any) => t.name);
  }

  /**
   * Delete repository
   */
  async deleteRepository(id: string): Promise<void> {
    await this.client.delete(`/repositories/${id}`);
  }

  /**
   * Get VS Code file URL
   */
  async getVsCodeFileUrl(filePath: string, line?: number, column?: number): Promise<string> {
    const response = await this.client.post('/repositories/vscode/open-file', {
      filePath,
      line,
      column,
    });
    return response.data.data.url;
  }

  /**
   * Get VS Code folder URL
   */
  async getVsCodeFolderUrl(folderPath: string): Promise<string> {
    const response = await this.client.post('/repositories/vscode/open-folder', {
      folderPath,
    });
    return response.data.data.url;
  }

  // ===== Search =====

  /**
   * Perform semantic search
   */
  async search(query: string, options?: any): Promise<SearchResult> {
    const response = await this.client.post('/search', {
      query,
      filters: options?.filters,
      maxResults: options?.maxResults,
    });
    return response.data.data;
  }

  /**
   * Get search history
   */
  async getSearchHistory(limit?: number): Promise<any[]> {
    const response = await this.client.get('/search/history', {
      params: { limit: limit || 20 },
    });
    return response.data.data;
  }

  // ===== Chat =====

  /**
   * Create a new chat session
   */
  async createChatSession(): Promise<string> {
    const response = await this.client.post('/chat/sessions');
    return response.data.data.id;
  }

  /**
   * Get chat session
   */
  async getChatSession(sessionId: string): Promise<any> {
    const response = await this.client.get(`/chat/sessions/${sessionId}`);
    return response.data.data;
  }

  /**
   * Send message to chat session
   */
  async sendChatMessage(sessionId: string, message: string): Promise<any> {
    const response = await this.client.post(`/chat/sessions/${sessionId}/messages`, {
      message,
    });
    return response.data.data;
  }

  /**
   * Delete chat session
   */
  async deleteChatSession(sessionId: string): Promise<void> {
    await this.client.delete(`/chat/sessions/${sessionId}`);
  }
}
