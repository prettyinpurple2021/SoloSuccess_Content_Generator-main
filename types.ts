// Using standard Date objects instead of Firebase Timestamps
export type Timestamp = Date;

export type PostStatus = 'draft' | 'scheduled' | 'posted' | 'posting';
export type ViewMode = 'list' | 'calendar';

export interface SocialMediaPosts {
  [platform: string]: string;
}

export interface GeneratedImages {
  [prompt: string]: string[];
}

export interface Post {
  id: string;
  userId?: string;
  topic: string;
  idea: string;
  content: string;
  status: PostStatus;
  tags: string[];
  socialMediaPosts: SocialMediaPosts;
  socialMediaTones?: { [key: string]: string };
  socialMediaAudiences?: { [key: string]: string };
  scheduleDate?: Date;
  createdAt?: Date;
  postedAt?: Date;
  selectedImage?: string;
  summary?: string;
  headlines?: string[];
  // Enhanced features - optional fields
  brandVoiceId?: string;
  audienceProfileId?: string;
  campaignId?: string;
  seriesId?: string;
  templateId?: string;
  performanceScore?: number;
  optimizationSuggestions?: OptimizationSuggestion[];
  imageStyleId?: string;
}

export interface DatabasePost {
  id: string;
  user_id: string;
  topic: string;
  idea: string;
  content: string;
  status: PostStatus;
  tags: string[];
  social_media_posts: SocialMediaPosts;
  social_media_tones?: { [key: string]: string };
  social_media_audiences?: { [key: string]: string };
  schedule_date?: string; // ISO string
  created_at?: string; // ISO string
  posted_at?: string; // ISO string
  selected_image?: string;
  summary?: string;
  headlines?: string[];
  // Enhanced features - optional fields
  brand_voice_id?: string;
  audience_profile_id?: string;
  campaign_id?: string;
  series_id?: string;
  template_id?: string;
  performance_score?: number;
  optimization_suggestions?: OptimizationSuggestion[];
  image_style_id?: string;
}

export interface LoadingState {
  [key: string]: boolean | undefined;
  // Enhanced features loading states
  brandVoices?: boolean;
  audienceProfiles?: boolean;
  campaigns?: boolean;
  contentSeries?: boolean;
  analytics?: boolean;
  templates?: boolean;
  imageStyles?: boolean;
  performanceReport?: boolean;
  optimizationSuggestions?: boolean;
  schedulingSuggestions?: boolean;
  // Integration Manager loading states
  integrations?: boolean;
  integrationConnectionTest?: boolean;
  integrationSync?: boolean;
  integrationHealthCheck?: boolean;
  integrationWebhooks?: boolean;
}

// Enhanced Content Features Types

export interface BrandVoice {
  id: string;
  userId?: string;
  name: string;
  tone: string;
  vocabulary: string[];
  writingStyle: string;
  targetAudience: string;
  sampleContent: string[];
  createdAt: Date;
}

export interface DatabaseBrandVoice {
  id: string;
  user_id: string;
  name: string;
  tone: string;
  vocabulary: string[];
  writing_style: string;
  target_audience: string;
  sample_content: string[];
  created_at: string;
}

export interface AudienceProfile {
  id: string;
  userId?: string;
  name: string;
  ageRange: string;
  industry: string;
  interests: string[];
  painPoints: string[];
  preferredContentTypes: string[];
  engagementPatterns: EngagementData;
  createdAt: Date;
}

export interface DatabaseAudienceProfile {
  id: string;
  user_id: string;
  name: string;
  age_range: string;
  industry: string;
  interests: string[];
  pain_points: string[];
  preferred_content_types: string[];
  engagement_patterns: EngagementData;
  created_at: string;
}

export interface Campaign {
  id: string;
  userId?: string;
  name: string;
  description: string;
  theme: string;
  startDate: Date;
  endDate: Date;
  posts: string[]; // Post IDs
  platforms: string[];
  status: 'draft' | 'active' | 'completed' | 'paused';
  performance: CampaignMetrics;
  createdAt: Date;
}

