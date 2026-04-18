// Lazy Loading optimisé pour mobile
// src/hooks/useLazyLoad.js

import { useState, useEffect, useRef, useCallback } from 'react';

export const useLazyLoad = (
  fetchFunction,
  options = {}
) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const {
    threshold = 0.1,
    rootMargin = '100px',
    pageSize = 20,
    enabled = true,
    initialLoad = true
  } = options;

  const observerRef = useRef();
  const loadingRef = useRef(false);
  const lastPageRef = useRef(page);

  // Charger les données
  const loadMore = useCallback(async (pageNum = page) => {
    if (loadingRef.current || !enabled) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction({
        page: pageNum,
        pageSize,
        ...options.params
      });

      // Gérer différents formats de réponse
      const newData = result.data || result.items || result;
      const totalCount = result.total || result.totalCount || result.length;
      const currentPageSize = newData.length;

      // Mettre à jour les données
      setData(prevData => {
        if (pageNum === 1) return newData;
        return [...(prevData || []), ...newData];
      });

      // Vérifier s'il y a plus de données
      const hasMoreData = (pageNum * pageSize) + currentPageSize < totalCount;
      setHasMore(hasMoreData);
      setPage(pageNum + 1);
      lastPageRef.current = pageNum + 1;

      return newData;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchFunction, page, pageSize, enabled, options.params]);

  // Réinitialiser
  const reset = useCallback(() => {
    setData(null);
    setLoading(false);
    setError(null);
    setHasMore(true);
    setPage(1);
    lastPageRef.current = 1;
    loadingRef.current = false;
  }, []);

  // Observer pour le défilement infini
  const observerCallback = useCallback((entries) => {
    const [entry] = entries;
    
    if (entry.isIntersecting && hasMore && !loading && enabled) {
      loadMore(lastPageRef.current);
    }
  }, [hasMore, loading, enabled, loadMore]);

  // Configurer l'observer
  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(observerCallback, {
      threshold,
      rootMargin
    });

    observerRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin, observerCallback, enabled]);

  // Observer le dernier élément
  const observeElement = useCallback((element) => {
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }
  }, []);

  // Charger les données initiales
  useEffect(() => {
    if (initialLoad && enabled && !data) {
      loadMore(1);
    }
  }, [initialLoad, enabled, data, loadMore]);

  // Recharger si les paramètres changent
  useEffect(() => {
    if (options.params) {
      reset();
      if (initialLoad && enabled) {
        loadMore(1);
      }
    }
  }, [JSON.stringify(options.params), reset, initialLoad, enabled, loadMore]);

  return {
    data,
    loading,
    error,
    hasMore,
    loadMore,
    reset,
    observeElement,
    page: lastPageRef.current
  };
};

// Hook pour le lazy loading d'images
export const useImageLazyLoad = () => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const observerRef = useRef();

  const observeImage = useCallback((img) => {
    if (!img || loadedImages.has(img.src)) return;

    if (observerRef.current) {
      observerRef.current.observe(img);
    }
  }, [loadedImages]);

  const markAsLoaded = useCallback((src) => {
    setLoadedImages(prev => new Set([...prev, src]));
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            
            // Charger l'image
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.onload = () => markAsLoaded(img.src);
              observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    observerRef.current = observer;

    return () => observer.disconnect();
  }, [markAsLoaded]);

  return {
    observeImage,
    isLoaded: (src) => loadedImages.has(src),
    loadedCount: loadedImages.size
  };
};

// Composant de liste virtuelle optimisée pour mobile
export const useVirtualList = (items, options = {}) => {
  const {
    itemHeight = 60,
    containerHeight = 400,
    overscan = 5
  } = options;

  const [scrollTop, setScrollTop] = useState(0);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

  const visibleItems = items.slice(startIndex, endIndex).map((item, index) => ({
    item,
    index: startIndex + index
  }));

  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  };
};
