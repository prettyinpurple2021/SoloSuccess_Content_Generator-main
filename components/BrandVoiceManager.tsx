import React, { useState, useEffect } from 'react';
import { BrandVoice } from '../types';
import { apiService } from '../services/clientApiService';
import { analyzeBrandVoice } from '../services/geminiService';
import { X, Plus, Edit2, Trash2, Eye, Upload, Loader2, Save, AlertCircle } from 'lucide-react';

interface BrandVoiceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedBrandVoice?: BrandVoice | null;
  onBrandVoiceSelect: (brandVoice: BrandVoice | null) => void;
  brandVoices: BrandVoice[];
  onBrandVoicesUpdate: (brandVoices: BrandVoice[]) => void;
}

interface BrandVoiceForm {
  name: string;
  tone: string;
  writingStyle: string;
  targetAudience: string;
  vocabulary: string[];
  sampleContent: string[];
}

const TONE_OPTIONS = [
  'Professional',
  'Casual',
  'Humorous',
  'Inspirational',
  'Educational',
  'Authoritative',
  'Friendly',
  'Conversational',
  'Technical',
  'Creative',
];

const WRITING_STYLE_OPTIONS = [
  'Formal',
  'Informal',
  'Academic',
  'Journalistic',
  'Storytelling',
  'Direct',
  'Descriptive',
  'Persuasive',
  'Analytical',
  'Personal',
];

