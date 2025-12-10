import React, { useState, useRef, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Type,
  Image,
  List,
  Quote,
  Hash,
  Link,
  Video,
  Calendar,
  Plus,
  Trash2,
  Edit3,
  Move,
  Copy,
} from 'lucide-react';
import {
  HoloCard,
  HoloButton,
  HoloText,
  HoloInput,
  SparkleEffect,
  FloatingSkull,
} from './HolographicTheme';

interface ContentBlock {
  id: string;
  type: 'text' | 'image' | 'list' | 'quote' | 'hashtags' | 'link' | 'video' | 'cta';
  content: string;
  metadata?: {
    imageUrl?: string;
    linkUrl?: string;
    videoUrl?: string;
    listItems?: string[];
    style?: 'bold' | 'italic' | 'highlight';
  };
}

interface DragDropContentBuilderProps {
  initialBlocks?: ContentBlock[];
  onContentChange?: (blocks: ContentBlock[]) => void;
  onSave?: (content: string) => void;
  className?: string;
}


const blockTypes = [
  { type: 'text', icon: <Type className="w-5 h-5" />, label: 'Text', color: 'text-blue-400' },
  { type: 'image', icon: <Image className="w-5 h-5" />, label: 'Image', color: 'text-green-400' },
  { type: 'list', icon: <List className="w-5 h-5" />, label: 'List', color: 'text-purple-400' },
  { type: 'quote', icon: <Quote className="w-5 h-5" />, label: 'Quote', color: 'text-pink-400' },
  {
    type: 'hashtags',
    icon: <Hash className="w-5 h-5" />,
    label: 'Hashtags',
    color: 'text-cyan-400',
  },
  { type: 'link', icon: <Link className="w-5 h-5" />, label: 'Link', color: 'text-yellow-400' },
  { type: 'video', icon: <Video className="w-5 h-5" />, label: 'Video', color: 'text-red-400' },
  {
    type: 'cta',
    icon: <Calendar className="w-5 h-5" />,
    label: 'Call to Action',
    color: 'text-orange-400',
  },
];

