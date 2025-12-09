import React, { useState, useEffect } from 'react';
import { ContentTemplate, TemplateSection, TemplateField } from '../types';
import { apiService } from '../services/clientApiService';
import { Star, Search, Filter, Eye, Edit, Copy, Trash2, Plus } from 'lucide-react';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: ContentTemplate) => void;
  onEditTemplate: (template: ContentTemplate) => void;
  onCreateNew: () => void;
  userId: string;
}

export default function TemplateLibrary({
  isOpen,
  onClose,
  onSelectTemplate,
  onEditTemplate,
  onCreateNew,
  userId,
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedContentType, setSelectedContentType] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'usage' | 'created'>('rating');
  const [previewTemplate, setPreviewTemplate] = useState<ContentTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load templates on component mount
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  // Filter and sort templates when filters change
  useEffect(() => {
    filterAndSortTemplates();
  }, [templates, searchTerm, selectedCategory, selectedContentType, selectedIndustry, sortBy]);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const templatesData = await apiService.getContentTemplates(userId);
      setTemplates(templatesData);
    } catch (err) {
      setError('Failed to load templates. Please try again.');
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTemplates = () => {
    let filtered = [...templates];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (template) =>
          template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          template.industry.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((template) => template.category === selectedCategory);
    }

    // Apply content type filter
    if (selectedContentType !== 'all') {
      filtered = filtered.filter((template) => template.contentType === selectedContentType);
    }

    // Apply industry filter
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter((template) => template.industry === selectedIndustry);
    }

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          return b.rating - a.rating;
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    setFilteredTemplates(filtered);
  };

  const handleUseTemplate = async (template: ContentTemplate) => {
    try {
      // Increment usage count
      await apiService.updateTemplate(userId, template.id, {
        usageCount: template.usageCount + 1,
      });

      // Update local state
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t))
      );

      onSelectTemplate(template);
      onClose();
    } catch (err) {
      setError('Failed to use template. Please try again.');
      console.error('Error using template:', err);
    }
  };

  const handleDeleteTemplate = async (template: ContentTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await apiService.deleteTemplate(userId, template.id);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    } catch (err) {
      setError('Failed to delete template. Please try again.');
      console.error('Error deleting template:', err);
    }
  };

  const handleDuplicateTemplate = async (template: ContentTemplate) => {
    try {
      const duplicatedTemplate = {
        name: `${template.name} (Copy)`,
        category: template.category,
        industry: template.industry,
        contentType: template.contentType,
        structure: template.structure,
        customizableFields: template.customizableFields,
        usageCount: 0,
        rating: 0,
        isPublic: false,
      };

      const newTemplate = await apiService.addTemplate(
        userId,
        duplicatedTemplate as Omit<ContentTemplate, 'id' | 'createdAt' | 'updatedAt'>
      );
      setTemplates((prev) => [newTemplate, ...prev]);
    } catch (err) {
      setError('Failed to duplicate template. Please try again.');
      console.error('Error duplicating template:', err);
    }
  };

  const renderTemplatePreview = (template: ContentTemplate) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {template.category}
                  </span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                    {template.contentType}
                  </span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                    {template.industry}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-2">Template Structure</h4>
              <div className="space-y-2">
                {template.structure.map((section, index) => (
                  <div key={section.id} className="border rounded p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {section.type}
                      </span>
                      {section.isCustomizable && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                          Customizable
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      {section.content || section.placeholder || 'Content will be generated here'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {template.customizableFields.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Customizable Fields</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {template.customizableFields.map((field) => (
                    <div key={field.id} className="border rounded p-3">
                      <div className="font-medium text-sm text-gray-900">{field.label}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Type: {field.type} {field.required && '(Required)'}
                      </div>
                      {field.placeholder && (
                        <div className="text-xs text-gray-500 mt-1">
                          Placeholder: {field.placeholder}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleUseTemplate(template)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Use This Template
              </button>
              <button
                onClick={() => {
                  setPreviewTemplate(null);
                  onEditTemplate(template);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
        <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Template Library</h2>
              <div className="flex gap-2">
                <button
                  onClick={onCreateNew}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                  ×
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="marketing">Marketing</option>
                <option value="educational">Educational</option>
                <option value="promotional">Promotional</option>
                <option value="informational">Informational</option>
              </select>

              <select
                value={selectedContentType}
                onChange={(e) => setSelectedContentType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="blog">Blog</option>
                <option value="social">Social</option>
                <option value="email">Email</option>
                <option value="video">Video</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="rating">Sort by Rating</option>
                <option value="usage">Sort by Usage</option>
                <option value="name">Sort by Name</option>
                <option value="created">Sort by Date</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Filter className="w-12 h-12 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600 mb-4">
                  {templates.length === 0
                    ? "You haven't created any templates yet."
                    : 'Try adjusting your search or filters.'}
                </p>
                <button
                  onClick={onCreateNew}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create Your First Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            {template.category}
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                            {template.contentType}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span>{template.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-3">
                      <div>Industry: {template.industry}</div>
                      <div>Used {template.usageCount} times</div>
                      <div>{template.structure.length} sections</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setPreviewTemplate(template)}
                        className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded hover:bg-gray-200 flex items-center justify-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleUseTemplate(template)}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm"
                      >
                        Use
                      </button>
                      <button
                        onClick={() => onEditTemplate(template)}
                        className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateTemplate(template)}
                        className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="px-3 py-2 border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && renderTemplatePreview(previewTemplate)}
    </>
  );
}