export default function BrandVoiceManager({
  isOpen,
  onClose,
  selectedBrandVoice,
  onBrandVoiceSelect,
  brandVoices,
  onBrandVoicesUpdate,
}: BrandVoiceManagerProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'edit' | 'preview'>('list');
  const [editingVoice, setEditingVoice] = useState<BrandVoice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  const [form, setForm] = useState<BrandVoiceForm>({
    name: '',
    tone: '',
    writingStyle: '',
    targetAudience: '',
    vocabulary: [],
    sampleContent: [],
  });

  const [newVocabularyTerm, setNewVocabularyTerm] = useState('');
  const [newSampleContent, setNewSampleContent] = useState('');

  useEffect(() => {
    if (activeTab === 'edit' && editingVoice) {
      setForm({
        name: editingVoice.name,
        tone: editingVoice.tone,
        writingStyle: editingVoice.writingStyle,
        targetAudience: editingVoice.targetAudience,
        vocabulary: [...editingVoice.vocabulary],
        sampleContent: [...editingVoice.sampleContent],
      });
    } else if (activeTab === 'create') {
      setForm({
        name: '',
        tone: '',
        writingStyle: '',
        targetAudience: '',
        vocabulary: [],
        sampleContent: [],
      });
    }
  }, [activeTab, editingVoice]);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleCreateNew = () => {
    clearMessages();
    setEditingVoice(null);
    setActiveTab('create');
  };

  const handleEdit = (voice: BrandVoice) => {
    clearMessages();
    setEditingVoice(voice);
    setActiveTab('edit');
  };

  const handlePreview = (voice: BrandVoice) => {
    clearMessages();
    setEditingVoice(voice);
    setActiveTab('preview');
  };

  const handleDelete = async (voice: BrandVoice) => {
    if (!confirm(`Are you sure you want to delete "${voice.name}"?`)) return;

    setIsLoading(true);
    setError(null);

    try {
      await db.deleteBrandVoice(voice.id);
      const updatedVoices = brandVoices.filter((v) => v.id !== voice.id);
      onBrandVoicesUpdate(updatedVoices);

      // If this was the selected voice, clear selection
      if (selectedBrandVoice?.id === voice.id) {
        onBrandVoiceSelect(null);
      }

      setSuccess('Brand voice deleted successfully');
      setActiveTab('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete brand voice');
    } finally {
      setIsLoading(false);
    }
  };

  const addVocabularyTerm = () => {
    if (newVocabularyTerm.trim() && !form.vocabulary.includes(newVocabularyTerm.trim())) {
      setForm((prev) => ({
        ...prev,
        vocabulary: [...prev.vocabulary, newVocabularyTerm.trim()],
      }));
      setNewVocabularyTerm('');
    }
  };

  const removeVocabularyTerm = (term: string) => {
    setForm((prev) => ({
      ...prev,
      vocabulary: prev.vocabulary.filter((t) => t !== term),
    }));
  };

  const addSampleContent = () => {
    if (newSampleContent.trim() && !form.sampleContent.includes(newSampleContent.trim())) {
      setForm((prev) => ({
        ...prev,
        sampleContent: [...prev.sampleContent, newSampleContent.trim()],
      }));
      setNewSampleContent('');
    }
  };

  const removeSampleContent = (content: string) => {
    setForm((prev) => ({
      ...prev,
      sampleContent: prev.sampleContent.filter((c) => c !== content),
    }));
  };

  const analyzeSampleContent = async () => {
    if (form.sampleContent.length === 0) {
      setError('Please add some sample content to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysis = await analyzeBrandVoice(form.sampleContent.join('\n\n'));
      setAnalysisResults(analysis);

      // Auto-populate form with analysis results
      if (analysis.tone && !form.tone) {
        setForm((prev) => ({ ...prev, tone: analysis.tone }));
      }
      if (analysis.writingStyle && !form.writingStyle) {
        setForm((prev) => ({ ...prev, writingStyle: analysis.writingStyle }));
      }
      if (analysis.vocabulary && analysis.vocabulary.length > 0) {
        const newVocab = analysis.vocabulary.filter(
          (term: string) => !form.vocabulary.includes(term)
        );
        setForm((prev) => ({ ...prev, vocabulary: [...prev.vocabulary, ...newVocab] }));
      }

      setSuccess('Sample content analyzed successfully! Form updated with insights.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sample content');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Please enter a name for the brand voice');
      return;
    }

    if (!form.tone) {
      setError('Please select a tone');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const voiceData = {
        name: form.name.trim(),
        tone: form.tone,
        writing_style: form.writingStyle,
        target_audience: form.targetAudience,
        vocabulary: form.vocabulary,
        sample_content: form.sampleContent,
      };

      let savedVoice: BrandVoice;

      if (activeTab === 'edit' && editingVoice) {
        savedVoice = await db.updateBrandVoice(editingVoice.id, voiceData);
        const updatedVoices = brandVoices.map((v) => (v.id === editingVoice.id ? savedVoice : v));
        onBrandVoicesUpdate(updatedVoices);
        setSuccess('Brand voice updated successfully');
      } else {
        savedVoice = await db.addBrandVoice(voiceData);
        onBrandVoicesUpdate([savedVoice, ...brandVoices]);
        setSuccess('Brand voice created successfully');
      }

      setActiveTab('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand voice');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (voice: BrandVoice) => {
    onBrandVoiceSelect(voice);
    setSuccess(`Selected "${voice.name}" as active brand voice`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Brand Voice Manager</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b px-6">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Brand Voices ({brandVoices.length})
          </button>
          {(activeTab === 'create' || activeTab === 'edit') && (
            <button
              onClick={() => setActiveTab(activeTab)}
              className="px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600"
            >
              {activeTab === 'create' ? 'Create New' : 'Edit Voice'}
            </button>
          )}
          {activeTab === 'preview' && (
            <button
              onClick={() => setActiveTab('preview')}
              className="px-4 py-2 text-sm font-medium border-b-2 border-blue-500 text-blue-600"
            >
              Preview Voice
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'list' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-600">
                  Manage your brand voices to maintain consistent tone and style across all content.
                </p>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create New Voice
                </button>
              </div>

              {brandVoices.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Brand Voices Yet</h3>
                  <p className="text-gray-500 mb-4">
                    Create your first brand voice to get started with personalized content.
                  </p>
                  <button
                    onClick={handleCreateNew}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Brand Voice
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {brandVoices.map((voice) => (
                    <div
                      key={voice.id}
                      className={`p-4 border rounded-lg transition-colors ${
                        selectedBrandVoice?.id === voice.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900">{voice.name}</h3>
                            {selectedBrandVoice?.id === voice.id && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span>Tone: {voice.tone}</span>
                            <span>Style: {voice.writingStyle}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{voice.targetAudience}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{voice.vocabulary.length} vocabulary terms</span>
                            <span>•</span>
                            <span>{voice.sampleContent.length} sample content pieces</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {selectedBrandVoice?.id !== voice.id && (
                            <button
                              onClick={() => handleSelect(voice)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              Select
                            </button>
                          )}
                          <button
                            onClick={() => handlePreview(voice)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(voice)}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(voice)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete"
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'create' || activeTab === 'edit') && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {activeTab === 'create' ? 'Create New Brand Voice' : 'Edit Brand Voice'}
                </h3>
              </div>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Voice Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Professional Expert, Friendly Guide"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tone *</label>
                  <select
                    value={form.tone}
                    onChange={(e) => setForm((prev) => ({ ...prev, tone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a tone</option>
                    {TONE_OPTIONS.map((tone) => (
                      <option key={tone} value={tone}>
                        {tone}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Writing Style
                  </label>
                  <select
                    value={form.writingStyle}
                    onChange={(e) => setForm((prev) => ({ ...prev, writingStyle: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a writing style</option>
                    {WRITING_STYLE_OPTIONS.map((style) => (
                      <option key={style} value={style}>
                        {style}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={form.targetAudience}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, targetAudience: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Small business owners, Tech professionals"
                  />
                </div>
              </div>

              {/* Vocabulary Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Key Vocabulary Terms
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newVocabularyTerm}
                    onChange={(e) => setNewVocabularyTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addVocabularyTerm()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add vocabulary term"
                  />
                  <button
                    onClick={addVocabularyTerm}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.vocabulary.map((term, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {term}
                      <button
                        onClick={() => removeVocabularyTerm(term)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Content */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Sample Content</label>
                  {form.sampleContent.length > 0 && (
                    <button
                      onClick={analyzeSampleContent}
                      disabled={isAnalyzing}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Upload className="w-3 h-3" />
                      )}
                      Analyze Voice
                    </button>
                  )}
                </div>
                <div className="space-y-2 mb-2">
                  <textarea
                    value={newSampleContent}
                    onChange={(e) => setNewSampleContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add sample content that represents your brand voice..."
                  />
                  <button
                    onClick={addSampleContent}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Add Sample
                  </button>
                </div>
                <div className="space-y-2">
                  {form.sampleContent.map((content, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-md">
                      <div className="flex justify-between items-start">
                        <p className="text-sm text-gray-700 flex-1">{content}</p>
                        <button
                          onClick={() => removeSampleContent(content)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis Results */}
              {analysisResults && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <h4 className="font-medium text-purple-900 mb-2">Voice Analysis Results</h4>
                  <div className="text-sm text-purple-700 space-y-1">
                    {analysisResults.tone && (
                      <p>
                        <strong>Detected Tone:</strong> {analysisResults.tone}
                      </p>
                    )}
                    {analysisResults.writingStyle && (
                      <p>
                        <strong>Writing Style:</strong> {analysisResults.writingStyle}
                      </p>
                    )}
                    {analysisResults.vocabulary && analysisResults.vocabulary.length > 0 && (
                      <p>
                        <strong>Key Terms:</strong> {analysisResults.vocabulary.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {activeTab === 'create' ? 'Create Voice' : 'Update Voice'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preview' && editingVoice && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Preview: {editingVoice.name}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Voice Characteristics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tone:</span>
                        <span className="font-medium">{editingVoice.tone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Writing Style:</span>
                        <span className="font-medium">{editingVoice.writingStyle}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Target Audience:</span>
                        <span className="font-medium">{editingVoice.targetAudience}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Key Vocabulary</h4>
                    <div className="flex flex-wrap gap-1">
                      {editingVoice.vocabulary.map((term, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sample Content</h4>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {editingVoice.sampleContent.map((content, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">{content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Back to List
                </button>
                <button
                  onClick={() => handleEdit(editingVoice)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Voice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
