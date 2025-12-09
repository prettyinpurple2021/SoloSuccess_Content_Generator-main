import React, { useState, useEffect } from 'react';
import { ContentTemplate, TemplateSection, TemplateField } from '../types';
import { apiService } from '../services/clientApiService';
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Eye, Settings } from '../constants';

interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  template?: ContentTemplate | null;
  onSave: (template: ContentTemplate) => void;
}

export default function TemplateEditor({ isOpen, onClose, template, onSave }: TemplateEditorProps) {
  const [templateData, setTemplateData] = useState<Partial<ContentTemplate>>({
    name: '',
    category: 'marketing',
    industry: 'general',
    contentType: 'blog',
    structure: [],
    customizableFields: [],
    usageCount: 0,
    rating: 0,
    isPublic: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'structure' | 'fields' | 'settings'>('structure');
  const [previewMode, setPreviewMode] = useState(false);

  // Initialize template data when template prop changes
  useEffect(() => {
    if (template) {
      setTemplateData(template);
    } else {
      // Reset for new template
      setTemplateData({
        name: '',
        category: 'marketing',
        industry: 'general',
        contentType: 'blog',
        structure: [],
        customizableFields: [],
        usageCount: 0,
        rating: 0,
        isPublic: false,
      });
    }
  }, [template]);

  const handleSave = async () => {
    if (!templateData.name?.trim()) {
      setError('Template name is required');
      return;
    }

    if (templateData.structure?.length === 0) {
      setError('Template must have at least one section');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const templateToSave = {
        name: templateData.name,
        category: templateData.category || 'marketing',
        industry: templateData.industry || 'general',
        content_type: templateData.contentType || 'blog',
        structure: templateData.structure || [],
        customizable_fields: templateData.customizableFields || [],
        usage_count: templateData.usageCount || 0,
        rating: templateData.rating || 0,
        is_public: templateData.isPublic || false,
      };

      let savedTemplate: ContentTemplate;
      if (template?.id) {
        // Update existing template
        savedTemplate = await db.updateContentTemplate(template.id, templateToSave);
      } else {
        // Create new template
        savedTemplate = await db.addContentTemplate(templateToSave);
      }

      onSave(savedTemplate);
      onClose();
    } catch (err) {
      setError('Failed to save template. Please try again.');
      console.error('Error saving template:', err);
    } finally {
      setLoading(false);
    }
  };

  const addSection = () => {
    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      type: 'paragraph',
      content: '',
      isCustomizable: true,
      placeholder: 'Enter content here...',
    };

    setTemplateData((prev) => ({
      ...prev,
      structure: [...(prev.structure || []), newSection],
    }));
  };

  const updateSection = (index: number, updates: Partial<TemplateSection>) => {
    setTemplateData((prev) => ({
      ...prev,
      structure:
        prev.structure?.map((section, i) => (i === index ? { ...section, ...updates } : section)) ||
        [],
    }));
  };

  const removeSection = (index: number) => {
    setTemplateData((prev) => ({
      ...prev,
      structure: prev.structure?.filter((_, i) => i !== index) || [],
    }));
  };

  const moveSectionUp = (index: number) => {
    if (index === 0) return;

    setTemplateData((prev) => {
      const newStructure = [...(prev.structure || [])];
      [newStructure[index - 1], newStructure[index]] = [
        newStructure[index],
        newStructure[index - 1],
      ];
      return { ...prev, structure: newStructure };
    });
  };

  const moveSectionDown = (index: number) => {
    if (index === (templateData.structure?.length || 0) - 1) return;

    setTemplateData((prev) => {
      const newStructure = [...(prev.structure || [])];
      [newStructure[index], newStructure[index + 1]] = [
        newStructure[index + 1],
        newStructure[index],
      ];
      return { ...prev, structure: newStructure };
    });
  };

  const addCustomField = () => {
    const newField: TemplateField = {
      id: `field_${Date.now()}`,
      name: `field_${(templateData.customizableFields?.length || 0) + 1}`,
      type: 'text',
      label: 'New Field',
      placeholder: '',
      required: false,
    };

    setTemplateData((prev) => ({
      ...prev,
      customizableFields: [...(prev.customizableFields || []), newField],
    }));
  };

  const updateCustomField = (index: number, updates: Partial<TemplateField>) => {
    setTemplateData((prev) => ({
      ...prev,
      customizableFields:
        prev.customizableFields?.map((field, i) =>
          i === index ? { ...field, ...updates } : field
        ) || [],
    }));
  };

  const removeCustomField = (index: number) => {
    setTemplateData((prev) => ({
      ...prev,
      customizableFields: prev.customizableFields?.filter((_, i) => i !== index) || [],
    }));
  };

  const renderStructureTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Template Structure</h3>
        <button
          onClick={addSection}
          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Section
        </button>
      </div>

      {templateData.structure?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No sections added yet. Click "Add Section" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templateData.structure?.map((section, index) => (
            <div key={section.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Section {index + 1}</span>
                  <select
                    value={section.type}
                    onChange={(e) => updateSection(index, { type: e.target.value as any })}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="heading">Heading</option>
                    <option value="paragraph">Paragraph</option>
                    <option value="list">List</option>
                    <option value="cta">Call to Action</option>
                    <option value="image">Image</option>
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveSectionUp(index)}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveSectionDown(index)}
                    disabled={index === (templateData.structure?.length || 0) - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeSection(index)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSection(index, { content: e.target.value })}
                    placeholder="Enter section content..."
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={section.isCustomizable}
                      onChange={(e) => updateSection(index, { isCustomizable: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Customizable</span>
                  </label>

                  {section.isCustomizable && (
                    <div className="flex-1">
                      <input
                        type="text"
                        value={section.placeholder || ''}
                        onChange={(e) => updateSection(index, { placeholder: e.target.value })}
                        placeholder="Placeholder text..."
                        className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderFieldsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Customizable Fields</h3>
        <button
          onClick={addCustomField}
          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>

      {templateData.customizableFields?.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No custom fields added yet. Click "Add Field" to create dynamic inputs.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templateData.customizableFields?.map((field, index) => (
            <div key={field.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">Field {index + 1}</span>
                <button
                  onClick={() => removeCustomField(index)}
                  className="p-1 text-red-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateCustomField(index, { name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateCustomField(index, { type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                    <option value="multiselect">Multi-select</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateCustomField(index, { label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Placeholder
                  </label>
                  <input
                    type="text"
                    value={field.placeholder || ''}
                    onChange={(e) => updateCustomField(index, { placeholder: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {(field.type === 'select' || field.type === 'multiselect') && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options (one per line)
                  </label>
                  <textarea
                    value={field.options?.join('\n') || ''}
                    onChange={(e) =>
                      updateCustomField(index, {
                        options: e.target.value.split('\n').filter((opt) => opt.trim()),
                      })
                    }
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              )}

              <div className="mt-3 flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateCustomField(index, { required: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Required</span>
                </label>

                <div className="flex-1">
                  <input
                    type="text"
                    value={field.defaultValue || ''}
                    onChange={(e) => updateCustomField(index, { defaultValue: e.target.value })}
                    placeholder="Default value..."
                    className="w-full px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Template Settings</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Template Name *</label>
          <input
            type="text"
            value={templateData.name || ''}
            onChange={(e) => setTemplateData((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="Enter template name..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
          <select
            value={templateData.category || 'marketing'}
            onChange={(e) => setTemplateData((prev) => ({ ...prev, category: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="marketing">Marketing</option>
            <option value="educational">Educational</option>
            <option value="promotional">Promotional</option>
            <option value="informational">Informational</option>
            <option value="entertainment">Entertainment</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
          <select
            value={templateData.contentType || 'blog'}
            onChange={(e) =>
              setTemplateData((prev) => ({ ...prev, contentType: e.target.value as any }))
            }
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="blog">Blog Post</option>
            <option value="social">Social Media</option>
            <option value="email">Email</option>
            <option value="video">Video Script</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
          <select
            value={templateData.industry || 'general'}
            onChange={(e) => setTemplateData((prev) => ({ ...prev, industry: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="general">General</option>
            <option value="technology">Technology</option>
            <option value="healthcare">Healthcare</option>
            <option value="finance">Finance</option>
            <option value="education">Education</option>
            <option value="retail">Retail</option>
            <option value="real-estate">Real Estate</option>
            <option value="food-beverage">Food & Beverage</option>
            <option value="travel">Travel</option>
            <option value="fitness">Fitness</option>
          </select>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={templateData.isPublic || false}
            onChange={(e) => setTemplateData((prev) => ({ ...prev, isPublic: e.target.checked }))}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Make this template public (other users can see and use it)
          </span>
        </label>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Template Preview</h3>

      <div className="border rounded-lg p-6 bg-gray-50">
        <div className="mb-4">
          <h4 className="text-xl font-bold text-gray-900">
            {templateData.name || 'Untitled Template'}
          </h4>
          <div className="flex items-center gap-2 mt-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
              {templateData.category}
            </span>
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
              {templateData.contentType}
            </span>
            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
              {templateData.industry}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {templateData.structure?.map((section, index) => (
            <div key={section.id} className="border-l-4 border-blue-500 pl-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                {section.type}
              </div>
              <div className="text-gray-800">
                {section.content || (
                  <span className="text-gray-400 italic">
                    {section.placeholder || `${section.type} content will appear here`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {templateData.customizableFields && templateData.customizableFields.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h5 className="font-semibold text-gray-900 mb-3">Customizable Fields</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templateData.customizableFields.map((field) => (
                <div key={field.id} className="border rounded p-3 bg-white">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      rows={2}
                      disabled
                    />
                  ) : field.type === 'select' ? (
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      disabled
                    >
                      <option>{field.placeholder || 'Select an option'}</option>
                      {field.options?.map((option, i) => (
                        <option key={i} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      disabled
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {template ? 'Edit Template' : 'Create New Template'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {previewMode ? 'Edit' : 'Preview'}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Saving...' : 'Save Template'}
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                ×
              </button>
            </div>
          </div>

          {!previewMode && (
            <div className="flex gap-1 border-b">
              <button
                onClick={() => setActiveTab('structure')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'structure'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Structure
              </button>
              <button
                onClick={() => setActiveTab('fields')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'fields'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Custom Fields
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-1" />
                Settings
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {previewMode ? (
            renderPreview()
          ) : (
            <>
              {activeTab === 'structure' && renderStructureTab()}
              {activeTab === 'fields' && renderFieldsTab()}
              {activeTab === 'settings' && renderSettingsTab()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
