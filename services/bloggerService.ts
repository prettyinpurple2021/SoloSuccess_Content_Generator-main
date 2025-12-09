// A global declaration is used here to inform TypeScript about the
// gapi and google objects loaded from the external scripts in index.html.
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// These environment variables must be configured in your deployment environment.
// They are necessary for Google API authentication.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const API_KEY = process.env.GOOGLE_API_KEY;
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/blogger/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/blogger';

export const isBloggerConfigured = !!CLIENT_ID && !!API_KEY;

let tokenClient: any;

// A promise that resolves when both the Google API client (gapi) and
// Google Identity Services (gis) are loaded and initialized.
const gapiReady = new Promise<void>((resolve) => {
  if (!isBloggerConfigured) {
    console.warn(
      'Blogger integration is not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_API_KEY environment variables.'
    );
    resolve(); // Resolve immediately so the app doesn't hang.
    return;
  }
  const checkGapi = () => {
    if (window.gapi && window.google) {
      window.gapi.load('client', async () => {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: '', // The callback is handled by the promise in handleAuthClick
        });
        resolve();
      });
    } else {
      setTimeout(checkGapi, 100);
    }
  };
  checkGapi();
});

/**
 * Initializes the Blogger service and checks if the user is already signed in.
 * @returns {Promise<boolean>} A promise that resolves to true if the user is signed in, false otherwise.
 */
export const initClient = async (): Promise<boolean> => {
  if (!isBloggerConfigured) return false;
  await gapiReady;
  return window.gapi?.client?.getToken && !!window.gapi.client.getToken();
};

/**
 * Initiates the Google OAuth2 sign-in flow.
 * @returns {Promise<void>} A promise that resolves on successful authentication or rejects on error.
 */
export const handleAuthClick = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!isBloggerConfigured || !tokenClient) {
      return reject(new Error('Blogger integration is not configured. Cannot authenticate.'));
    }
    if (window.gapi.client.getToken() === null) {
      tokenClient.callback = async (resp: any) => {
        if (resp.error !== undefined) {
          reject(new Error('Failed to authenticate with Blogger. Please try again.'));
        } else {
          resolve();
        }
      };
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      resolve();
    }
  });
};

/**
 * Signs the user out of their Google account for this application.
 */
export const handleSignoutClick = () => {
  if (!isBloggerConfigured || !window.gapi?.client) return;
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      window.gapi.client.setToken(null);
    });
  }
};

/**
 * Fetches the list of blogs for the authenticated user.
 * @returns {Promise<any[]>} A promise that resolves to an array of blog objects.
 */
export const listBlogs = async (): Promise<any[]> => {
  if (!isBloggerConfigured || !window.gapi?.client?.blogger) {
    console.warn('Cannot list blogs: Blogger client is not initialized.');
    return [];
  }
  try {
    const response = await window.gapi.client.blogger.blogs.listByUser({ userId: 'self' });
    return response.result.items || [];
  } catch (error) {
    console.error('Error fetching blogs:', error);
    return [];
  }
};

/**
 * Creates a new post on a specified Blogger blog.
 * @param {string} blogId - The ID of the blog to post to.
 * @param {string} title - The title of the post.
 * @param {string} content - The HTML content of the post.
 * @param {string[]} labels - An array of tags for the post.
 * @returns {Promise<any>} A promise that resolves to the created post object.
 */
export const createPost = async (
  blogId: string,
  title: string,
  content: string,
  labels: string[]
): Promise<any> => {
  if (!isBloggerConfigured || !window.gapi?.client?.blogger) {
    throw new Error('Cannot create post: Blogger client is not initialized.');
  }
  const response = await window.gapi.client.blogger.posts.insert({
    blogId: blogId,
    isDraft: false, // Publish immediately
    resource: {
      title: title,
      content: content,
      labels: labels,
    },
  });
  return response.result;
};