export interface DatabaseCampaign {
  id: string;
  user_id: string;
  name: string;
  description: string;
  theme: string;
  start_date: string;
  end_date: string;
  platforms: string[];
  status: 'draft' | 'active' | 'completed' | 'paused';
  performance: CampaignMetrics;
  created_at: string;
}

export interface ContentSeries {
  id: string;
  userId?: string;
  campaignId?: string;
  name: string;
  theme: string;
  totalPosts: number;
  frequency: 'daily' | 'weekly' | 'biweekly';
  currentPost: number;
  posts: SeriesPost[];
  createdAt: Date;
}

export interface DatabaseContentSeries {
  id: string;
  user_id: string;
  campaign_id?: string;
  name: string;
  theme: string;
  total_posts: number;
  frequency: 'daily' | 'weekly' | 'biweekly';
  current_post: number;
  created_at: string;
}

export interface SeriesPost {
  id: string;
  seriesId: string;
  postId: string;
  sequenceNumber: number;
  title: string;
  status: PostStatus;
  scheduledDate?: Date;
}

export interface EngagementData {
  [platform: string]: {
    avgLikes: number;
    avgShares: number;
    avgComments: number;
    avgClicks: number;
    bestPostingTimes: TimeSlot[];
    engagementRate: number;
  };
}

export interface TimeSlot {
  time: string; // HH:mm format
  dayOfWeek: number; // 0-6
  engagementScore: number;
  confidence: number;
}

export interface AnalyticsData {
  id: string;
  postId: string;
  platform: string;
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
  impressions: number;
  reach: number;
  recordedAt: Date;
}

export interface DatabaseAnalyticsData {
  id: string;
  post_id: string;
  platform: string;
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
  impressions: number;
  reach: number;
  recorded_at: string;
}

export interface CampaignMetrics {
  totalPosts: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topPerformingPost?: string;
  platformPerformance: { [platform: string]: PlatformMetrics };
}

export interface PlatformMetrics {
  posts: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  avgEngagementRate: number;
}

export interface ContentTemplate {
  id: string;
  userId?: string;
  name: string;
  category: string;
  industry: string;
  contentType: 'blog' | 'social' | 'email' | 'video';
  structure: TemplateSection[];
  customizableFields: TemplateField[];
  usageCount: number;
  rating: number;
  isPublic: boolean;
  createdAt: Date;
}

export interface DatabaseContentTemplate {
  id: string;
  user_id: string;
  name: string;
  category: string;
  industry: string;
  content_type: 'blog' | 'social' | 'email' | 'video';
  structure: TemplateSection[];
  customizable_fields: TemplateField[];
  usage_count: number;
  rating: number;
  is_public: boolean;
  created_at: string;
}

export interface TemplateSection {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'cta' | 'image';
  content: string;
  isCustomizable: boolean;
  placeholder?: string;
}

export interface TemplateField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect';
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
  defaultValue?: string;
}

export interface ImageStyle {
  id: string;
  userId?: string;
  name: string;
  stylePrompt: string;
  colorPalette: string[];
  visualElements: string[];
  brandAssets: BrandAsset[];
  createdAt: Date;
}

export interface DatabaseImageStyle {
  id: string;
  user_id: string;
  name: string;
  style_prompt: string;
  color_palette: string[];
  visual_elements: string[];
  brand_assets: BrandAsset[];
  created_at: string;
}

export interface BrandAsset {
  id: string;
  type: 'logo' | 'color' | 'font' | 'pattern';
  data: string;
  usage: 'always' | 'optional' | 'never';
}

// Performance and Optimization Types
export interface PerformanceReport {
  timeframe: string;
  totalPosts: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topContent: ContentInsight[];
  platformBreakdown: { [platform: string]: PlatformMetrics };
  trends: PerformanceTrend[];
  recommendations: OptimizationSuggestion[];
}

export interface ContentInsight {
  postId: string;
  title: string;
  platform: string;
  engagementScore: number;
  insights: string[];
  contentType: string;
}

export interface PerformanceTrend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  percentage: number;
  timeframe: string;
}

export interface OptimizationSuggestion {
  type: 'timing' | 'content' | 'hashtags' | 'format';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
}

// Scheduling and Automation Types
export interface SchedulingSuggestion {
  postId: string;
  platform: string;
  suggestedTime: Date;
  reason: string;
  confidence: number;
}

