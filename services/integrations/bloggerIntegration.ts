import { Integration, PostResult } from '../../types';
import { credentialEncryption } from '../credentialEncryption';

// Blogger-specific credential interface
interface BloggerCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
  blogId?: string; // User's selected blog ID
}

// Blogger API endpoints
const BLOGGER_API_BASE = 'https://www.googleapis.com/blogger/v3';

/**
 * User-specific Blogger integration service
 * Each user provides their own Google API credentials
 */
export class BloggerIntegrationService {
  private static instance: BloggerIntegrationService;

  static getInstance(): BloggerIntegrationService {
    if (!BloggerIntegrationService.instance) {
      BloggerIntegrationService.instance = new BloggerIntegrationService();
    }
    return BloggerIntegrationService.instance;
  }

  /**
   * Test connection to Blogger API with user credentials
   */
  async testConnection(integration: Integration): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials = await this.decryptCredentials(integration);

      // Test by fetching user's blogs
      const blogs = await this.listUserBlogs(credentials);

      return {
        success: blogs.length > 0,
        error: blogs.length === 0 ? 'No blogs found for this account' : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
      };
    }
  }

  /**
   * Get list of user's Blogger blogs
   */
  async listUserBlogs(
    credentials: BloggerCredentials
  ): Promise<Array<{ id: string; name: string; url: string }>> {
    const response = await fetch(`${BLOGGER_API_BASE}/users/self/blogs`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch blogs: ${response.statusText}`);
    }

    const data = await response.json();
    return (data.items || []).map((blog: any) => ({
      id: blog.id,
      name: blog.name,
      url: blog.url,
    }));
  }

  /**
   * Post content to user's Blogger blog
   */
  async publishPost(
    integration: Integration,
    title: string,
    content: string,
    tags: string[] = []
  ): Promise<PostResult> {
    try {
      const credentials = await this.decryptCredentials(integration);

      if (!credentials.blogId) {
        throw new Error('No blog selected. Please configure your Blogger integration.');
      }

      const postData = {
        title,
        content,
        labels: tags,
      };

      const response = await fetch(`${BLOGGER_API_BASE}/blogs/${credentials.blogId}/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        throw new Error(`Failed to publish post: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        postId: result.id,
        url: result.url,
        platform: 'blogger',
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish post',
        platform: 'blogger',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validate Blogger credentials format
   */
  validateCredentials(credentials: any): credentials is BloggerCredentials {
    return (
      typeof credentials === 'object' &&
      typeof credentials.clientId === 'string' &&
      typeof credentials.clientSecret === 'string' &&
      typeof credentials.accessToken === 'string'
    );
  }

  /**
   * Get OAuth URL for user to authenticate with Google
   */
  getAuthUrl(clientId: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'https://www.googleapis.com/auth/blogger',
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    clientId: string,
    clientSecret: string,
    refreshToken: string
  ): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Decrypt user's Blogger credentials
   */
  private async decryptCredentials(integration: Integration): Promise<BloggerCredentials> {
    const userKey = credentialEncryption.generateUserKey(integration.name, 'blogger-integration');
    const decrypted = await credentialEncryption.decrypt(integration.credentials, userKey);

    if (!this.validateCredentials(decrypted)) {
      throw new Error('Invalid Blogger credentials format');
    }

    return decrypted;
  }
}

export const bloggerIntegration = BloggerIntegrationService.getInstance();
