import React, { useState, useEffect } from 'react';
import { Post } from '../types';
import * as geminiService from '../services/geminiService';
import { Spinner, CopyIcon } from '../constants';
import { marked } from 'marked';

interface RepurposingWorkflowProps {
  post: Post;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

interface RepurposingResult {
  format: string;
  content: string;
  parsedContent: string;
  optimizationScore?: number;
  suggestions?: Array<{
    type: string;
    title: string;
    description: string;
    priority: string;
  }>;
}

const REPURPOSING_FORMATS = [
  {
    id: 'Video Script',
    name: 'Video Script',
    icon: '🎬',
    description: 'Short-form video with timing cues',
  },
  {
    id: 'Email Newsletter',
    name: 'Email Newsletter',
    icon: '📧',
    description: 'Email-optimized with subject lines',
  },
  {
    id: 'LinkedIn Article',
    name: 'LinkedIn Article',
    icon: '💼',
    description: 'Professional LinkedIn post',
  },
  {
    id: 'Podcast Script',
    name: 'Podcast Script',
    icon: '🎙️',
    description: 'Conversational audio script',
  },
  {
    id: 'Twitter Thread',
    name: 'Twitter Thread',
    icon: '🐦',
    description: 'Multi-tweet thread format',
  },
  {
    id: 'Instagram Caption',
    name: 'Instagram Caption',
    icon: '📸',
    description: 'Visual-focused social post',
  },
];

const RepurposingWorkflow: React.FC<RepurposingWorkflowProps> = ({
  post,
  onClose,
  onSuccess,
  onError,
}) => {
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ [format: string]: RepurposingResult }>({});
  const [activeTab, setActiveTab] = useState<string>('selection');
  const [customization, setCustomization] = useState({
    targetAudience: '',
    brandTone: 'professional',
    brandStyle: 'informative',
    platform: '',
    duration: '',
  });
  const [showOptimization, setShowOptimization] = useState<{ [format: string]: boolean }>({});
  const [batchMode, setBatchMode] = useState(false);

  const handleFormatToggle = (formatId: string) => {
    setSelectedFormats((prev) =>
      prev.includes(formatId) ? prev.filter((f) => f !== formatId) : [...prev, formatId]
    );
  };

