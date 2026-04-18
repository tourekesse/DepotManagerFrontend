// Composant de liste optimisée pour mobile
// src/components/VirtualizedProductList.jsx

import React, { useRef, useEffect } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Skeleton,
  CircularProgress
} from '@mui/material';
import { useVirtualList } from '../hooks/useLazyLoad';
import OptimizedImage from './OptimizedImage';

const VirtualizedProductList = ({
  products,
  loading,
  onProductClick,
  onLoadMore,
  hasMore,
  itemHeight = 80,
  containerHeight = 400
}) => {
  const containerRef = useRef();
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  } = useVirtualList(products, {
    itemHeight,
    containerHeight
  });

  // Rendre un élément produit
  const renderProduct = ({ item, index }) => {
    const product = item;
    
    return (
      <ListItem
        key={product.id}
        onClick={() => onProductClick(product)}
        sx={{
          height: itemHeight,
          borderBottom: '1px solid #f0f0f0',
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: '#f8f9fa'
          },
          // Optimisation pour le scroll mobile
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)',
          willChange: 'transform'
        }}
      >
        <ListItemAvatar>
          <OptimizedImage
            src={product.image || '/images/placeholder-product.webp'}
            alt={product.designation}
            width={60}
            height={60}
            sx={{
              borderRadius: 1
            }}
          />
        </ListItemAvatar>
        
        <ListItemText
          primary={
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {product.designation}
            </Typography>
          }
          secondary={
            <Box>
              <Typography
                variant="caption"
                color="primary"
                fontWeight="bold"
              >
                {product.prixVenteHt?.toLocaleString()} F
              </Typography>
              
              {product.stock !== undefined && (
                <Typography
                  variant="caption"
                  color={product.stock > 0 ? 'success.main' : 'error.main'}
                  sx={{ ml: 1 }}
                >
                  Stock: {product.stock}
                </Typography>
              )}
            </Box>
          }
        />
      </ListItem>
    );
  };

  // Rendre un squelette
  const renderSkeleton = (index) => (
    <ListItem key={`skeleton-${index}`} sx={{ height: itemHeight }}>
      <ListItemAvatar>
        <Skeleton variant="circular" width={60} height={60} />
      </ListItemAvatar>
      <ListItemText
        primary={<Skeleton variant="text" width="60%" height={20} />}
        secondary={
          <Box>
            <Skeleton variant="text" width="40%" height={16} />
            <Skeleton variant="text" width="30%" height={14} sx={{ mt: 0.5 }} />
          </Box>
        }
      />
    </ListItem>
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        // Optimisation pour le scroll mobile
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth'
      }}
      onScroll={handleScroll}
    >
      {/* Conteneur avec hauteur totale */}
      <Box sx={{ height: totalHeight, position: 'relative' }}>
        {/* Offset pour le scroll */}
        <Box sx={{ height: offsetY }} />
        
        {/* Éléments visibles */}
        <Box>
          {visibleItems.map(({ item, index }) => renderProduct(item))}
        </Box>
        
        {/* Éléments de chargement */}
        {loading && Array.from({ length: 3 }).map((_, index) => 
          renderSkeleton(`loading-${index}`)
        )}
      </Box>
      
      {/* Loader pour charger plus */}
      {hasMore && !loading && (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <CircularProgress size={24} />
        </Box>
      )}
    </Box>
  );
};

export default VirtualizedProductList;
