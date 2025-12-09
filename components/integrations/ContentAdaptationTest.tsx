/**
 * ContentAdaptationTest - Test component to verify content adaptation is working
 * Use this to test the system before full integration
 */

import React, { useState } from 'react';
import { contentAdaptationService } from '../../services/contentAdaptationService';

export const ContentAdaptationTest: React.FC = () => {
  const [testContent, setTestContent] = useState(
    "Just launched our amazing new product! It's going to revolutionize the industry. Check it out and let us know what you think! #innovation #technology #startup"
  );
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const platforms = [
    'twitter',
    'linkedin',
    'facebook',
    'instagram',
    'bluesky',
    'reddit',
    'pinterest',
  ];

  const testAdaptation = async () => {
    setLoading(true);
    try {
      const adaptations = await contentAdaptationService.adaptContentForMultiplePlatforms(
        testContent,
        platforms,
        { includeCallToAction: true, tone: 'professional' }
      );
      setResults(adaptations);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform: string): string => {
    const icons: Record<string, string> = {
      twitter: '🐦',
      linkedin: '💼',
      facebook: '📘',
      instagram: '📷',
      bluesky: '☁️',
      reddit: '🤖',
      pinterest: '📌',
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
    };
    return colors[platform] || 'from-gray-400 to-gray-600';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Content Adaptation Test</h2>
        <p className="text-gray-600 mb-6">
          Test the platform-specific content adaptation system with sample content.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Test Content</label>
            <textarea
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Enter test content here..."
            />
          </div>

          <button
            onClick={testAdaptation}
            disabled={loading}
            className={`px-6 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Testing...' : 'Test Content Adaptation'}
          </button>
        </div>
      </div>

      {Object.keys(results).length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Adaptation Results</h3>
          <div className="space-y-4">
            {Object.entries(results).map(([platform, result]) => {
              const platformLimits = contentAdaptationService.getPlatformLimits(platform);
              const isWithinLimit = result.characterCount <= (platformLimits?.maxCharacters || 0);

              return (
                <div
                  key={platform}
                  className={`bg-gradient-to-r ${getPlatformColor(platform)} rounded-lg p-4 text-white`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getPlatformIcon(platform)}</span>
                      <div>
                        <h4 className="font-semibold capitalize">{platform}</h4>
                        <p className="text-sm opacity-90">
                          {result.characterCount}/{platformLimits?.maxCharacters || 0} characters
                        </p>
                      </div>
                    </div>
                    <div className={`text-lg ${isWithinLimit ? 'text-green-200' : 'text-red-200'}`}>
                      {isWithinLimit ? '✅' : '❌'}
                    </div>
                  </div>

                  <div className="bg-white bg-opacity-20 rounded p-3 mb-3">
                    <p className="text-sm whitespace-pre-wrap">{result.content}</p>
                  </div>

                  {result.adaptations.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-1">Adaptations Applied:</p>
                      <div className="flex flex-wrap gap-1">
                        {result.adaptations.map((adaptation: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white bg-opacity-20"
                          >
                            ✓ {adaptation}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.warnings.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Warnings:</p>
                      <div className="space-y-1">
                        {result.warnings.map((warning: string, index: number) => (
                          <p key={index} className="text-sm opacity-90">
                            ⚠️ {warning}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Test Instructions</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Enter any content in the text area above</li>
          <li>• Click "Test Content Adaptation" to see how it adapts for each platform</li>
          <li>• Check character counts and adaptations applied</li>
          <li>• Verify that content fits within each platform's limits</li>
          <li>• If all platforms show ✅, the system is working correctly!</li>
        </ul>
      </div>
    </div>
  );
};

export default ContentAdaptationTest;
