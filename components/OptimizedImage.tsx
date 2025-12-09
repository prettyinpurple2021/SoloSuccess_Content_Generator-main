import React, { useState, useRef, useEffect, useCallback } from 'react';
import { frontendPerformanceService } from '../services/frontendPerformanceService';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  placeholder?: string;
  quality?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Event) => void;
  lazy?: boolean;
  sizes?: string;
  srcSet?: string;
}

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder,
  quality = 75,
  priority = false,
  onLoad,
  onError,
  lazy = true,
  sizes,
  srcSet,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy || priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate optimized src with quality parameter
  const getOptimizedSrc = useCallback((originalSrc: string, _targetQuality: number) => {
    // If it's a data URL or external URL, return as-is
    if (originalSrc.startsWith('data:') || originalSrc.startsWith('http')) {
      return originalSrc;
    }

    // For local images, you could add quality parameters here
    // This is a placeholder for image optimization service integration
    return originalSrc;
  }, []);

  // Generate responsive srcSet
  const generateSrcSet = useCallback(
    (originalSrc: string) => {
      if (srcSet) return srcSet;

      // Generate responsive images for different screen densities
      const densities = [1, 1.5, 2, 3];
      return densities
        .map((density) => `${getOptimizedSrc(originalSrc, quality)} ${density}x`)
        .join(', ');
    },
    [srcSet, getOptimizedSrc, quality]
  );

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || priority || isInView) return;

    const currentImg = imgRef.current;
    if (!currentImg) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px',
        threshold: 0.01,
      }
    );

    observerRef.current.observe(currentImg);

    return () => {
      if (observerRef.current && currentImg) {
        observerRef.current.unobserve(currentImg);
      }
    };
  }, [lazy, priority, isInView]);

  // Handle image load
  const handleLoad = useCallback(() => {
    const loadTime = performance.now();
    frontendPerformanceService.trackComponentRender('OptimizedImage_load', loadTime);

    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setHasError(true);
      onError?.(event.nativeEvent);
    },
    [onError]
  );

  // Preload critical images
  useEffect(() => {
    if (priority && typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = getOptimizedSrc(src, quality);
      document.head.appendChild(link);

      return () => {
        document.head.removeChild(link);
      };
    }
  }, [priority, src, quality, getOptimizedSrc]);

  // Placeholder component
  const PlaceholderComponent = () => (
    <div
      className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      {placeholder ? (
        <img src={placeholder} alt="" className="opacity-50" />
      ) : (
        <div className="text-gray-400 text-sm">Loading...</div>
      )}
    </div>
  );

  // Error component
  const ErrorComponent = () => (
    <div
      className={`bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <div className="text-gray-500 text-sm text-center">
        <div>⚠️</div>
        <div>Failed to load image</div>
      </div>
    </div>
  );

  // Don't render image if not in view (for lazy loading)
  if (!isInView) {
    return <PlaceholderComponent />;
  }

  // Show error state
  if (hasError) {
    return <ErrorComponent />;
  }

  return (
    <div className="relative">
      {/* Placeholder while loading */}
      {!isLoaded && <PlaceholderComponent />}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={getOptimizedSrc(src, quality)}
        srcSet={generateSrcSet(src)}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        onLoad={handleLoad}
        onError={handleError}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        decoding="async"
        style={{
          ...(isLoaded ? {} : { position: 'absolute', top: 0, left: 0 }),
          width,
          height,
        }}
      />
    </div>
  );
};

export default OptimizedImage;
