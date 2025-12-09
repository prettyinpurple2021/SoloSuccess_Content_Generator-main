/**
 * ContentPreview - Platform-specific content preview and validation
 *
 * Features:
 * - Real-time character counting
 * - Platform-specific validation
 * - Content adaptation preview
 * - Multi-platform posting preview
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { contentAdaptationService } from '../../services/contentAdaptationService';
import { socialMediaIntegrations } from '../../services/integrations/socialMediaIntegrations';

interface ContentPreviewProps {
  content: string;
  selectedPlatforms: string[];
  onContentChange?: (platform: string, adaptedContent: string) => void;
  onValidationChange?: (platform: string, isValid: boolean, issues: string[]) => void;
}

export const ContentPreview: React.FC<ContentPreviewProps> = ({
  content,
  selectedPlatforms,
  onContentChange,
  onValidationChange,
}) => {
  const [adaptedContents, setAdaptedContents] = useState<Record<string, any>>({});
  const [validations, setValidations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(selectedPlatforms[0] || '');

  // Adapt content for all selected platforms
  useEffect(() => {
    if (content.trim() && selectedPlatforms.length > 0) {
      setLoading(true);

      contentAdaptationService
        .adaptContentForMultiplePlatforms(content, selectedPlatforms, {
          includeCallToAction: true,
          tone: 'professional',
        })
        .then((adapted) => {
          setAdaptedContents(adapted);

          // Validate content for each platform
          const validationPromises = selectedPlatforms.map(async (platform) => {
            const validation = await socialMediaIntegrations.validateContentForPlatform(
              content,
              platform
            );
            return { platform, validation };
          });

          Promise.all(validationPromises).then((validationResults) => {
            const validationMap: Record<string, any> = {};
            validationResults.forEach(({ platform, validation }) => {
              validationMap[platform] = validation;
            });
            setValidations(validationMap);

            // Notify parent components
            selectedPlatforms.forEach((platform) => {
              const adaptedContent = adapted[platform];
              const validation = validationMap[platform];

              onContentChange?.(platform, adaptedContent.content);
              onValidationChange?.(platform, validation.isValid, validation.issues);
            });
          });

          setLoading(false);
        });
    }
  }, [content, selectedPlatforms, onContentChange, onValidationChange]);

  const getPlatformIcon = (platform: string): string => {
    const icons: Record<string, string> = {
      twitter: '🐦',
      linkedin: '💼',
      facebook: '📘',
      instagram: '📷',
      bluesky: '☁️',
      reddit: '🤖',
      pinterest: '📌',
      youtube: '📺',
    };
    return icons[platform] || '📱';
  };

  const getPlatformColor = (platform: string): string => {
    const colors: Record<string, string> = {
      twitter: 'from-blue-400 to-blue-600',
      linkedin: 'from-blue-500 to-blue-700',
      facebook: 'from-blue-600 to-blue-800',
      instagram: 'from-pink-400 to-pink-600',
      bluesky: 'from-sky-400 to-sky-600',
      reddit: 'from-orange-500 to-orange-700',
      pinterest: 'from-red-500 to-red-700',
      youtube: 'from-red-500 to-red-700',
    };
    return colors[platform] || 'from-gray-400 to-gray-600';
  };

  const getStatusColor = (isValid: boolean): string => {
    return isValid ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isValid: boolean): string => {
    return isValid ? '✅' : '❌';
  };

  if (selectedPlatforms.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-gray-500 text-lg mb-2">📝</div>
        <p className="text-gray-600">Select platforms to preview your content</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Content Preview</h3>
        <p className="text-sm text-gray-600 mt-1">
          Preview how your content will look on each platform
        </p>
      </div>

      {/* Platform Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {selectedPlatforms.map((platform) => (
            <button
              key={platform}
              onClick={() => setActiveTab(platform)}
              className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === platform
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{getPlatformIcon(platform)}</span>
              <span className="capitalize">{platform}</span>
              {validations[platform] && (
                <span className={`ml-2 ${getStatusColor(validations[platform].isValid)}`}>
                  {getStatusIcon(validations[platform].isValid)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Preview */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Adapting content...</span>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {selectedPlatforms.map(
              (platform) =>
                activeTab === platform && (
                  <motion.div
                    key={platform}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="space-y-4">
                      {/* Platform Info */}
                      <div
                        className={`bg-gradient-to-r ${getPlatformColor(platform)} rounded-lg p-4 text-white`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <span className="text-2xl mr-3">{getPlatformIcon(platform)}</span>
                            <div>
                              <h4 className="font-semibold capitalize">{platform}</h4>
                              <p className="text-sm opacity-90">
                                {contentAdaptationService.getPlatformLimits(platform)
                                  ?.maxCharacters || 0}{' '}
                                character limit
                              </p>
                            </div>
                          </div>
                          {validations[platform] && (
                            <div className="text-right">
                              <div
                                className={`text-lg ${getStatusColor(validations[platform].isValid)}`}
                              >
                                {getStatusIcon(validations[platform].isValid)}
                              </div>
                              <div className="text-sm opacity-90">
                                {validations[platform].characterCount}/
                                {contentAdaptationService.getPlatformLimits(platform)
                                  ?.maxCharacters || 0}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Adapted Content */}
                      {adaptedContents[platform] && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-gray-900">Adapted Content</h5>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>Characters: {adaptedContents[platform].characterCount}</span>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  adaptedContents[platform].characterCount <=
                                  (contentAdaptationService.getPlatformLimits(platform)
                                    ?.maxCharacters || 0)
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {adaptedContents[platform].characterCount <=
                                (contentAdaptationService.getPlatformLimits(platform)
                                  ?.maxCharacters || 0)
                                  ? 'Within Limit'
                                  : 'Over Limit'}
                              </span>
                            </div>
                          </div>

                          <div className="bg-white rounded border p-3 min-h-[100px] whitespace-pre-wrap text-gray-900">
                            {adaptedContents[platform].content}
                          </div>

                          {/* Adaptations Applied */}
                          {adaptedContents[platform].adaptations.length > 0 && (
                            <div className="mt-3">
                              <h6 className="text-sm font-medium text-gray-700 mb-2">
                                Adaptations Applied:
                              </h6>
                              <div className="flex flex-wrap gap-2">
                                {adaptedContents[platform].adaptations.map(
                                  (adaptation: string, index: number) => (
                                    <span
                                      key={index}
                                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                                    >
                                      ✓ {adaptation}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {/* Warnings */}
                          {adaptedContents[platform].warnings.length > 0 && (
                            <div className="mt-3">
                              <h6 className="text-sm font-medium text-gray-700 mb-2">Warnings:</h6>
                              <div className="space-y-1">
                                {adaptedContents[platform].warnings.map(
                                  (warning: string, index: number) => (
                                    <div
                                      key={index}
                                      className="flex items-center text-sm text-amber-700 bg-amber-50 rounded px-3 py-2"
                                    >
                                      <span className="mr-2">⚠️</span>
                                      {warning}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Validation Issues */}
                      {validations[platform] && !validations[platform].isValid && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <h6 className="font-medium text-red-800 mb-2">Issues Found:</h6>
                          <ul className="space-y-1">
                            {validations[platform].issues.map((issue: string, index: number) => (
                              <li key={index} className="text-sm text-red-700 flex items-start">
                                <span className="mr-2">•</span>
                                {issue}
                              </li>
                            ))}
                          </ul>

                          {validations[platform].suggestions.length > 0 && (
                            <div className="mt-3">
                              <h6 className="font-medium text-red-800 mb-2">Suggestions:</h6>
                              <ul className="space-y-1">
                                {validations[platform].suggestions.map(
                                  (suggestion: string, index: number) => (
                                    <li
                                      key={index}
                                      className="text-sm text-red-600 flex items-start"
                                    >
                                      <span className="mr-2">💡</span>
                                      {suggestion}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Platform Guidelines */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h6 className="font-medium text-blue-800 mb-2">Platform Guidelines:</h6>
                        <div className="text-sm text-blue-700 space-y-1">
                          {platform === 'twitter' && (
                            <>
                              <p>• Keep it concise and engaging (280 characters)</p>
                              <p>• Use 1-3 relevant hashtags</p>
                              <p>• Include a call-to-action when appropriate</p>
                            </>
                          )}
                          {platform === 'linkedin' && (
                            <>
                              <p>• Professional tone and industry insights (1300 characters)</p>
                              <p>• Use minimal hashtags (1-3)</p>
                              <p>• Focus on business value and networking</p>
                            </>
                          )}
                          {platform === 'facebook' && (
                            <>
                              <p>• Conversational and community-focused</p>
                              <p>• Use 1-3 hashtags sparingly</p>
                              <p>• Encourage engagement and discussion</p>
                            </>
                          )}
                          {platform === 'instagram' && (
                            <>
                              <p>• Visual-first content with compelling captions</p>
                              <p>• Use 10-20 relevant hashtags</p>
                              <p>• Include emojis and engaging storytelling</p>
                            </>
                          )}
                          {platform === 'bluesky' && (
                            <>
                              <p>• Decentralized social networking (300 characters)</p>
                              <p>• Tech-savvy and community-focused</p>
                              <p>• Use minimal hashtags</p>
                            </>
                          )}
                          {platform === 'reddit' && (
                            <>
                              <p>• Community-focused and discussion-oriented</p>
                              <p>• No hashtags, focus on subreddit rules</p>
                              <p>• Detailed explanations and engagement</p>
                            </>
                          )}
                          {platform === 'pinterest' && (
                            <>
                              <p>• SEO-optimized descriptions (500 characters)</p>
                              <p>• Use 10-20 relevant hashtags</p>
                              <p>• Keyword-rich and inspirational content</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ContentPreview;
