import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Lightbulb,
  Target,
  BarChart3,
  Palette,
  Calendar,
  Users,
} from 'lucide-react';
import { HoloCard, HoloButton, HoloText, SparkleEffect, FloatingSkull } from './HolographicTheme';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userProgress?: {
    hasCreatedBrandVoice: boolean;
    hasCreatedAudienceProfile: boolean;
    hasCreatedCampaign: boolean;
    hasViewedAnalytics: boolean;
    hasUsedTemplate: boolean;
  };
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onClose,
  onComplete,
  userProgress = {
    hasCreatedBrandVoice: false,
    hasCreatedAudienceProfile: false,
    hasCreatedCampaign: false,
    hasViewedAnalytics: false,
    hasUsedTemplate: false,
  },
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Enhanced Content Features!',
      description: 'Discover powerful new tools to supercharge your content creation workflow.',
      icon: <Lightbulb className="w-8 h-8 text-yellow-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            We've added exciting new features to help you create more engaging, personalized
            content:
          </p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Brand voice and audience targeting
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Campaign and content series management
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Advanced analytics and insights
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Smart scheduling optimization
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Template library and customization
            </li>
          </ul>
        </div>
      ),
    },
    {
      id: 'brand-voice',
      title: 'Create Your Brand Voice',
      description: 'Define your unique tone and style for consistent content across all platforms.',
      icon: <Target className="w-8 h-8 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Brand voices help you maintain consistency in your content's tone, style, and messaging.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">What you can define:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Tone (professional, casual, humorous, etc.)</li>
              <li>• Writing style and vocabulary</li>
              <li>• Target audience characteristics</li>
              <li>• Sample content for AI reference</li>
            </ul>
          </div>
          {userProgress.hasCreatedBrandVoice && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              You've already created a brand voice!
            </div>
          )}
        </div>
      ),
      action: userProgress.hasCreatedBrandVoice
        ? undefined
        : {
            label: 'Create Brand Voice',
            onClick: () => {
              // This would trigger opening the brand voice manager
              console.log('Open brand voice manager');
            },
          },
    },
    {
      id: 'audience-profiles',
      title: 'Define Your Audience',
      description: 'Create detailed audience profiles to generate more targeted content.',
      icon: <Users className="w-8 h-8 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Audience profiles help the AI understand who you're writing for, resulting in more
            relevant content.
          </p>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-2">Profile includes:</h4>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Demographics (age range, industry)</li>
              <li>• Interests and pain points</li>
              <li>• Preferred content types</li>
              <li>• Engagement patterns</li>
            </ul>
          </div>
          {userProgress.hasCreatedAudienceProfile && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              You've already created an audience profile!
            </div>
          )}
        </div>
      ),
      action: userProgress.hasCreatedAudienceProfile
        ? undefined
        : {
            label: 'Create Audience Profile',
            onClick: () => {
              console.log('Open audience profile manager');
            },
          },
    },
    {
      id: 'campaigns',
      title: 'Organize with Campaigns',
      description: 'Group related content into campaigns and series for better coordination.',
      icon: <Calendar className="w-8 h-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Campaigns help you coordinate content across multiple platforms and track performance as
            a cohesive unit.
          </p>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Campaign features:</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Multi-platform coordination</li>
              <li>• Content series management</li>
              <li>• Performance tracking</li>
              <li>• Automated scheduling</li>
            </ul>
          </div>
          {userProgress.hasCreatedCampaign && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              You've already created a campaign!
            </div>
          )}
        </div>
      ),
      action: userProgress.hasCreatedCampaign
        ? undefined
        : {
            label: 'Create Campaign',
            onClick: () => {
              console.log('Open campaign manager');
            },
          },
    },
    {
      id: 'analytics',
      title: 'Track Your Performance',
      description: 'Monitor engagement and get insights to optimize your content strategy.',
      icon: <BarChart3 className="w-8 h-8 text-red-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            The analytics dashboard provides detailed insights into your content performance and
            optimization suggestions.
          </p>
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Analytics include:</h4>
            <ul className="text-sm text-red-800 space-y-1">
              <li>• Engagement metrics across platforms</li>
              <li>• Performance trends and comparisons</li>
              <li>• Content optimization suggestions</li>
              <li>• Optimal posting time recommendations</li>
            </ul>
          </div>
          {userProgress.hasViewedAnalytics && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              You've already viewed the analytics dashboard!
            </div>
          )}
        </div>
      ),
      action: userProgress.hasViewedAnalytics
        ? undefined
        : {
            label: 'View Analytics',
            onClick: () => {
              console.log('Open analytics dashboard');
            },
          },
    },
    {
      id: 'templates',
      title: 'Use Content Templates',
      description:
        'Speed up content creation with customizable templates for different content types.',
      icon: <Palette className="w-8 h-8 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            Templates provide structured starting points for your content, ensuring consistency and
            saving time.
          </p>
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h4 className="font-medium text-indigo-900 mb-2">Template features:</h4>
            <ul className="text-sm text-indigo-800 space-y-1">
              <li>• Pre-built templates for different industries</li>
              <li>• Customizable structure and fields</li>
              <li>• AI-powered content generation</li>
              <li>• Save and share custom templates</li>
            </ul>
          </div>
          {userProgress.hasUsedTemplate && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <Check className="w-4 h-4" />
              You've already used a template!
            </div>
          )}
        </div>
      ),
      action: userProgress.hasUsedTemplate
        ? undefined
        : {
            label: 'Browse Templates',
            onClick: () => {
              console.log('Open template library');
            },
          },
    },
    {
      id: 'complete',
      title: "You're All Set!",
      description: 'Start creating amazing content with your new enhanced features.',
      icon: <Check className="w-8 h-8 text-green-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-gray-600">
            You now have access to all the enhanced features. Here are some quick tips to get
            started:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">1</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Start with a brand voice</h4>
                <p className="text-sm text-gray-600">
                  This will improve all your AI-generated content
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">2</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Create your first campaign</h4>
                <p className="text-sm text-gray-600">Organize related content for better results</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-blue-600">3</span>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Monitor your analytics</h4>
                <p className="text-sm text-gray-600">
                  Track performance and optimize your strategy
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    // Mark steps as completed based on user progress
    const completed = new Set<string>();
    if (userProgress.hasCreatedBrandVoice) completed.add('brand-voice');
    if (userProgress.hasCreatedAudienceProfile) completed.add('audience-profiles');
    if (userProgress.hasCreatedCampaign) completed.add('campaigns');
    if (userProgress.hasViewedAnalytics) completed.add('analytics');
    if (userProgress.hasUsedTemplate) completed.add('templates');
    setCompletedSteps(completed);
  }, [userProgress]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50 p-4">
      <HoloCard className="max-w-4xl w-full max-h-[90vh] overflow-hidden relative">
        <SparkleEffect count={15} size="medium" />
        <FloatingSkull className="absolute top-4 right-16" size="small" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="text-2xl">{currentStepData.icon}</div>
              <HoloText variant="title" glow>
                {currentStepData.title}
              </HoloText>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress indicator */}
        <div className="px-6 py-4 bg-glass-pink border-b border-white/20">
          <div className="flex items-center justify-between mb-2">
            <HoloText className="text-sm font-medium">
              ✨ Step {currentStep + 1} of {steps.length}
            </HoloText>
            <HoloText className="text-sm">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% complete 🌟
            </HoloText>
          </div>
          <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden">
            <div
              className="rainbow-progress h-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 sparkles ${
                  index === currentStep
                    ? 'bg-glass-pink text-pink-300 neon-glow'
                    : index < currentStep || completedSteps.has(step.id)
                      ? 'text-green-400 hover:bg-glass-cyan'
                      : 'text-white/60 hover:bg-white/10'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                    index === currentStep
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                      : index < currentStep || completedSteps.has(step.id)
                        ? 'bg-gradient-to-r from-green-400 to-cyan-400 text-white shadow-lg'
                        : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {index < currentStep || completedSteps.has(step.id) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <HoloText className="text-xs font-medium hidden sm:block">
                  {step.title.split(' ')[0]}
                </HoloText>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          <HoloText className="mb-6 text-white/80">{currentStepData.description}</HoloText>
          <div className="text-white/90">{currentStepData.content}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/20 bg-glass-purple">
          <HoloButton
            onClick={handlePrevious}
            variant="secondary"
            disabled={currentStep === 0}
            className="flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </HoloButton>

          <div className="flex items-center gap-3">
            {currentStepData.action && (
              <HoloButton
                onClick={currentStepData.action.onClick}
                variant="skull"
                className="sparkles"
              >
                {currentStepData.action.label} ✨
              </HoloButton>
            )}

            <HoloButton onClick={handleNext} className="flex items-center gap-2 sparkles neon-glow">
              {isLastStep ? '🚀 Get Started!' : 'Next ✨'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </HoloButton>
          </div>
        </div>
      </HoloCard>
    </div>
  );
};

/**
 * Hook to manage onboarding state
 */
export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const completed = localStorage.getItem('enhanced-features-onboarding-completed');
    if (completed === 'true') {
      setHasCompletedOnboarding(true);
    } else {
      // Show onboarding for new users
      setShowOnboarding(true);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('enhanced-features-onboarding-completed', 'true');
    setHasCompletedOnboarding(true);
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('enhanced-features-onboarding-completed');
    setHasCompletedOnboarding(false);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    hasCompletedOnboarding,
    completeOnboarding,
    resetOnboarding,
    setShowOnboarding,
  };
};

export default OnboardingFlow;