export const DragDropContentBuilder: React.FC<DragDropContentBuilderProps> = ({
  initialBlocks = [],
  onContentChange,
  onSave,
  className = '',
}) => {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [showBlockPalette, setShowBlockPalette] = useState(false);



  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
        const oldIndex = blocks.findIndex((block) => block.id === active.id);
        const newIndex = blocks.findIndex((block) => block.id === over?.id);

        const newBlocks = arrayMove(blocks, oldIndex, newIndex);
        setBlocks(newBlocks);
        onContentChange?.(newBlocks);
      }
    },
    [blocks, onContentChange]
  );

  const addBlock = useCallback(
    (type: ContentBlock['type']) => {
      const newBlock: ContentBlock = {
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        content: getDefaultContent(type),
        metadata: getDefaultMetadata(type),
      };

      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      onContentChange?.(newBlocks);
      setShowBlockPalette(false);
      setEditingBlock(newBlock.id);
    },
    [blocks, onContentChange]
  );

  const updateBlock = useCallback(
    (id: string, updates: Partial<ContentBlock>) => {
      const newBlocks = blocks.map((block) => (block.id === id ? { ...block, ...updates } : block));
      setBlocks(newBlocks);
      onContentChange?.(newBlocks);
    },
    [blocks, onContentChange]
  );

  const deleteBlock = useCallback(
    (id: string) => {
      const newBlocks = blocks.filter((block) => block.id !== id);
      setBlocks(newBlocks);
      onContentChange?.(newBlocks);
    },
    [blocks, onContentChange]
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const blockToDuplicate = blocks.find((block) => block.id === id);
      if (!blockToDuplicate) return;

      const newBlock: ContentBlock = {
        ...blockToDuplicate,
        id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const blockIndex = blocks.findIndex((block) => block.id === id);
      const newBlocks = [...blocks];
      newBlocks.splice(blockIndex + 1, 0, newBlock);

      setBlocks(newBlocks);
      onContentChange?.(newBlocks);
    },
    [blocks, onContentChange]
  );

  const generateFinalContent = useCallback(() => {
    return blocks
      .map((block) => {
        switch (block.type) {
          case 'text':
            return block.content;
          case 'image':
            return `[Image: ${block.metadata?.imageUrl || 'Add image URL'}]`;
          case 'list':
            return (
              block.metadata?.listItems?.map((item) => `• ${item}`).join('\n') || block.content
            );
          case 'quote':
            return `"${block.content}"`;
          case 'hashtags':
            return block.content
              .split(' ')
              .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
              .join(' ');
          case 'link':
            return `[${block.content}](${block.metadata?.linkUrl || '#'})`;
          case 'video':
            return `[Video: ${block.metadata?.videoUrl || 'Add video URL'}]`;
          case 'cta':
            return `🚀 ${block.content}`;
          default:
            return block.content;
        }
      })
      .join('\n\n');
  }, [blocks]);

  const handleSave = useCallback(() => {
    const finalContent = generateFinalContent();
    onSave?.(finalContent);
  }, [generateFinalContent, onSave]);

  return (
    <HoloCard className={`relative ${className}`}>
      <SparkleEffect count={8} size="small" />
      <FloatingSkull className="absolute top-4 right-4" size="small" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <HoloText variant="title" glow>
          ✨ Content Builder
        </HoloText>
        <div className="flex gap-2">
          <HoloButton
            onClick={() => setShowBlockPalette(!showBlockPalette)}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Block
          </HoloButton>
          <HoloButton onClick={handleSave} className="flex items-center gap-2">
            Save ✨
          </HoloButton>
        </div>
      </div>

      {/* Block Palette */}
      {showBlockPalette && (
        <div className="mb-6 p-4 bg-glass-purple rounded-lg border border-white/20">
          <HoloText variant="subtitle" className="mb-3">
            Choose a block type:
          </HoloText>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {blockTypes.map(({ type, icon, label, color }) => (
              <button
                key={type}
                onClick={() => addBlock(type as ContentBlock['type'])}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg bg-glass-cyan border border-white/10 hover:border-white/30 transition-all duration-300 sparkles ${color}`}
              >
                {icon}
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content Blocks */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-4 min-h-32 p-4 rounded-lg border-2 border-dashed border-white/20 bg-white/5">
          {blocks.length === 0 && (
            <div className="text-center py-8">
              <HoloText className="text-white/60">
                Drag blocks here or click "Add Block" to start building your content ✨
              </HoloText>
            </div>
          )}

          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block) => (
              <SortableContentBlock
                key={block.id}
                block={block}
                isEditing={editingBlock === block.id}
                onEdit={() => setEditingBlock(block.id)}
                onSave={() => setEditingBlock(null)}
                onUpdate={(updates) => updateBlock(block.id, updates)}
                onDelete={() => deleteBlock(block.id)}
                onDuplicate={() => duplicateBlock(block.id)}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>

      {/* Preview */}
      {blocks.length > 0 && (
        <div className="mt-6 p-4 bg-glass-cyan rounded-lg border border-white/20">
          <HoloText variant="subtitle" className="mb-3">
            Preview:
          </HoloText>
          <div className="whitespace-pre-wrap text-white/80 text-sm">{generateFinalContent()}</div>
        </div>
      )}
    </HoloCard>
  );
};

const SortableContentBlock: React.FC<{
  block: ContentBlock;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}> = ({ block, isEditing, onEdit, onSave, onUpdate, onDelete, onDuplicate }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <ContentBlockComponent
        block={block}
        isEditing={isEditing}
        onEdit={onEdit}
        onSave={onSave}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
      />
    </div>
  );
};

const ContentBlockComponent: React.FC<{
  block: ContentBlock;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  dragHandleProps: any;
  isDragging?: boolean;
}> = ({
  block,
  isEditing,
  onEdit,
  onSave,
  onUpdate,
  onDelete,
  onDuplicate,
  dragHandleProps,
  isDragging,
}) => {
  const blockType = blockTypes.find((bt) => bt.type === block.type);

  return (
    <div
      className={`glass-card p-4 group hover:border-pink-400/50 transition-all duration-300 ${isDragging ? 'rotate-2 scale-105' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="flex-shrink-0 p-2 rounded-lg bg-white/10 cursor-grab active:cursor-grabbing hover:bg-white/20 transition-colors touch-action-none"
        >
          <Move className="w-4 h-4 text-white/60" />
        </div>

        {/* Block Icon */}
        <div className={`flex-shrink-0 p-2 rounded-lg bg-glass-purple ${blockType?.color}`}>
          {blockType?.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <EditBlockForm block={block} onUpdate={onUpdate} onSave={onSave} />
          ) : (
            <div onClick={onEdit} className="cursor-pointer">
              <BlockPreview block={block} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={onDuplicate}
            className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const EditBlockForm: React.FC<{
  block: ContentBlock;
  onUpdate: (updates: Partial<ContentBlock>) => void;
  onSave: () => void;
}> = ({ block, onUpdate, onSave }) => {
  const [content, setContent] = useState(block.content);
  const [metadata, setMetadata] = useState(block.metadata || {});

  const handleSave = () => {
    onUpdate({ content, metadata });
    onSave();
  };

  return (
    <div className="space-y-3">
      <HoloInput
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={`Enter ${block.type} content...`}
        className="w-full"
      />

      {/* Type-specific fields */}
      {block.type === 'image' && (
        <HoloInput
          value={metadata.imageUrl || ''}
          onChange={(e) => setMetadata({ ...metadata, imageUrl: e.target.value })}
          placeholder="Image URL"
        />
      )}

      {block.type === 'link' && (
        <HoloInput
          value={metadata.linkUrl || ''}
          onChange={(e) => setMetadata({ ...metadata, linkUrl: e.target.value })}
          placeholder="Link URL"
        />
      )}

      {block.type === 'video' && (
        <HoloInput
          value={metadata.videoUrl || ''}
          onChange={(e) => setMetadata({ ...metadata, videoUrl: e.target.value })}
          placeholder="Video URL"
        />
      )}

      <div className="flex gap-2">
        <HoloButton onClick={handleSave} className="text-sm">
          Save ✨
        </HoloButton>
        <HoloButton onClick={onSave} variant="secondary" className="text-sm">
          Cancel
        </HoloButton>
      </div>
    </div>
  );
};

const BlockPreview: React.FC<{ block: ContentBlock }> = ({ block }) => {
  const renderPreview = () => {
    switch (block.type) {
      case 'text':
        return <p className="text-white/90">{block.content || 'Click to add text...'}</p>;
      case 'image':
        return (
          <div className="flex items-center gap-2 text-green-400">
            <Image className="w-4 h-4" />
            <span>{block.content || 'Click to add image...'}</span>
          </div>
        );
      case 'quote':
        return (
          <blockquote className="border-l-4 border-pink-400 pl-4 italic text-pink-300">
            "{block.content || 'Click to add quote...'}"
          </blockquote>
        );
      case 'hashtags':
        return <div className="text-cyan-400">{block.content || 'Click to add hashtags...'}</div>;
      default:
        return <p className="text-white/90">{block.content || `Click to add ${block.type}...`}</p>;
    }
  };

  return <div className="hover:bg-white/5 p-2 rounded transition-colors">{renderPreview()}</div>;
};

// Helper functions
function getDefaultContent(type: ContentBlock['type']): string {
  switch (type) {
    case 'text':
      return 'Your amazing content goes here...';
    case 'image':
      return 'Describe your image';
    case 'list':
      return 'List item 1\nList item 2\nList item 3';
    case 'quote':
      return 'Your inspiring quote';
    case 'hashtags':
      return '#content #marketing #success';
    case 'link':
      return 'Check this out!';
    case 'video':
      return 'Describe your video';
    case 'cta':
      return 'Take action now!';
    default:
      return '';
  }
}

function getDefaultMetadata(type: ContentBlock['type']): ContentBlock['metadata'] {
  switch (type) {
    case 'image':
      return { imageUrl: '' };
    case 'link':
      return { linkUrl: '' };
    case 'video':
      return { videoUrl: '' };
    case 'list':
      return { listItems: [] };
    default:
      return {};
  }
}

export default DragDropContentBuilder;
