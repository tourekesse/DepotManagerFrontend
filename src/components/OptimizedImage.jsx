// Optimisation des images pour mobile
// src/components/OptimizedImage.jsx

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Skeleton,
  Typography
} from '@mui/material';

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  webpSrc,
  fallbackSrc,
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef();

  // Intersection Observer pour lazy loading
  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px' // Commencer à charger 50px avant d'être visible
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Gérer le chargement
  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  // Générer les sources WebP
  const generateWebPSrc = (originalSrc) => {
    if (webpSrc) return webpSrc;
    
    // Convertir automatiquement en WebP si possible
    if (originalSrc.includes('/uploads/') || originalSrc.includes('/images/')) {
      return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    
    return null;
  };

  const webpSource = generateWebPSrc(src);

  // Afficher le squelette pendant le chargement
  if (!isInView) {
    return (
      <Box
        ref={imgRef}
        width={width}
        height={height}
        className={className}
        {...props}
      >
        <Skeleton 
          variant="rectangular" 
          width="100%" 
          height="100%" 
          animation="wave"
        />
      </Box>
    );
  }

  // Afficher l'image optimisée
  if (hasError && fallbackSrc) {
    return (
      <OptimizedImage
        src={fallbackSrc}
        alt={alt}
        width={width}
        height={height}
        className={className}
        priority={priority}
        onLoad={onLoad}
        onError={onError}
        {...props}
      />
    );
  }

  return (
    <Box
      ref={imgRef}
      width={width}
      height={height}
      className={className}
      position="relative"
      overflow="hidden"
      {...props}
    >
      {!isLoaded && (
        <Skeleton
          variant="rectangular"
          width="100%"
          height="100%"
          animation="wave"
          sx={{ position: 'absolute', top: 0, left: 0 }}
        />
      )}
      
      {webpSource ? (
        // Utiliser picture element pour WebP avec fallback
        <picture>
          <source
            srcSet={webpSource}
            type="image/webp"
          />
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            onLoad={handleLoad}
            onError={handleError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: isLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease'
            }}
          />
        </picture>
      ) : (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}
      
      {hasError && (
        <Box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bgcolor="grey.200"
        >
          <Typography variant="caption" color="text.secondary">
            Image non disponible
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default OptimizedImage;