  const handleSingleRepurpose = async (format: string) => {
    setIsLoading(true);
    try {
      const options = {
        targetAudience: customization.targetAudience || undefined,
        brandVoice:
          customization.brandTone && customization.brandStyle
            ? {
                tone: customization.brandTone,
                writingStyle: customization.brandStyle,
              }
            : undefined,
        platform: customization.platform || undefined,
        duration: customization.duration || undefined,
      };

      const content = await geminiService.repurposeContent(post.content, format, options);
      const parsedContent = (await marked.parse(content)) as string;

      setResults((prev) => ({
        ...prev,
        [format]: {
          format,
          content,
          parsedContent,
        },
      }));

      setActiveTab('results');
    } catch (error: any) {
      onError(`Failed to repurpose content: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchRepurpose = async () => {
    if (selectedFormats.length === 0) {
      onError('Please select at least one format');
      return;
    }

    setIsLoading(true);
    setBatchMode(true);

    try {
      const options = {
        targetAudience: customization.targetAudience || undefined,
        brandVoice:
          customization.brandTone && customization.brandStyle
            ? {
                tone: customization.brandTone,
                writingStyle: customization.brandStyle,
              }
            : undefined,
      };

      const batchResults = await geminiService.batchRepurposeContent(
        post.content,
        selectedFormats,
        options
      );

      const processedResults: { [format: string]: RepurposingResult } = {};

      for (const [format, content] of Object.entries(batchResults)) {
        const parsedContent = (await marked.parse(content)) as string;
        processedResults[format] = {
          format,
          content,
          parsedContent,
        };
      }

      setResults(processedResults);
      setActiveTab('results');
      onSuccess(`Successfully repurposed content to ${selectedFormats.length} formats`);
    } catch (error: any) {
      onError(`Failed to batch repurpose content: ${error.message}`);
    } finally {
      setIsLoading(false);
      setBatchMode(false);
    }
  };

  const handleOptimizeContent = async (format: string) => {
    const result = results[format];
    if (!result) return;

    setIsLoading(true);
    try {
      const optimization = await geminiService.optimizeRepurposedContent(
        post.content,
        result.content,
        format,
        customization.platform || undefined
      );

      const optimizedParsedContent = optimization.optimizedVersion
        ? ((await marked.parse(optimization.optimizedVersion)) as string)
        : result.parsedContent;

      setResults((prev) => ({
        ...prev,
        [format]: {
          ...prev[format],
          optimizationScore: optimization.optimizationScore,
          suggestions: optimization.suggestions,
          content: optimization.optimizedVersion || prev[format].content,
          parsedContent: optimizedParsedContent,
        },
      }));

      setShowOptimization((prev) => ({ ...prev, [format]: true }));
      onSuccess('Content optimized successfully');
    } catch (error: any) {
      onError(`Failed to optimize content: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyContent = (content: string, format: string) => {
    navigator.clipboard.writeText(content);
    onSuccess(`${format} content copied to clipboard!`);
  };

  const renderFormatSelection = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-4">Select Formats to Repurpose</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {REPURPOSING_FORMATS.map((format) => (
            <div
              key={format.id}
              className={`p-4 rounded-xl border cursor-pointer transition-all duration-300 ${
                selectedFormats.includes(format.id)
                  ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400/50 shadow-lg'
                  : 'bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30'
              }`}
              onClick={() => handleFormatToggle(format.id)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{format.icon}</span>
                <div>
                  <h4 className="font-bold text-white">{format.name}</h4>
                  <p className="text-sm text-white/70">{format.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white/10 rounded-xl p-6 border border-white/20">
        <h4 className="text-lg font-bold text-white mb-4">Customization Options</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Target Audience</label>
            <input
              type="text"
              value={customization.targetAudience}
              onChange={(e) =>
                setCustomization((prev) => ({ ...prev, targetAudience: e.target.value }))
              }
              placeholder="e.g., Solo entrepreneurs, Marketing professionals"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Brand Tone</label>
            <select
              value={customization.brandTone}
              onChange={(e) => setCustomization((prev) => ({ ...prev, brandTone: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="humorous">Humorous</option>
              <option value="inspirational">Inspirational</option>
              <option value="educational">Educational</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">Writing Style</label>
            <select
              value={customization.brandStyle}
              onChange={(e) =>
                setCustomization((prev) => ({ ...prev, brandStyle: e.target.value }))
              }
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-400"
            >
              <option value="informative">Informative</option>
              <option value="conversational">Conversational</option>
              <option value="storytelling">Storytelling</option>
              <option value="analytical">Analytical</option>
              <option value="persuasive">Persuasive</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Platform (Optional)
            </label>
            <input
              type="text"
              value={customization.platform}
              onChange={(e) => setCustomization((prev) => ({ ...prev, platform: e.target.value }))}
              placeholder="e.g., TikTok, YouTube, Instagram"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={handleBatchRepurpose}
          disabled={selectedFormats.length === 0 || isLoading}
          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
        >
          {isLoading && batchMode ? (
            <div className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5" />
              Repurposing...
            </div>
          ) : (
            `Repurpose to ${selectedFormats.length} Format${selectedFormats.length !== 1 ? 's' : ''}`
          )}
        </button>
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">Repurposed Content</h3>
        <button
          onClick={() => setActiveTab('selection')}
          className="text-white/70 hover:text-white transition-colors"
        >
          ← Back to Selection
        </button>
      </div>

      {Object.entries(results).map(([format, result]) => (
        <div key={format} className="bg-white/10 rounded-xl border border-white/20 overflow-hidden">
          <div className="p-4 border-b border-white/20 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {REPURPOSING_FORMATS.find((f) => f.id === format)?.icon}
              </span>
              <h4 className="font-bold text-white">{format}</h4>
              {result.optimizationScore && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-bold ${
                    result.optimizationScore >= 80
                      ? 'bg-green-500/20 text-green-300'
                      : result.optimizationScore >= 60
                        ? 'bg-yellow-500/20 text-yellow-300'
                        : 'bg-red-500/20 text-red-300'
                  }`}
                >
                  Score: {result.optimizationScore}%
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleOptimizeContent(format)}
                disabled={isLoading}
                className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? <Spinner className="h-4 w-4" /> : '🔧 Optimize'}
              </button>
              <button
                onClick={() => handleCopyContent(result.content, format)}
                className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <CopyIcon className="h-4 w-4" />
                Copy
              </button>
            </div>
          </div>

          <div className="p-4">
            <div
              className="prose prose-invert max-w-none text-white/90"
              dangerouslySetInnerHTML={{ __html: result.parsedContent }}
            />
          </div>

          {showOptimization[format] && result.suggestions && result.suggestions.length > 0 && (
            <div className="p-4 border-t border-white/20 bg-white/5">
              <h5 className="font-bold text-white mb-3">Optimization Suggestions</h5>
              <div className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-white/10 rounded-lg">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        suggestion.priority === 'high'
                          ? 'bg-red-500/20 text-red-300'
                          : suggestion.priority === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-green-500/20 text-green-300'
                      }`}
                    >
                      {suggestion.priority}
                    </span>
                    <div>
                      <h6 className="font-medium text-white">{suggestion.title}</h6>
                      <p className="text-sm text-white/70">{suggestion.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl border border-white/20 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-white/20 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Content Repurposing Workflow</h2>
            <p className="text-white/70 mt-1">Transform your content for multiple platforms</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {activeTab === 'selection' ? renderFormatSelection() : renderResults()}
        </div>
      </div>
    </div>
  );
};

export default RepurposingWorkflow;
