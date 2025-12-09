import React, { useState, useEffect } from 'react';
import { ImageStyle, BrandAsset, LoadingState } from '../types';
import { apiService } from '../services/clientApiService';
import { Spinner } from '../constants';

interface ImageStyleManagerProps {
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  userId: string;
}

const ImageStyleManager: React.FC<ImageStyleManagerProps> = ({
  onClose,
  onSuccess,
  onError,
  userId,
}) => {
  const [imageStyles, setImageStyles] = useState<ImageStyle[]>([]);
  const [isLoading, setIsLoading] = useState<LoadingState>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStyle, setEditingStyle] = useState<ImageStyle | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state for creating/editing styles
  const [formData, setFormData] = useState({
    name: '',
    stylePrompt: '',
    colorPalette: [''],
    visualElements: [''],
    brandAssets: [] as BrandAsset[],
  });

  const withLoading = <T extends unknown[]>(key: string, fn: (...args: T) => Promise<void>) => {
    return async (...args: T) => {
      setIsLoading((prev) => ({ ...prev, [key]: true }));
      try {
        await fn(...args);
      } catch (error: unknown) {
        console.error(`Error in ${key}:`, error);
        onError(error instanceof Error ? error.message : 'An unexpected error occurred.');
      } finally {
        setIsLoading((prev) => ({ ...prev, [key]: false }));
      }
    };
  };

  const loadImageStyles = withLoading('loadStyles', async () => {
    const styles = await apiService.getImageStyles(userId);
    setImageStyles(styles);
  });

  const handleCreateStyle = withLoading('createStyle', async () => {
    if (!formData.name.trim() || !formData.stylePrompt.trim()) {
      onError('Please provide a name and style prompt.');
      return;
    }

    const newStyle = await apiService.addImageStyle(userId, {
      name: formData.name,
      stylePrompt: formData.stylePrompt,
      colorPalette: formData.colorPalette.filter((color) => color.trim()),
      visualElements: formData.visualElements.filter((element) => element.trim()),
      brandAssets: formData.brandAssets,
    });

    setImageStyles((prev) => [newStyle, ...prev]);
    setShowCreateModal(false);
    resetForm();
    onSuccess('Image style created successfully!');
  });

  const handleUpdateStyle = withLoading('updateStyle', async () => {
    if (!editingStyle || !formData.name.trim() || !formData.stylePrompt.trim()) {
      onError('Please provide a name and style prompt.');
      return;
    }

    const updatedStyle = await apiService.updateImageStyle(userId, editingStyle.id, {
      name: formData.name,
      stylePrompt: formData.stylePrompt,
      colorPalette: formData.colorPalette.filter((color) => color.trim()),
      visualElements: formData.visualElements.filter((element) => element.trim()),
      brandAssets: formData.brandAssets,
    });

    setImageStyles((prev) =>
      prev.map((style) => (style.id === editingStyle.id ? updatedStyle : style))
    );
    setEditingStyle(null);
    setShowCreateModal(false);
    resetForm();
    onSuccess('Image style updated successfully!');
  });

  const handleDeleteStyle = withLoading('deleteStyle', async (styleId: string) => {
    await apiService.deleteImageStyle(userId, styleId);
    setImageStyles((prev) => prev.filter((style) => style.id !== styleId));
    onSuccess('Image style deleted successfully!');
  });

  const resetForm = () => {
    setFormData({
      name: '',
      stylePrompt: '',
      colorPalette: [''],
      visualElements: [''],
      brandAssets: [],
    });
  };

  const handleEditStyle = (style: ImageStyle) => {
    setEditingStyle(style);
    setFormData({
      name: style.name,
      stylePrompt: style.stylePrompt,
      colorPalette: style.colorPalette.length > 0 ? style.colorPalette : [''],
      visualElements: style.visualElements.length > 0 ? style.visualElements : [''],
      brandAssets: style.brandAssets,
    });
    setShowCreateModal(true);
  };

  const handleAddColorField = () => {
    setFormData((prev) => ({
      ...prev,
      colorPalette: [...prev.colorPalette, ''],
    }));
  };

  const handleRemoveColorField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      colorPalette: prev.colorPalette.filter((_, i) => i !== index),
    }));
  };

  const handleColorChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      colorPalette: prev.colorPalette.map((color, i) => (i === index ? value : color)),
    }));
  };

  const handleAddElementField = () => {
    setFormData((prev) => ({
      ...prev,
      visualElements: [...prev.visualElements, ''],
    }));
  };

  const handleRemoveElementField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      visualElements: prev.visualElements.filter((_, i) => i !== index),
    }));
  };

  const handleElementChange = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      visualElements: prev.visualElements.map((element, i) => (i === index ? value : element)),
    }));
  };

  const handleAddBrandAsset = () => {
    setFormData((prev) => ({
      ...prev,
      brandAssets: [
        ...prev.brandAssets,
        {
          id: Date.now().toString(),
          type: 'logo',
          data: '',
          usage: 'optional',
        },
      ],
    }));
  };

  const handleRemoveBrandAsset = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      brandAssets: prev.brandAssets.filter((_, i) => i !== index),
    }));
  };

  const handleBrandAssetChange = (index: number, field: keyof BrandAsset, value: string) => {
    setFormData((prev) => ({
      ...prev,
      brandAssets: prev.brandAssets.map((asset, i) =>
        i === index ? { ...asset, [field]: value } : asset
      ),
    }));
  };

  const handlePreviewStyle = (style: ImageStyle) => {
    setSelectedStyle(style);
    setShowPreview(true);
  };

  useEffect(() => {
    loadImageStyles();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border">
          <h3 className="text-2xl font-display text-secondary">Image Style Manager</h3>
          <p className="text-muted-foreground mt-2">
            Create and manage image styles for consistent brand visuals
          </p>
        </div>

        <div className="p-6 overflow-y-auto flex-grow">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold text-primary-foreground">Your Image Styles</h4>
            <button
              onClick={() => {
                resetForm();
                setEditingStyle(null);
                setShowCreateModal(true);
              }}
              className="bg-primary/80 hover:bg-primary text-white font-bold py-2 px-4 rounded-lg"
            >
              Create New Style
            </button>
          </div>

          {isLoading.loadStyles ? (
            <div className="flex justify-center items-center py-12">
              <Spinner />
            </div>
          ) : imageStyles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No image styles created yet</p>
              <button
                onClick={() => {
                  resetForm();
                  setEditingStyle(null);
                  setShowCreateModal(true);
                }}
                className="bg-primary/80 hover:bg-primary text-white font-bold py-2 px-4 rounded-lg"
              >
                Create Your First Style
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {imageStyles.map((style) => (
                <div key={style.id} className="glass-card p-4">
                  <h5 className="font-semibold text-primary-foreground mb-2">{style.name}</h5>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {style.stylePrompt}
                  </p>

                  {style.colorPalette.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Colors:</p>
                      <div className="flex flex-wrap gap-1">
                        {style.colorPalette.slice(0, 5).map((color, index) => (
                          <div
                            key={index}
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                        {style.colorPalette.length > 5 && (
                          <span className="text-xs text-muted-foreground">
                            +{style.colorPalette.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {style.visualElements.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Elements:</p>
                      <div className="flex flex-wrap gap-1">
                        {style.visualElements.slice(0, 3).map((element, index) => (
                          <span key={index} className="text-xs bg-muted px-2 py-1 rounded">
                            {element}
                          </span>
                        ))}
                        {style.visualElements.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{style.visualElements.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handlePreviewStyle(style)}
                      className="flex-1 bg-secondary/80 hover:bg-secondary text-white text-sm py-1 px-2 rounded"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleEditStyle(style)}
                      className="flex-1 bg-primary/80 hover:bg-primary text-white text-sm py-1 px-2 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteStyle(style.id)}
                      disabled={isLoading.deleteStyle}
                      className="flex-1 bg-red-600/80 hover:bg-red-600 text-white text-sm py-1 px-2 rounded disabled:opacity-50"
                    >
                      {isLoading.deleteStyle ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="bg-muted hover:bg-muted/70 text-white font-bold py-2 px-4 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>

      {/* Create/Edit Style Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-60 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-border">
              <h4 className="text-xl font-display text-secondary">
                {editingStyle ? 'Edit Image Style' : 'Create New Image Style'}
              </h4>
            </div>

            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              {/* Basic Information */}
              <div>
                <label className="block text-sm font-semibold text-primary-foreground mb-2">
                  Style Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                  placeholder="e.g., Corporate Professional, Creative Minimalist"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary-foreground mb-2">
                  Style Prompt *
                </label>
                <textarea
                  value={formData.stylePrompt}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, stylePrompt: e.target.value }))
                  }
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-foreground h-24"
                  placeholder="Describe the visual style, composition, lighting, and aesthetic you want for images..."
                />
              </div>

              {/* Color Palette */}
              <div>
                <label className="block text-sm font-semibold text-primary-foreground mb-2">
                  Color Palette
                </label>
                <div className="space-y-2">
                  {formData.colorPalette.map((color, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => handleColorChange(index, e.target.value)}
                        className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="e.g., #3B82F6, blue, rgb(59, 130, 246)"
                      />
                      <div
                        className="w-10 h-10 rounded border border-border"
                        style={{ backgroundColor: color || '#transparent' }}
                      />
                      {formData.colorPalette.length > 1 && (
                        <button
                          onClick={() => handleRemoveColorField(index)}
                          className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-2 rounded"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddColorField}
                    className="bg-secondary/80 hover:bg-secondary text-white text-sm py-2 px-3 rounded"
                  >
                    Add Color
                  </button>
                </div>
              </div>

              {/* Visual Elements */}
              <div>
                <label className="block text-sm font-semibold text-primary-foreground mb-2">
                  Visual Elements
                </label>
                <div className="space-y-2">
                  {formData.visualElements.map((element, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={element}
                        onChange={(e) => handleElementChange(index, e.target.value)}
                        className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-foreground"
                        placeholder="e.g., geometric shapes, gradients, textures"
                      />
                      {formData.visualElements.length > 1 && (
                        <button
                          onClick={() => handleRemoveElementField(index)}
                          className="bg-red-600/80 hover:bg-red-600 text-white px-3 py-2 rounded"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={handleAddElementField}
                    className="bg-secondary/80 hover:bg-secondary text-white text-sm py-2 px-3 rounded"
                  >
                    Add Element
                  </button>
                </div>
              </div>

              {/* Brand Assets */}
              <div>
                <label className="block text-sm font-semibold text-primary-foreground mb-2">
                  Brand Assets
                </label>
                <div className="space-y-3">
                  {formData.brandAssets.map((asset, index) => (
                    <div key={index} className="glass-card p-3 space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={asset.type}
                          onChange={(e) => handleBrandAssetChange(index, 'type', e.target.value)}
                          className="bg-muted border border-border rounded px-2 py-1 text-foreground"
                        >
                          <option value="logo">Logo</option>
                          <option value="color">Color</option>
                          <option value="font">Font</option>
                          <option value="pattern">Pattern</option>
                        </select>
                        <select
                          value={asset.usage}
                          onChange={(e) => handleBrandAssetChange(index, 'usage', e.target.value)}
                          className="bg-muted border border-border rounded px-2 py-1 text-foreground"
                        >
                          <option value="always">Always Include</option>
                          <option value="optional">Optional</option>
                          <option value="never">Never Include</option>
                        </select>
                        <button
                          onClick={() => handleRemoveBrandAsset(index)}
                          className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1 rounded"
                        >
                          ×
                        </button>
                      </div>
                      <input
                        type="text"
                        value={asset.data}
                        onChange={(e) => handleBrandAssetChange(index, 'data', e.target.value)}
                        className="w-full bg-muted border border-border rounded px-2 py-1 text-foreground"
                        placeholder="Asset description or URL"
                      />
                    </div>
                  ))}
                  <button
                    onClick={handleAddBrandAsset}
                    className="bg-secondary/80 hover:bg-secondary text-white text-sm py-2 px-3 rounded"
                  >
                    Add Brand Asset
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-muted/30 border-t border-border flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="bg-muted hover:bg-muted/70 text-white font-bold py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={editingStyle ? handleUpdateStyle : handleCreateStyle}
                disabled={isLoading.createStyle || isLoading.updateStyle}
                className="bg-primary/80 hover:bg-primary text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {isLoading.createStyle || isLoading.updateStyle ? (
                  <Spinner />
                ) : editingStyle ? (
                  'Update Style'
                ) : (
                  'Create Style'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedStyle && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-60 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div className="glass-card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border">
              <h4 className="text-xl font-display text-secondary">{selectedStyle.name}</h4>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h5 className="font-semibold text-primary-foreground mb-2">Style Prompt</h5>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded">
                  {selectedStyle.stylePrompt}
                </p>
              </div>

              {selectedStyle.colorPalette.length > 0 && (
                <div>
                  <h5 className="font-semibold text-primary-foreground mb-2">Color Palette</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedStyle.colorPalette.map((color, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-border"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm text-muted-foreground">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedStyle.visualElements.length > 0 && (
                <div>
                  <h5 className="font-semibold text-primary-foreground mb-2">Visual Elements</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedStyle.visualElements.map((element, index) => (
                      <span key={index} className="bg-muted px-2 py-1 rounded text-sm">
                        {element}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedStyle.brandAssets.length > 0 && (
                <div>
                  <h5 className="font-semibold text-primary-foreground mb-2">Brand Assets</h5>
                  <div className="space-y-2">
                    {selectedStyle.brandAssets.map((asset, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center bg-muted/50 p-2 rounded"
                      >
                        <span className="text-sm">
                          {asset.type}: {asset.data}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {asset.usage}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 bg-muted/30 border-t border-border flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="bg-muted hover:bg-muted/70 text-white font-bold py-2 px-4 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageStyleManager;