export interface ConflictAnalysis {
  conflicts: ContentConflict[];
  suggestions: string[];
}

export interface ContentConflict {
  postId1: string;
  postId2: string;
  platform: string;
  conflictType: 'timing' | 'topic' | 'audience';
  severity: 'high' | 'medium' | 'low';
  resolution: string;
}

// Integration Manager Types
export type IntegrationType =
  | 'social_media'
  | 'analytics'
  | 'crm'
  | 'email'
  | 'storage'
  | 'ai_service';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'syncing' | 'maintenance';
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';
export type WebhookEvent =
  | 'post_created'
  | 'post_updated'
  | 'post_published'
  | 'analytics_updated'
  | 'error_occurred';

export interface Integration {
  id: string;
  userId: string;
  name: string;
  type: IntegrationType;
  platform: string;
  status: IntegrationStatus;
  credentials: EncryptedCredentials;
  configuration: IntegrationConfig;
  lastSync?: Date;
  syncFrequency: SyncFrequency;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseIntegration {
  id: string;
  user_id: string;
  name: string;
  type: IntegrationType;
  platform: string;
  status: IntegrationStatus;
  credentials: EncryptedCredentials;
  configuration: IntegrationConfig;
  last_sync?: string;
  sync_frequency: SyncFrequency;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EncryptedCredentials {
  encrypted: string;
  iv: string;
  authTag: string;
  algorithm: string;
  salt?: string; // Optional for backward compatibility
  iterations?: number; // PBKDF2 iterations
  version?: string; // Encryption version for key rotation
}

export interface IntegrationConfig {
  webhooks?: WebhookConfig[];
  syncSettings?: SyncSettings;
  rateLimits?: RateLimitConfig;
  errorHandling?: ErrorHandlingConfig;
  notifications?: NotificationConfig;
  customFields?: { [key: string]: unknown };
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  retryPolicy: RetryPolicy;
  headers?: { [key: string]: string };
  timeout?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
  retryDelay?: number; // Optional retry delay in milliseconds
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  batchSize: number;
  retryAttempts: number;
  timeoutMs: number;
  syncOnStartup: boolean;
  syncOnSchedule: boolean;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  windowSize?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
  strategy?: 'fixed' | 'sliding' | 'token-bucket'; // Rate limiting strategy
  refillRate?: number; // Tokens per second for token bucket
  tokensPerRequest?: number; // Tokens consumed per request
}

export interface ErrorHandlingConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  deadLetterQueue: boolean;
  alertOnFailure: boolean;
}

export interface NotificationConfig {
  emailNotifications: boolean;
  webhookNotifications: boolean;
  slackNotifications: boolean;
  notificationLevels: ('info' | 'warn' | 'error')[];
}

export interface IntegrationMetrics {
  integrationId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  avgResponseTime: number; // Alias for averageResponseTime
  successRate: number; // Success rate percentage
  lastRequestTime: Date;
  errorRate: number;
  uptime: number;
  dataProcessed: number;
  syncCount: number;
  lastSyncDuration: number;
}

export interface IntegrationLog {
  id: string;
  integrationId: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal';
  message: string;
  metadata: { [key: string]: unknown };
  details?: any;
  timestamp: Date;
  userId?: string;
}

export interface DatabaseIntegrationLog {
  id: string;
  integration_id: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal';
  message: string;
  metadata: { [key: string]: unknown };
  details?: any;
  timestamp: string;
  user_id?: string;
}

export interface IntegrationAlert {
  id: string;
  integrationId: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt: Date;
  metadata?: { [key: string]: unknown };
}

export interface DatabaseIntegrationAlert {
  id: string;
  integration_id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_resolved: boolean;
  resolved_at?: string;
  created_at: string;
  metadata?: { [key: string]: unknown };
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  responseTime: number;
  details?: { [key: string]: unknown };
  timestamp: Date;
}

export interface SyncResult {
  integrationId: string;
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  errors: string[];
  duration: number;
  timestamp: Date;
}

export interface HealthCheckResult {
  integrationId: string;
  healthScore: number; // 0-100
  checks: HealthCheck[];
  timestamp: Date;
  recommendations: string[];
}

export interface HealthCheck {
  check: string;
  success: boolean;
  error?: string;
  responseTime?: number;
  details?: { [key: string]: unknown };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  suggestions: string[];
  warnings?: string[];
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter: number;
  reason?: string; // Optional reason for rate limiting
}

// Platform-specific credential types
export interface TwitterCredentials {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessTokenSecret: string;
  bearerToken?: string;
}

export interface LinkedInCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken?: string;
}

