import React, { useState, useEffect, useCallback, useRef } from 'react';
// Temporarily replaced lucide-react icons with simple SVGs
const Mic = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
    />
  </svg>
);

const MicOff = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
    />
  </svg>
);

const Volume2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 9a3 3 0 000 6"
    />
  </svg>
);

const VolumeX = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 9a3 3 0 000 6"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
    />
  </svg>
);

const Zap = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

const Sparkles = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
    />
  </svg>
);
import { HoloButton, HoloText, SparkleEffect, FloatingSkull } from './HolographicTheme';

interface VoiceCommand {
  command: string;
  action: () => void;
  description: string;
  category: 'content' | 'navigation' | 'settings' | 'ai';
}

interface VoiceCommandsProps {
  onCreatePost?: (topic: string) => void;
  onGenerateIdeas?: (topic: string) => void;
  onOpenSettings?: () => void;
  onNavigate?: (page: string) => void;
  onToggleTheme?: () => void;
}

export const VoiceCommands: React.FC<VoiceCommandsProps> = ({
  onCreatePost,
  onGenerateIdeas,
  onOpenSettings,
  onNavigate,
  onToggleTheme,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [showCommands, setShowCommands] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // Voice commands configuration
  const commands: VoiceCommand[] = [
    // Content Creation
    {
      command: 'create post about *',
      action: () => {
        const topic = extractTopicFromTranscript(transcript, 'create post about');
        if (topic && onCreatePost) {
          onCreatePost(topic);
          speak(`Creating a post about ${topic}! ✨`);
        }
      },
      description: 'Create a new post about a specific topic',
      category: 'content',
    },
    {
      command: 'generate ideas for *',
      action: () => {
        const topic = extractTopicFromTranscript(transcript, 'generate ideas for');
        if (topic && onGenerateIdeas) {
          onGenerateIdeas(topic);
          speak(`Generating amazing ideas for ${topic}! 🚀`);
        }
      },
      description: 'Generate content ideas for a topic',
      category: 'content',
    },
    {
      command: 'new blog post',
      action: () => {
        onCreatePost?.('');
        speak('Starting a new blog post! What would you like to write about?');
      },
      description: 'Start creating a new blog post',
      category: 'content',
    },

    // Navigation
    {
      command: 'open analytics',
      action: () => {
        onNavigate?.('analytics');
        speak('Opening your analytics dashboard! 📊');
      },
      description: 'Navigate to analytics dashboard',
      category: 'navigation',
    },
    {
      command: 'show calendar',
      action: () => {
        onNavigate?.('calendar');
        speak('Opening your content calendar! 📅');
      },
      description: 'Navigate to content calendar',
      category: 'navigation',
    },
    {
      command: 'open settings',
      action: () => {
        onOpenSettings?.();
        speak('Opening settings! ⚙️');
      },
      description: 'Open settings panel',
      category: 'navigation',
    },

    // Theme & Settings
    {
      command: 'toggle theme',
      action: () => {
        onToggleTheme?.();
        speak('Switching themes! ✨');
      },
      description: 'Switch between light/dark/holographic themes',
      category: 'settings',
    },
    {
      command: 'more sparkles',
      action: () => {
        // This would increase sparkle intensity
        speak('Adding more sparkles! So magical! ✨✨✨');
      },
      description: 'Increase sparkle effects',
      category: 'settings',
    },

    // AI Interactions
    {
      command: 'hey solo success',
      action: () => {
        speak(
          "Hey there! I'm here to help you create amazing content! What can I do for you? 💀✨"
        );
      },
      description: 'Activate AI assistant',
      category: 'ai',
    },
    {
      command: 'what can you do',
      action: () => {
        speak(
          'I can help you create posts, generate ideas, navigate the app, and so much more! Just ask me anything! 🌟'
        );
      },
      description: 'List available capabilities',
      category: 'ai',
    },
  ];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setIsSupported(true);
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;

            if (event.results[i].isFinal) {
              finalTranscript += transcript;
              setConfidence(confidence);
            } else {
              interimTranscript += transcript;
            }
          }

          const fullTranscript = finalTranscript || interimTranscript;
          setTranscript(fullTranscript);

          if (finalTranscript) {
            processCommand(finalTranscript.toLowerCase().trim());
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || !synthRef.current) return;

      // Cancel any ongoing speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.2;
      utterance.volume = 0.8;

      // Try to use a female voice if available
      const voices = synthRef.current.getVoices();
      const femaleVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes('female') ||
          voice.name.toLowerCase().includes('zira') ||
          voice.name.toLowerCase().includes('samantha')
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      synthRef.current.speak(utterance);
    },
    [voiceEnabled]
  );

  const processCommand = useCallback(
    (transcript: string) => {
      setLastCommand(transcript);

      // Find matching command
      const matchedCommand = commands.find((cmd) => {
        if (cmd.command.includes('*')) {
          const pattern = cmd.command
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // Escape all regex special chars
            .replace(/\\\*/g, '(.+)');               // Then replace escaped \* with (.+)
          const regex = new RegExp(pattern, 'i');
          return regex.test(transcript);
        } else {
          return transcript.includes(cmd.command.toLowerCase());
        }
      });

      if (matchedCommand) {
        matchedCommand.action();
      } else {
        // Fallback responses for unrecognized commands
        const responses = [
          "I didn't quite catch that! Try saying 'what can you do' to see available commands! 💫",
          "Hmm, I'm not sure about that one! Say 'hey solo success' to get started! ✨",
          "That's a new one! Check out the available commands by clicking the sparkly button! 🌟",
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        speak(randomResponse);
      }
    },
    [commands]
  );

  const toggleListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
      speak("I'm listening! What can I help you with? ✨");
    }
  }, [isListening, isSupported, speak]);

  const extractTopicFromTranscript = (transcript: string, command: string): string => {
    const index = transcript.toLowerCase().indexOf(command.toLowerCase());
    if (index !== -1) {
      return transcript.substring(index + command.length).trim();
    }
    return '';
  };

  if (!isSupported) {
    return null; // Don't render if speech recognition isn't supported
  }

  return (
    <div className="fixed bottom-20 left-6 z-40">
      {/* Voice Command Button */}
      <div className="relative">
        <HoloButton
          onClick={toggleListening}
          variant={isListening ? 'primary' : 'secondary'}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
            isListening ? 'animate-pulse neon-glow' : ''
          }`}
        >
          {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          {isListening && <SparkleEffect count={6} size="small" />}
        </HoloButton>

        {/* Listening Indicator */}
        {isListening && (
          <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 glass-card px-3 py-2 whitespace-nowrap">
            <HoloText className="text-sm">
              🎤 Listening... {transcript && `"${transcript}"`}
            </HoloText>
          </div>
        )}
      </div>

      {/* Commands Panel Toggle */}
      <div className="mt-3">
        <button
          onClick={() => setShowCommands(!showCommands)}
          className="w-14 h-14 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <Sparkles className="w-5 h-5 text-purple-400" />
        </button>
      </div>

      {/* Voice Toggle */}
      <div className="mt-3">
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          className="w-14 h-14 glass-card rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          {voiceEnabled ? (
            <Volume2 className="w-5 h-5 text-green-400" />
          ) : (
            <VolumeX className="w-5 h-5 text-red-400" />
          )}
        </button>
      </div>

      {/* Commands Help Panel */}
      {showCommands && (
        <div className="absolute bottom-full left-0 mb-4 w-80 glass-card p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <HoloText variant="subtitle" glow>
              Voice Commands ✨
            </HoloText>
            <FloatingSkull size="small" />
          </div>

          <div className="space-y-4">
            {['content', 'navigation', 'settings', 'ai'].map((category) => (
              <div key={category}>
                <HoloText className="text-sm font-medium mb-2 capitalize">
                  {category} Commands 🌟
                </HoloText>
                <div className="space-y-2">
                  {commands
                    .filter((cmd) => cmd.category === category)
                    .map((cmd, index) => (
                      <div key={index} className="bg-white/5 p-2 rounded-lg">
                        <div className="text-sm font-medium text-pink-300">"{cmd.command}"</div>
                        <div className="text-xs text-white/70">{cmd.description}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {lastCommand && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <HoloText className="text-xs">Last command: "{lastCommand}"</HoloText>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default VoiceCommands;