export interface FacebookCredentials {
  appId: string;
  appSecret: string;
  accessToken: string;
  pageId?: string;
}

export interface InstagramCredentials {
  accessToken: string;
  userId: string;
  clientId: string;
  clientSecret: string;
}

export interface BlueSkyCredentials {
  handle: string;
  password: string;
  did?: string;
  serviceUrl?: string; // Default: https://bsky.social
  accessToken?: string;
  refreshToken?: string;
}

export interface RedditCredentials {
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  userAgent: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface PinterestCredentials {
  accessToken: string;
  userId: string;
  appId?: string;
  appSecret?: string;
  boardId?: string;
}

export interface GoogleAnalyticsCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  viewId: string;
  propertyId: string;
  accessToken: string;
}

export interface OpenAICredentials {
  apiKey: string;
  organizationId?: string;
}

export interface ClaudeCredentials {
  apiKey: string;
  organizationId?: string;
}

// Integration creation and update types
export interface CreateIntegrationData {
  name: string;
  type: IntegrationType;
  platform: string;
  credentials: unknown; // Will be encrypted
  configuration?: Partial<IntegrationConfig>;
  syncFrequency?: SyncFrequency;
}

export interface UpdateIntegrationData {
  name?: string;
  configuration?: Partial<IntegrationConfig>;
  syncFrequency?: SyncFrequency;
  isActive?: boolean;
}

// Webhook event types
export interface WebhookEventData {
  event: WebhookEvent;
  integrationId: string;
  data: { [key: string]: unknown };
  timestamp: Date;
  signature?: string;
}

// Integration status types
export interface IntegrationStatusUpdate {
  integrationId: string;
  status: IntegrationStatus;
  message?: string;
  error?: string;
  timestamp: Date;
}

// Loading states for integrations
export interface IntegrationLoadingState {
  integrations?: boolean;
  connectionTest?: boolean;
  sync?: boolean;
  healthCheck?: boolean;
  webhooks?: boolean;
}

// Additional types for integration services
export interface PostResult {
  success: boolean;
  postId?: string;
  url?: string;
  error?: string;
  timestamp: Date;
  platform: string;
  adaptations?: string[];
  warnings?: string[];
}

export interface IntegrationWebhook {
  id: string;
  integrationId: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  isActive: boolean;
  retryPolicy: RetryPolicy;
  headers?: { [key: string]: string };
  timeout?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: unknown;
  status: 'pending' | 'delivering' | 'delivered' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextRetryAt: Date;
  deliveredAt?: Date;
  responseStatus?: number;
  responseHeaders?: { [key: string]: string };
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Social Platform Service Types
export interface SocialPlatformConfig {
  platform: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  isConnected: boolean;
  lastSync?: Date;
}

export interface PostEngagementData {
  platform: string;
  postId: string;
  likes: number;
  shares: number;
  comments: number;
  clicks: number;
  impressions: number;
  reach: number;
  engagementRate: number;
  timestamp: Date;
}

export interface HashtagPerformance {
  hashtag: string;
  platform: string;
  usageCount: number;
  avgEngagement: number;
  trendingScore: number;
  lastUpdated: Date;
}

export interface TrendingTopic {
  topic: string;
  platform: string;
  volume: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  relatedHashtags: string[];
  category: string;
  trendingScore: number;
  expiresAt: Date;
}

export interface PlatformOptimization {
  platform: string;
  bestPostingTimes: string[];
  optimalContentLength: {
    min: number;
    max: number;
  };
  topPerformingContentTypes: string[];
  recommendedHashtagCount: number;
  audienceInsights: {
    demographics: any;
    interests: string[];
    activeHours: string[];
  };
}
