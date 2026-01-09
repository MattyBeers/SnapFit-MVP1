/**
 * Enhanced Virtual Fitting Room Component
 * 360° rotation, realistic fitting, interactive controls, AI fit scoring
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateFitScore, trackOutfitAnalytics } from '../lib/fitScoring';
import { createOutfit, updateOutfit } from '../lib/api/outfits';

export default function VirtualFittingRoom({ outfit, userProfile, onClose, onSave }) {
  const [rotation, setRotation] = useState(0); // 0-360 degrees
  const [zoom, setZoom] = useState(1); // 0.5-2x
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [background, setBackground] = useState('neutral');
  const [customBackground, setCustomBackground] = useState(null);
  const [customBackgrounds, setCustomBackgrounds] = useState([]);
  const [showControls, setShowControls] = useState(true);
  const [fitScore, setFitScore] = useState(null);
  const [showFitScore, setShowFitScore] = useState(false);
  
  // Clothing positioning states
  const [isPositioningMode, setIsPositioningMode] = useState(false);
  const [clothingPositions, setClothingPositions] = useState({});
  const [clothingScales, setClothingScales] = useState({}); // New: Store scaling for each clothing item
  const [draggingItem, setDraggingItem] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [bodyDimensions, setBodyDimensions] = useState(null); // New: Store body photo dimensions
  const [hoveredItem, setHoveredItem] = useState(null); // Track which item is being hovered for scaling
  const [pinchDistance, setPinchDistance] = useState(null); // For mobile pinch zoom
  
  // Outfit naming states
  const [outfitName, setOutfitName] = useState(outfit?.name || '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Refs for smooth dragging performance
  const containerRef = useRef(null);
  const positionRef = useRef(clothingPositions);
  const scaleRef = useRef(clothingScales);
  const rafRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => {
    positionRef.current = clothingPositions;
  }, [clothingPositions]);

  useEffect(() => {
    scaleRef.current = clothingScales;
  }, [clothingScales]);

  // Auto-generate outfit name if none exists
  useEffect(() => {
    if (!outfitName && outfit?.items) {
      const generatedName = generateOutfitName(outfit.items);
      setOutfitName(generatedName);
    }
  }, [outfit]);

  // Generate outfit name based on items
  const generateOutfitName = (items) => {
    if (!items || items.length === 0) return 'New Outfit';
    
    const date = new Date();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    
    // Get main clothing types
    const types = items.map(i => i.type).filter(Boolean);
    const hasTop = types.some(t => ['shirt', 'jacket', 'top', 'hoodie', 'sweater', 'blouse', 'dress'].includes(t));
    const hasBottom = types.some(t => ['pants', 'shorts', 'skirt', 'jeans'].includes(t));
    
    let baseName = '';
    if (hasTop && hasBottom) {
      baseName = 'Complete Outfit';
    } else if (hasTop) {
      baseName = 'Top Style';
    } else if (hasBottom) {
      baseName = 'Bottom Look';
    } else {
      baseName = 'Outfit';
    }
    
    return `${baseName} - ${month} ${day}`;
  };

  // Load saved preferences and calculate fit score
  useEffect(() => {
    const savedPrefs = localStorage.getItem('snapfit_preferences');
    const savedBgs = localStorage.getItem('snapfit_custom_backgrounds');
    
    // Debug: Log user profile
    console.log('🧍 VFR User Profile:', userProfile);
    console.log('📸 Body Photo URL:', userProfile?.body_photo_url);
    console.log('📏 Measurements:', {
      height: userProfile?.height,
      shoulder_width: userProfile?.shoulder_width,
      chest_circumference: userProfile?.chest_circumference,
      waist_circumference: userProfile?.waist_circumference,
      hip_circumference: userProfile?.hip_circumference
    });
    
    // Debug: Log outfit items
    console.log('👗 VFR Outfit:', outfit);
    console.log('👕 Outfit items:', outfit?.items?.map(i => ({ name: i.name, type: i.type, image_url: i.image_url?.substring(0, 50) })));
    
    // Load saved clothing positions
    const outfitId = outfit._id || outfit.id || 'temp';
    const savedPositions = localStorage.getItem(`snapfit_positions_${outfitId}`);
    if (savedPositions) {
      setClothingPositions(JSON.parse(savedPositions));
      console.log('📍 Loaded saved clothing positions');
    }
    
    // Load saved clothing scales (auto-fit)
    const savedScales = localStorage.getItem(`snapfit_scales_${outfitId}`);
    if (savedScales) {
      setClothingScales(JSON.parse(savedScales));
      console.log('📐 Loaded saved clothing scales');
    }
    
    if (savedBgs) {
      setCustomBackgrounds(JSON.parse(savedBgs));
    }
    
    if (savedPrefs) {
      const prefs = JSON.parse(savedPrefs);
      setBackground(prefs.fittingRoomBackground || 'neutral');

      // Calculate fit score only if enabled
      if (prefs.enableFitScoring) {
        const score = calculateFitScore(outfit, userProfile, {
          currentSeason: getCurrentSeason(),
          targetOccasion: outfit.occasion
        });
        setFitScore(score);
      }

      // Track analytics only if enabled
      if (prefs.trackUsageData) {
        trackOutfitAnalytics(outfit._id || outfit.id, { type: 'tryOn' });
      }
    } else {
      // Default behavior if no preferences set
      const score = calculateFitScore(outfit, userProfile, {
        currentSeason: getCurrentSeason(),
        targetOccasion: outfit.occasion
      });
      setFitScore(score);
      trackOutfitAnalytics(outfit._id || outfit.id, { type: 'tryOn' });
    }
  }, [outfit, userProfile]);

  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  };

  const handleCustomBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newBg = {
          id: Date.now(),
          name: file.name,
          url: event.target.result
        };
        
        const updated = [...customBackgrounds, newBg];
        setCustomBackgrounds(updated);
        localStorage.setItem('snapfit_custom_backgrounds', JSON.stringify(updated));
        setCustomBackground(newBg.url);
        setBackground('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const deleteCustomBackground = (id) => {
    const updated = customBackgrounds.filter(bg => bg.id !== id);
    setCustomBackgrounds(updated);
    localStorage.setItem('snapfit_custom_backgrounds', JSON.stringify(updated));
    if (background === 'custom' && customBackground === customBackgrounds.find(bg => bg.id === id)?.url) {
      setBackground('neutral');
      setCustomBackground(null);
    }
  };

  // Handle rotation drag
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      const delta = e.clientX - dragStart;
      setRotation((prev) => (prev + delta * 0.5) % 360);
      setDragStart(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  // Attach native wheel event to clothing items to properly prevent scroll
  useEffect(() => {
    if (!isPositioningMode) return;
    
    // Small delay to ensure elements are rendered
    const timer = setTimeout(() => {
      const clothingElements = document.querySelectorAll('.clothing-item-positioning');
      
      const handleNativeWheel = (e) => {
        e.preventDefault();
        e.stopPropagation();
      };
      
      clothingElements.forEach(el => {
        el.addEventListener('wheel', handleNativeWheel, { passive: false });
      });
      
      return () => {
        clothingElements.forEach(el => {
          el.removeEventListener('wheel', handleNativeWheel);
        });
      };
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isPositioningMode, outfit?.items]);

  // Touch support for mobile
  const handleTouchStart = (e) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      const delta = e.touches[0].clientX - dragStart;
      setRotation((prev) => (prev + delta * 0.5) % 360);
      setDragStart(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Get view label based on rotation
  const getViewLabel = () => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    if (normalizedRotation < 30 || normalizedRotation >= 330) return '👤 Front View';
    if (normalizedRotation >= 30 && normalizedRotation < 60) return '↗️ Front-Right';
    if (normalizedRotation >= 60 && normalizedRotation < 120) return '➡️ Right Side';
    if (normalizedRotation >= 120 && normalizedRotation < 150) return '↘️ Back-Right';
    if (normalizedRotation >= 150 && normalizedRotation < 210) return '🔄 Back View';
    if (normalizedRotation >= 210 && normalizedRotation < 240) return '↙️ Back-Left';
    if (normalizedRotation >= 240 && normalizedRotation < 300) return '⬅️ Left Side';
    return '↖️ Front-Left';
  };

  /**
   * Get the appropriate body photo URL based on current rotation angle
   * Uses multi-angle photos when available for smooth 360° experience
   */
  const getBodyPhotoForRotation = () => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    
    // Check which photos are available
    const photos = {
      front: userProfile?.body_photo_front || userProfile?.body_photo_url,
      back: userProfile?.body_photo_back,
      left: userProfile?.body_photo_left,
      right: userProfile?.body_photo_right
    };
    
    // Determine which photo to show based on rotation
    if (normalizedRotation < 45 || normalizedRotation >= 315) {
      // Front view (315° to 45°)
      return photos.front;
    } else if (normalizedRotation >= 45 && normalizedRotation < 135) {
      // Right side (45° to 135°)
      return photos.right || photos.front;
    } else if (normalizedRotation >= 135 && normalizedRotation < 225) {
      // Back view (135° to 225°)
      return photos.back || photos.front;
    } else {
      // Left side (225° to 315°)
      return photos.left || photos.front;
    }
  };

  /**
   * Get the current view angle name for display
   */
  const getCurrentViewAngle = () => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    if (normalizedRotation < 45 || normalizedRotation >= 315) return 'front';
    if (normalizedRotation >= 45 && normalizedRotation < 135) return 'right';
    if (normalizedRotation >= 135 && normalizedRotation < 225) return 'back';
    return 'left';
  };

  /**
   * Check if we have all multi-angle photos for seamless 360°
   */
  const hasAllAngles = () => {
    return !!(
      (userProfile?.body_photo_front || userProfile?.body_photo_url) &&
      userProfile?.body_photo_back &&
      userProfile?.body_photo_left &&
      userProfile?.body_photo_right
    );
  };

  /**
   * Check if current view has a photo or is using fallback
   */
  const currentViewHasPhoto = () => {
    const angle = getCurrentViewAngle();
    if (angle === 'front') return !!(userProfile?.body_photo_front || userProfile?.body_photo_url);
    if (angle === 'back') return !!userProfile?.body_photo_back;
    if (angle === 'left') return !!userProfile?.body_photo_left;
    if (angle === 'right') return !!userProfile?.body_photo_right;
    return false;
  };

  // Fit score helper functions
  const formatScoreLabel = (key) => {
    const labels = {
      bodyType: 'Body Match',
      measurements: '📏 Fit',
      colorMatch: 'Colors',
      seasonality: 'Season',
      occasion: 'Occasion',
      styleCoherence: 'Style',
      completeness: 'Complete'
    };
    return labels[key] || key;
  };

  const getMaxScore = (key) => {
    const maxScores = {
      bodyType: 15,
      measurements: 20,
      colorMatch: 15,
      seasonality: 15,
      occasion: 15,
      styleCoherence: 10,
      completeness: 10
    };
    return maxScores[key] || 10;
  };

  const getScoreColor = (value, max) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };
  
  // Clothing positioning handlers - optimized for smooth performance
  const handleClothingMouseDown = useCallback((e, itemType) => {
    if (!isPositioningMode || rotation !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    
    // Get current position of the item (from state or defaults)
    const currentPos = clothingPositions[itemType] || { x: 0, y: 25 };
    
    // Calculate where the mouse clicked relative to the container
    const mouseXPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100 - 50;
    const mouseYPercent = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    // Store the offset between mouse position and item position
    setDragOffset({
      x: mouseXPercent - currentPos.x,
      y: mouseYPercent - currentPos.y
    });
    
    setDraggingItem(itemType);
  }, [isPositioningMode, rotation, clothingPositions]);

  const handleClothingMouseMove = useCallback((e) => {
    if (!draggingItem || !isPositioningMode) return;
    
    // Cancel any pending animation frame
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // Use requestAnimationFrame for smooth updates
    rafRef.current = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      
      // Calculate mouse position as percentage of container
      const mouseXPercent = ((e.clientX - rect.left) / rect.width) * 100 - 50;
      const mouseYPercent = ((e.clientY - rect.top) / rect.height) * 100;
      
      // Subtract the offset to get the item position
      const x = mouseXPercent - dragOffset.x;
      const y = mouseYPercent - dragOffset.y;
      
      // Wide bounds for full positioning freedom (negative values allowed)
      const clampedX = Math.max(-100, Math.min(100, x));
      const clampedY = Math.max(-20, Math.min(100, y));
      
      setClothingPositions(prev => ({
        ...prev,
        [draggingItem]: { x: clampedX, y: clampedY }
      }));
    });
  }, [draggingItem, isPositioningMode, dragOffset]);

  const handleClothingMouseUp = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    setDraggingItem(null);
  }, []);

  // Global mouse events for smoother dragging
  useEffect(() => {
    if (draggingItem) {
      const handleGlobalMove = (e) => handleClothingMouseMove(e);
      const handleGlobalUp = () => handleClothingMouseUp();
      
      document.addEventListener('mousemove', handleGlobalMove);
      document.addEventListener('mouseup', handleGlobalUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMove);
        document.removeEventListener('mouseup', handleGlobalUp);
      };
    }
  }, [draggingItem, handleClothingMouseMove, handleClothingMouseUp]);

  // Clothing size adjustment with +/- buttons
  const handleScaleIncrease = useCallback((itemType) => {
    if (!isPositioningMode || rotation !== 0) return;
    const currentScale = scaleRef.current[itemType] || 1.0;
    const newScale = Math.min(2.5, currentScale + 0.01);
    setClothingScales(prev => ({
      ...prev,
      [itemType]: newScale
    }));
  }, [isPositioningMode, rotation]);

  const handleScaleDecrease = useCallback((itemType) => {
    if (!isPositioningMode || rotation !== 0) return;
    const currentScale = scaleRef.current[itemType] || 1.0;
    const newScale = Math.max(0.4, currentScale - 0.01);
    setClothingScales(prev => ({
      ...prev,
      [itemType]: newScale
    }));
  }, [isPositioningMode, rotation]);

  // Touch events for pinch-to-scale on mobile
  const handleClothingTouchStart = (e, itemType) => {
    if (!isPositioningMode || rotation !== 0) return;
    if (e.touches.length === 2) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setPinchDistance(distance);
      setHoveredItem(itemType);
    }
  };

  const handleClothingTouchMove = (e, itemType) => {
    if (!isPositioningMode || rotation !== 0) return;
    if (e.touches.length === 2 && pinchDistance) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      
      const scaleDelta = (distance - pinchDistance) / 200; // Sensitivity adjustment
      const currentScale = getClothingScale(itemType);
      const newScale = Math.max(0.5, Math.min(2.0, currentScale + scaleDelta));
      
      setClothingScales(prev => ({
        ...prev,
        [itemType]: newScale
      }));
      
      setPinchDistance(distance);
    }
  };

  const handleClothingTouchEnd = () => {
    setPinchDistance(null);
    setHoveredItem(null);
  };

  const saveClothingPositions = () => {
    const outfitId = outfit._id || outfit.id || 'temp';
    localStorage.setItem(`snapfit_positions_${outfitId}`, JSON.stringify(clothingPositions));
    alert('✅ Clothing positions saved!');
    console.log('💾 Saved positions:', clothingPositions);
  };

  const resetClothingPositions = () => {
    setClothingPositions({});
    const outfitId = outfit._id || outfit.id || 'temp';
    localStorage.removeItem(`snapfit_positions_${outfitId}`);
    alert('🔄 Positions reset to default');
  };

  /**
   * AI-Powered Auto-Fit Function
   * Automatically adjusts clothing item sizes to better fit the body photo
   * Uses body measurements and photo dimensions for intelligent scaling
   */
  const autoFitClothing = useCallback(() => {
    console.log('🤖 Auto-fitting clothing to body...');
    console.log('📦 Outfit items:', outfit?.items);
    
    if (!outfit?.items || outfit.items.length === 0) {
      alert('⚠️ No clothing items to fit');
      return;
    }
    
    // Get body photo element
    const bodyPhotoImg = document.querySelector('.user-body-photo img');
    if (!bodyPhotoImg) {
      console.warn('⚠️ No body photo found for auto-fit, using defaults');
      // Use default dimensions if no body photo
      const defaultScales = {};
      outfit.items.forEach(item => {
        const itemType = item.type?.toLowerCase() || '';
        if (['shirt', 'jacket', 'top', 'hoodie', 'sweater', 't-shirt', 'blouse', 'dress'].includes(itemType)) {
          defaultScales['top'] = 0.85;
        } else if (['pants', 'shorts', 'skirt', 'bottom', 'jeans'].includes(itemType)) {
          defaultScales['bottom'] = 0.8;
        } else if (itemType === 'hat') {
          defaultScales['hat'] = 0.7;
        } else if (itemType === 'shoes') {
          defaultScales['shoes'] = 0.75;
        } else {
          // For unknown types, add with index
          defaultScales[`unknown-${outfit.items.indexOf(item)}`] = 0.85;
        }
      });
      setClothingScales(defaultScales);
      alert('✨ Default fit applied! Use positioning mode to adjust.');
      return;
    }

    // Calculate body dimensions from photo
    const bodyHeight = bodyPhotoImg.naturalHeight || bodyPhotoImg.offsetHeight;
    const bodyWidth = bodyPhotoImg.naturalWidth || bodyPhotoImg.offsetWidth;
    const displayHeight = bodyPhotoImg.offsetHeight;
    const displayWidth = bodyPhotoImg.offsetWidth;
    
    console.log('📏 Body dimensions:', { bodyHeight, bodyWidth, displayHeight, displayWidth });

    if (displayWidth === 0 || displayHeight === 0) {
      alert('⚠️ Could not read body photo dimensions. Try again.');
      return;
    }

    // Store body dimensions for future use
    setBodyDimensions({ bodyHeight, bodyWidth, displayHeight, displayWidth });

    // Define intelligent scaling based on body type and measurements
    const newScales = {};
    const newPositions = {};
    
    // Use user measurements if available, otherwise use photo proportions
    const shoulderWidth = userProfile?.shoulder_width || (bodyWidth * 0.35);
    const torsoHeight = userProfile?.chest_circumference ? 
      (userProfile.chest_circumference / 3.14) : (bodyHeight * 0.35);
    const waistWidth = userProfile?.waist_circumference ? 
      (userProfile.waist_circumference / 3.14) : (bodyWidth * 0.28);
    const legLength = bodyHeight * 0.48; // Approximate leg length
    
    // Calculate scale factors for different clothing types
    outfit.items.forEach((item, index) => {
      let scaleFactor = 1.0;
      let itemKey = item.type?.toLowerCase() || `unknown-${index}`;
      
      const itemType = item.type?.toLowerCase() || '';
      
      switch(itemType) {
        case 'hat':
          scaleFactor = Math.min(1.2, (displayHeight * 0.15) / 140);
          newPositions['hat'] = { x: 0, y: 2 };
          break;
          
        case 'shirt':
        case 'jacket':
        case 'top':
        case 'hoodie':
        case 'sweater':
        case 't-shirt':
        case 'blouse':
        case 'dress':
          itemKey = 'top';
          const topBaseline = 280;
          scaleFactor = (displayWidth * 0.9) / topBaseline;
          
          if (userProfile?.body_type === 'athletic') scaleFactor *= 0.95;
          if (userProfile?.body_type === 'curvy') scaleFactor *= 1.08;
          if (userProfile?.body_type === 'slim') scaleFactor *= 0.92;
          
          newPositions['top'] = { x: 0, y: 18 };
          break;
          
        case 'pants':
        case 'shorts':
        case 'skirt':
        case 'bottom':
        case 'jeans':
        case 'leggings':
          itemKey = 'bottom';
          const bottomBaseline = 230;
          scaleFactor = (displayWidth * 0.75) / bottomBaseline;
          
          if (userProfile?.body_type === 'athletic') scaleFactor *= 0.98;
          if (userProfile?.body_type === 'curvy') scaleFactor *= 1.05;
          
          newPositions['bottom'] = { x: 0, y: 45 };
          break;
          
        case 'shoes':
        case 'sneakers':
        case 'boots':
          scaleFactor = (displayWidth * 0.6) / 200;
          newPositions['shoes'] = { x: 0, y: 85 };
          break;
          
        default:
          // For unknown types, apply reasonable default
          itemKey = `unknown-${index}`;
          scaleFactor = (displayWidth * 0.9) / 280;
          newPositions[itemKey] = { x: 0, y: 25 };
      }
      
      // Clamp scale factor to reasonable bounds
      scaleFactor = Math.max(0.5, Math.min(1.6, scaleFactor));
      
      newScales[itemKey] = scaleFactor;
      console.log(`📐 ${item.type || 'unknown'} (key: ${itemKey}): scale = ${scaleFactor.toFixed(2)}`);
    });
    
    // Apply scales and positions
    setClothingScales(newScales);
    setClothingPositions(newPositions);
    
    // Save to localStorage
    const outfitId = outfit._id || outfit.id || 'temp';
    localStorage.setItem(`snapfit_scales_${outfitId}`, JSON.stringify(newScales));
    localStorage.setItem(`snapfit_positions_${outfitId}`, JSON.stringify(newPositions));
    
    console.log('✅ Auto-fit complete!', { scales: newScales, positions: newPositions });
    alert('✨ Clothing auto-fitted! Use positioning mode to fine-tune.');
  }, [outfit, userProfile]);

  const resetClothingScales = useCallback(() => {
    setClothingScales({});
    const outfitId = outfit._id || outfit.id || 'temp';
    localStorage.removeItem(`snapfit_scales_${outfitId}`);
    console.log('🔄 Clothing scales reset');
    alert('🔄 Auto-fit reset to defaults');
  }, [outfit]);

  const getClothingScale = useCallback((itemType) => {
    return clothingScales[itemType] || 1.0;
  }, [clothingScales]);

  const getClothingPosition = useCallback((itemType, defaultTop) => {
    const saved = clothingPositions[itemType];
    if (saved) {
      return {
        top: `${saved.y}%`,
        left: `${saved.x + 50}%` // Offset by 50% since we use translateX(-50%)
      };
    }
    return { top: defaultTop, left: '50%' };
  }, [clothingPositions]);

  // Calculate item positions based on rotation with better 3D effect
  const getItemStyle = (type, rotation) => {
    const angle = (rotation * Math.PI) / 180;
    const perspective = Math.cos(angle); // -1 (back) to 1 (front)
    
    // Items become narrower when viewed from side
    const scaleX = 0.4 + Math.abs(perspective) * 0.6;
    
    // Adjust opacity for depth
    const opacity = 0.8 + Math.abs(perspective) * 0.2;
    
    // Positioning based on item type
    let position = {};
    switch(type) {
      case 'hat':
        position = { top: '8%', width: '25%' };
        break;
      case 'top':
      case 'jacket':
      case 'shirt':
      case 'dress':
        position = { top: '22%', width: '45%' };
        break;
      case 'bottom':
      case 'pants':
      case 'shorts':
      case 'skirt':
        position = { top: '48%', width: '38%' };
        break;
      case 'shoes':
        position = { top: '75%', width: '30%' };
        break;
      case 'accessory':
      case 'watch':
      case 'bracelet':
        // Position on wrist area
        position = { top: '48%', left: rotation > 180 ? '85%' : '15%', width: '12%' };
        break;
      case 'necklace':
      case 'chain':
        // Position on neck/chest area
        position = { top: '18%', left: '50%', width: '20%', transform: 'translateX(-50%)' };
        break;
      default:
        position = { top: '30%', width: '40%' };
    }
    
    return {
      ...position,
      transform: `scaleX(${scaleX}) scale(${zoom}) rotateY(${rotation * 0.3}deg)`,
      opacity,
      transition: isDragging ? 'none' : 'transform 0.3s ease-out, opacity 0.3s ease'
    };
  };

  // Get Cher-style silhouette (Clueless inspired - feminine, fashionable)
  const getSilhouetteSVG = () => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const isSideView = (normalizedRotation >= 45 && normalizedRotation < 135) || 
                       (normalizedRotation >= 225 && normalizedRotation < 315);
    
    if (isSideView) {
      // Side profile - slim, elegant with extended arm for watches
      return (
        <svg viewBox="0 0 120 320" className="silhouette-svg" style={{ filter: 'drop-shadow(0 6px 20px rgba(139, 92, 246, 0.15))' }}>
          {/* Head with hair */}
          <ellipse cx="55" cy="30" rx="18" ry="24" fill="rgba(216, 180, 254, 0.4)" />
          {/* Neck - visible for chains */}
          <rect x="51" y="50" width="10" height="20" fill="rgba(196, 181, 253, 0.35)" rx="4" />
          <circle cx="56" cy="55" r="3" fill="rgba(139, 92, 246, 0.2)" />
          {/* Shoulders curve */}
          <path d="M 55 68 Q 59 75 57 85" stroke="rgba(167, 139, 250, 0.4)" strokeWidth="20" fill="none" strokeLinecap="round" />
          {/* Torso - slim waist */}
          <path d="M 57 85 Q 55 110 53 135 Q 52 155 55 175" 
                stroke="rgba(167, 139, 250, 0.4)" strokeWidth="24" fill="none" strokeLinecap="round" />
          {/* Arm extended forward for watches/bracelets */}
          <path d="M 59 80 Q 75 95 85 110 Q 88 118 90 128" 
                stroke="rgba(196, 181, 253, 0.35)" strokeWidth="10" fill="none" strokeLinecap="round" />
          {/* Hand/wrist area */}
          <ellipse cx="91" cy="132" rx="6" ry="8" fill="rgba(196, 181, 253, 0.3)" />
          {/* Hips */}
          <ellipse cx="55" cy="180" rx="16" ry="12" fill="rgba(167, 139, 250, 0.25)" />
          {/* Legs - long and slim */}
          <path d="M 53 190 L 51 250 L 49 295 M 57 190 L 59 250 L 61 295" 
                stroke="rgba(167, 139, 250, 0.4)" strokeWidth="13" strokeLinecap="round" />
          {/* Feet with shoes */}
          <ellipse cx="49" cy="300" rx="10" ry="6" fill="rgba(167, 139, 250, 0.35)" />
          <ellipse cx="61" cy="300" rx="10" ry="6" fill="rgba(167, 139, 250, 0.35)" />
        </svg>
      );
    } else {
      // Front - Cher Horowitz style with visible arms and neck for accessories
      return (
        <svg viewBox="0 0 160 320" className="silhouette-svg" style={{ filter: 'drop-shadow(0 6px 20px rgba(139, 92, 246, 0.15))' }}>
          {/* Head with styled hair */}
          <ellipse cx="80" cy="30" rx="24" ry="26" fill="rgba(216, 180, 254, 0.4)" />
          <path d="M 60 25 Q 55 30 58 35 M 100 25 Q 105 30 102 35" stroke="rgba(216, 180, 254, 0.5)" strokeWidth="6" fill="none" strokeLinecap="round" />
          {/* Neck - prominent for necklaces/chains */}
          <rect x="70" y="52" width="20" height="22" fill="rgba(196, 181, 253, 0.35)" rx="6" />
          {/* Collarbone area */}
          <path d="M 65 72 Q 80 70 95 72" stroke="rgba(167, 139, 250, 0.25)" strokeWidth="3" strokeLinecap="round" />
          {/* Shoulders - feminine curve */}
          <path d="M 52 78 Q 48 82 46 88 M 108 78 Q 112 82 114 88" 
                stroke="rgba(167, 139, 250, 0.4)" strokeWidth="16" strokeLinecap="round" />
          {/* Upper torso */}
          <ellipse cx="80" cy="95" rx="34" ry="18" fill="rgba(167, 139, 250, 0.25)" />
          {/* Waist - defined */}
          <ellipse cx="80" cy="130" rx="24" ry="20" fill="rgba(167, 139, 250, 0.3)" />
          {/* Hips - feminine curve */}
          <ellipse cx="80" cy="170" rx="30" ry="22" fill="rgba(167, 139, 250, 0.28)" />
          {/* Arms - extended and visible for watches/bracelets */}
          <path d="M 46 88 Q 32 110 28 135 L 26 150" 
                stroke="rgba(196, 181, 253, 0.35)" strokeWidth="12" strokeLinecap="round" />
          <path d="M 114 88 Q 128 110 132 135 L 134 150" 
                stroke="rgba(196, 181, 253, 0.35)" strokeWidth="12" strokeLinecap="round" />
          {/* Hands/wrists */}
          <ellipse cx="26" cy="155" rx="7" ry="10" fill="rgba(196, 181, 253, 0.3)" />
          <ellipse cx="134" cy="155" rx="7" ry="10" fill="rgba(196, 181, 253, 0.3)" />
          {/* Legs - long and slim like Cher */}
          <path d="M 66 185 L 62 250 L 60 298 M 94 185 L 98 250 L 100 298" 
                stroke="rgba(167, 139, 250, 0.4)" strokeWidth="16" strokeLinecap="round" />
          {/* Feet with shoes */}
          <ellipse cx="60" cy="304" rx="11" ry="6" fill="rgba(167, 139, 250, 0.35)" />
          <ellipse cx="100" cy="304" rx="11" ry="6" fill="rgba(167, 139, 250, 0.35)" />
        </svg>
      );
    }
  };

  return (
    <div className="fitting-room-overlay" onClick={onClose}>
      <div 
        className={`fitting-room-modal enhanced ${isPositioningMode ? 'positioning-active' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header - Compact */}
        <div className="fitting-room-header">
          <h3>Virtual Fitting Room</h3>
          
          <div className="fitting-room-controls">
            <select 
              value={background} 
              onChange={(e) => {
                setBackground(e.target.value);
                if (e.target.value.startsWith('custom-')) {
                  const bgId = parseInt(e.target.value.split('-')[1]);
                  const bg = customBackgrounds.find(b => b.id === bgId);
                  if (bg) setCustomBackground(bg.url);
                }
              }}
              className="bg-selector"
            >
              <option value="neutral">🎨 Neutral</option>
              <option value="studio">📸 Studio</option>
              <option value="bedroom">🛏️ Bedroom</option>
              <option value="beach">🏖️ Beach</option>
              <option value="woods">🌲 Woods</option>
              <option value="city">🏙️ City</option>
              <option value="closet">👔 Closet</option>
              <option value="mirror">🪞 Mirror</option>
              <option value="outdoor">🌳 Outdoor</option>
              {customBackgrounds.length > 0 && <option disabled>──────────</option>}
              {customBackgrounds.map(bg => (
                <option key={bg.id} value={`custom-${bg.id}`}>🖼️ {bg.name.slice(0, 20)}</option>
              ))}
            </select>
            {/* Background preview thumbnails for quick selection */}
            <div className="bg-thumbs" role="list" aria-label="Background presets">
              {['neutral','studio','bedroom','beach','woods','city','closet','mirror','outdoor'].map((key) => (
                <button
                  key={key}
                  type="button"
                  role="listitem"
                  className={`bg-thumb ${background === key ? 'active' : ''} bg-${key}`}
                  title={key}
                  onClick={() => setBackground(key)}
                />
              ))}
              {customBackgrounds.map(bg => (
                <button key={'custom-'+bg.id} className="bg-thumb custom-thumb" title={bg.name} onClick={() => { setBackground('custom'); setCustomBackground(bg.url); }} style={{ backgroundImage: `url(${bg.url})`, backgroundSize: 'cover' }} />
              ))}
            </div>
            <label className="upload-bg-btn" title="Upload custom background">
              📤
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleCustomBackgroundUpload}
                style={{ display: 'none' }}
              />
            </label>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Main Content */}
        <div className="fitting-room-content">
          
          {/* 3D Fitting View */}
          <div 
            ref={containerRef}
            className={`body-template enhanced ${background.startsWith('custom-') ? 'bg-custom' : `bg-${background}`}`}
            onMouseDown={!isPositioningMode ? handleMouseDown : undefined}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
              cursor: isPositioningMode ? (draggingItem ? 'grabbing' : 'default') : (isDragging ? 'grabbing' : 'grab'),
              backgroundImage: background.startsWith('custom-') && customBackground ? `url(${customBackground})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              maxHeight: '80vh',
              height: 'auto',
              overflow: 'auto',
              borderRadius: '12px'
            }}
          >
            <div className="rotation-hint">
              {!isDragging && !isPositioningMode && (
                <span>👆 Drag to rotate • {Math.round(rotation)}° • {getViewLabel()}</span>
              )}
            </div>
            
            {/* Multi-angle photo indicator */}
            {(userProfile?.body_photo_front || userProfile?.body_photo_url) && (
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: hasAllAngles() ? 'rgba(16, 185, 129, 0.95)' : 'rgba(245, 158, 11, 0.95)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                {hasAllAngles() ? (
                  <>
                    <span>360°</span>
                    <span style={{ opacity: 0.8 }}>All angles</span>
                  </>
                ) : (
                  <>
                    <span>{getCurrentViewAngle().charAt(0).toUpperCase() + getCurrentViewAngle().slice(1)}</span>
                    {!currentViewHasPhoto() && <span style={{ opacity: 0.8 }}>(using front)</span>}
                  </>
                )}
              </div>
            )}

            {/* Avatar Container with Clothing Overlay */}
            <div className="avatar-container" style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              minHeight: '80vh',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: '20px'
            }}>
              
              {/* Wrapper for body photo and clothing overlay */}
              <div style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'flex-start',
                justifyContent: 'center'
              }}>
              
              {/* User Body Photo - MULTI-ANGLE DISPLAY */}
              {(userProfile?.body_photo_front || userProfile?.body_photo_url) && (
                <div 
                  className="user-body-photo"
                  style={{
                    position: 'relative',
                    transform: hasAllAngles() ? `scale(${zoom})` : `rotateY(${rotation}deg) scale(${zoom})`,
                    transition: isDragging ? 'none' : 'transform 0.3s ease',
                    zIndex: 1,
                    transformStyle: 'preserve-3d',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center'
                  }}
                >
                  <img 
                    src={getBodyPhotoForRotation()} 
                    alt={`Your body - ${getCurrentViewAngle()} view`}
                    key={getCurrentViewAngle()} // Force re-render on angle change
                    style={{
                      maxHeight: '78vh',
                      maxWidth: '95%',
                      height: 'auto',
                      width: 'auto',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                      display: 'block',
                      objectFit: 'contain',
                      // Smooth transition between photos
                      transition: 'opacity 0.2s ease'
                    }}
                    onError={(e) => {
                      console.error('❌ Failed to load body photo:', getBodyPhotoForRotation());
                      // Fallback to front photo if available
                      const frontPhoto = userProfile?.body_photo_front || userProfile?.body_photo_url;
                      if (e.target.src !== frontPhoto && frontPhoto) {
                        e.target.src = frontPhoto;
                      } else {
                        e.target.style.display = 'none';
                      }
                    }}
                    onLoad={(e) => {
                      console.log(`✅ Body photo loaded (${getCurrentViewAngle()} view)`);
                      console.log('📐 Photo dimensions:', e.target.offsetWidth, 'x', e.target.offsetHeight);
                    }}
                  />
                  
                  {/* Show indicator if using fallback photo */}
                  {!currentViewHasPhoto() && !hasAllAngles() && (
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      whiteSpace: 'nowrap'
                    }}>
                      📸 Add {getCurrentViewAngle()} view in Settings for better fit
                    </div>
                  )}
                </div>
              )}
              
              {/* Silhouette (if no body photo) - Cher-style feminine silhouette */}
              {!(userProfile?.body_photo_front || userProfile?.body_photo_url) && (
                <div 
                  className="body-silhouette-3d"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '180px',
                    height: '450px',
                    zIndex: 1
                  }}
                >
                  {getSilhouetteSVG()}
                </div>
              )}

              {/* Clothing Layers Overlay */}
              
              {/* Hat/Headwear */}
              {outfit.items.find(i => i.type === 'hat') && (
                <div 
                  onMouseDown={(e) => handleClothingMouseDown(e, 'hat')}
                  onTouchStart={(e) => handleClothingTouchStart(e, 'hat')}
                  onTouchMove={(e) => handleClothingTouchMove(e, 'hat')}
                  onTouchEnd={handleClothingTouchEnd}
                  onMouseEnter={() => setHoveredItem('hat')}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={isPositioningMode && rotation === 0 ? 'clothing-item-positioning' : ''}
                  style={{
                  position: 'absolute',
                  ...getClothingPosition('hat', userProfile?.body_photo_url ? '5%' : '12%'),
                  transform: `translateX(-50%) ${getItemStyle('hat', rotation).transform} scale(${getClothingScale('hat')})`,
                  width: userProfile?.body_photo_url ? '140px' : '100px',
                  height: 'auto',
                  zIndex: 7,
                  pointerEvents: isPositioningMode && rotation === 0 ? 'auto' : 'none',
                  cursor: isPositioningMode && rotation === 0 ? 'move' : 'default',
                  opacity: getItemStyle('hat', rotation).opacity,
                  transition: draggingItem === 'hat' ? 'none' : (isDragging ? 'none' : 'all 0.3s ease-out')
                }}>
                  <img 
                    src={outfit.items.find(i => i.type === 'hat').image_url} 
                    alt="hat"
                    style={{
                      width: '100%',
                      height: 'auto',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                      mixBlendMode: 'darken',
                      pointerEvents: 'none'
                    }}
                  />
                  {isPositioningMode && rotation === 0 && (
                    <>
                      <div className="clothing-crosshair-center"></div>
                      {hoveredItem === 'hat' && (
                        <div className="clothing-scale-controls">
                          <button 
                            className="scale-btn scale-btn-minus"
                            onClick={(e) => { e.stopPropagation(); handleScaleDecrease('hat'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >−</button>
                          <span className="scale-value">{Math.round(getClothingScale('hat') * 100)}%</span>
                          <button 
                            className="scale-btn scale-btn-plus"
                            onClick={(e) => { e.stopPropagation(); handleScaleIncrease('hat'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >+</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Top/Shirt/Jacket/Hoodie - TORSO */}
              {outfit.items.find(i => ['shirt', 'jacket', 'dress', 'top', 'hoodie', 'sweater', 't-shirt', 'blouse'].includes(i.type)) && (
                <div 
                  onMouseDown={(e) => handleClothingMouseDown(e, 'top')}
                  onTouchStart={(e) => handleClothingTouchStart(e, 'top')}
                  onTouchMove={(e) => handleClothingTouchMove(e, 'top')}
                  onTouchEnd={handleClothingTouchEnd}
                  onMouseEnter={() => setHoveredItem('top')}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={isPositioningMode && rotation === 0 ? 'clothing-item-positioning' : ''}
                  style={{
                  position: 'absolute',
                  ...getClothingPosition('top', userProfile?.body_photo_url ? '25%' : '28%'),
                  transform: `translateX(-50%) ${getItemStyle(outfit.items.find(i => ['shirt', 'jacket', 'dress', 'top', 'hoodie', 'sweater', 't-shirt', 'blouse'].includes(i.type)).type, rotation).transform} scale(${getClothingScale('top')})`,
                  width: userProfile?.body_photo_url ? '280px' : '200px',
                  height: 'auto',
                  zIndex: 5,
                  pointerEvents: isPositioningMode && rotation === 0 ? 'auto' : 'none',
                  cursor: isPositioningMode && rotation === 0 ? 'move' : 'default',
                  opacity: userProfile?.body_photo_url ? 0.9 : getItemStyle(outfit.items.find(i => ['shirt', 'jacket', 'dress', 'top', 'hoodie', 'sweater', 't-shirt', 'blouse'].includes(i.type)).type, rotation).opacity,
                  transition: draggingItem === 'top' ? 'none' : (isDragging ? 'none' : 'all 0.3s ease-out')
                }}>
                  <img 
                    src={outfit.items.find(i => ['shirt', 'jacket', 'dress', 'top', 'hoodie', 'sweater', 't-shirt', 'blouse'].includes(i.type)).image_url} 
                    alt="top"
                    style={{
                      width: '100%',
                      height: 'auto',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                      mixBlendMode: 'multiply',
                      isolation: 'isolate',
                      pointerEvents: 'none'
                    }}
                  />
                  {isPositioningMode && rotation === 0 && (
                    <>
                      <div className="clothing-crosshair-center"></div>
                      {hoveredItem === 'top' && (
                        <div className="clothing-scale-controls">
                          <button 
                            className="scale-btn scale-btn-minus"
                            onClick={(e) => { e.stopPropagation(); handleScaleDecrease('top'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >−</button>
                          <span className="scale-value">{Math.round(getClothingScale('top') * 100)}%</span>
                          <button 
                            className="scale-btn scale-btn-plus"
                            onClick={(e) => { e.stopPropagation(); handleScaleIncrease('top'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >+</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Bottoms - LEGS (pants, shorts, skirt) */}
              {outfit.items.find(i => ['pants', 'shorts', 'skirt', 'bottom', 'jeans'].includes(i.type)) && (
                <div 
                  onMouseDown={(e) => handleClothingMouseDown(e, 'bottom')}
                  onTouchStart={(e) => handleClothingTouchStart(e, 'bottom')}
                  onTouchMove={(e) => handleClothingTouchMove(e, 'bottom')}
                  onTouchEnd={handleClothingTouchEnd}
                  onMouseEnter={() => setHoveredItem('bottom')}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={isPositioningMode && rotation === 0 ? 'clothing-item-positioning' : ''}
                  style={{
                  position: 'absolute',
                  ...getClothingPosition('bottom', userProfile?.body_photo_url ? '48%' : '52%'),
                  transform: `translateX(-50%) ${getItemStyle(outfit.items.find(i => ['pants', 'shorts', 'skirt', 'bottom', 'jeans'].includes(i.type)).type, rotation).transform} scale(${getClothingScale('bottom')})`,
                  width: userProfile?.body_photo_url ? '230px' : '180px',
                  height: 'auto',
                  zIndex: 4,
                  pointerEvents: isPositioningMode && rotation === 0 ? 'auto' : 'none',
                  cursor: isPositioningMode && rotation === 0 ? 'move' : 'default',
                  opacity: userProfile?.body_photo_url ? 0.9 : getItemStyle(outfit.items.find(i => ['pants', 'shorts', 'skirt', 'bottom', 'jeans'].includes(i.type)).type, rotation).opacity,
                  transition: draggingItem === 'bottom' ? 'none' : (isDragging ? 'none' : 'all 0.3s ease-out')
                }}>
                  <img 
                    src={outfit.items.find(i => ['pants', 'shorts', 'skirt', 'bottom', 'jeans'].includes(i.type)).image_url} 
                    alt="bottom"
                    style={{
                      width: '100%',
                      height: 'auto',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3)) brightness(1.05)',
                      mixBlendMode: 'multiply',
                      isolation: 'isolate',
                      pointerEvents: 'none'
                    }}
                  />
                  {isPositioningMode && rotation === 0 && (
                    <>
                      <div className="clothing-crosshair-center"></div>
                      {hoveredItem === 'bottom' && (
                        <div className="clothing-scale-controls scale-controls-bottom">
                          <button 
                            className="scale-btn scale-btn-minus"
                            onClick={(e) => { e.stopPropagation(); handleScaleDecrease('bottom'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >−</button>
                          <span className="scale-value">{Math.round(getClothingScale('bottom') * 100)}%</span>
                          <button 
                            className="scale-btn scale-btn-plus"
                            onClick={(e) => { e.stopPropagation(); handleScaleIncrease('bottom'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >+</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Shoes - FEET */}
              {outfit.items.find(i => i.type === 'shoes') && (
                <div 
                  onMouseDown={(e) => handleClothingMouseDown(e, 'shoes')}
                  onTouchStart={(e) => handleClothingTouchStart(e, 'shoes')}
                  onTouchMove={(e) => handleClothingTouchMove(e, 'shoes')}
                  onTouchEnd={handleClothingTouchEnd}
                  onMouseEnter={() => setHoveredItem('shoes')}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={isPositioningMode && rotation === 0 ? 'clothing-item-positioning' : ''}
                  style={{
                  position: 'absolute',
                  ...getClothingPosition('shoes', userProfile?.body_photo_url ? '88%' : '82%'),
                  transform: `translateX(-50%) ${getItemStyle('shoes', rotation).transform} scale(${getClothingScale('shoes')})`,
                  width: userProfile?.body_photo_url ? '200px' : '140px',
                  height: 'auto',
                  zIndex: 3,
                  pointerEvents: isPositioningMode && rotation === 0 ? 'auto' : 'none',
                  cursor: isPositioningMode && rotation === 0 ? 'move' : 'default',
                  opacity: getItemStyle('shoes', rotation).opacity,
                  transition: draggingItem === 'shoes' ? 'none' : (isDragging ? 'none' : 'all 0.3s ease-out')
                }}>
                  <img 
                    src={outfit.items.find(i => i.type === 'shoes').image_url} 
                    alt="shoes"
                    style={{
                      width: '100%',
                      height: 'auto',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))',
                      mixBlendMode: 'darken',
                      pointerEvents: 'none'
                    }}
                  />
                  {isPositioningMode && rotation === 0 && (
                    <>
                      <div className="clothing-crosshair-center"></div>
                      {hoveredItem === 'shoes' && (
                        <div className="clothing-scale-controls scale-controls-bottom">
                          <button 
                            className="scale-btn scale-btn-minus"
                            onClick={(e) => { e.stopPropagation(); handleScaleDecrease('shoes'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >−</button>
                          <span className="scale-value">{Math.round(getClothingScale('shoes') * 100)}%</span>
                          <button 
                            className="scale-btn scale-btn-plus"
                            onClick={(e) => { e.stopPropagation(); handleScaleIncrease('shoes'); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >+</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Accessories (watches, jewelry, etc) */}
              {outfit.items.filter(i => ['accessories', 'accessory', 'watch', 'bracelet', 'necklace', 'chain'].includes(i.type)).map((item, idx) => (
                <div key={idx} style={{
                  position: 'absolute',
                  top: item.type === 'necklace' || item.type === 'chain' ? '18%' : '48%',
                  left: item.type === 'necklace' || item.type === 'chain' ? '50%' : undefined,
                  right: item.type === 'necklace' || item.type === 'chain' ? undefined : (rotation > 180 ? '15%' : '85%'),
                  transform: item.type === 'necklace' || item.type === 'chain' ? 'translateX(-50%)' : getItemStyle('accessory', rotation).transform,
                  width: item.type === 'necklace' || item.type === 'chain' ? '100px' : '60px',
                  height: 'auto',
                  zIndex: 6,
                  pointerEvents: 'none',
                  opacity: getItemStyle('accessory', rotation).opacity,
                  transition: isDragging ? 'none' : 'all 0.3s ease-out'
                }}>
                  <img src={item.image_url} alt="accessory" style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))'
                  }} />
                </div>
              ))}

              {/* Fallback: Display any items that don't match known clothing types (renders as top) */}
              {outfit.items.filter(i => {
                const knownTypes = [
                  'hat', 'shirt', 'jacket', 'dress', 'top', 'hoodie', 'sweater', 't-shirt', 'blouse',
                  'pants', 'shorts', 'skirt', 'bottom', 'jeans', 'leggings',
                  'shoes', 'sneakers', 'boots', 'heels', 'sandals', 'dress-shoes',
                  'accessories', 'accessory', 'watch', 'bracelet', 'necklace', 'chain', 'bag', 'belt', 'scarf', 'sunglasses', 'jewelry'
                ];
                return !i.type || !knownTypes.includes(i.type?.toLowerCase());
              }).map((item, idx) => (
                <div 
                  key={`unknown-${idx}`}
                  onMouseDown={(e) => handleClothingMouseDown(e, `unknown-${idx}`)}
                  onMouseEnter={() => setHoveredItem(`unknown-${idx}`)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={isPositioningMode && rotation === 0 ? 'clothing-item-positioning' : ''}
                  style={{
                    position: 'absolute',
                    ...getClothingPosition(`unknown-${idx}`, userProfile?.body_photo_url ? '25%' : '28%'),
                    transform: `translateX(-50%) scale(${getClothingScale(`unknown-${idx}`) || 1})`,
                    width: userProfile?.body_photo_url ? '280px' : '200px',
                    height: 'auto',
                    zIndex: 5,
                    pointerEvents: isPositioningMode && rotation === 0 ? 'auto' : 'none',
                    cursor: isPositioningMode && rotation === 0 ? 'move' : 'default',
                    opacity: userProfile?.body_photo_url ? 0.9 : 0.85,
                    transition: isDragging ? 'none' : 'all 0.3s ease-out'
                  }}>
                  <img 
                    src={item.image_url} 
                    alt={item.name || 'clothing item'}
                    style={{
                      width: '100%',
                      height: 'auto',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
                      mixBlendMode: 'multiply',
                      isolation: 'isolate',
                      pointerEvents: 'none'
                    }}
                  />
                  {isPositioningMode && rotation === 0 && (
                    <>
                      <div className="clothing-crosshair-center"></div>
                      {hoveredItem === `unknown-${idx}` && (
                        <div className="clothing-scale-controls">
                          <button 
                            className="scale-btn scale-btn-minus"
                            onClick={(e) => { e.stopPropagation(); handleScaleDecrease(`unknown-${idx}`); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >−</button>
                          <span className="scale-value">{Math.round((getClothingScale(`unknown-${idx}`) || 1) * 100)}%</span>
                          <button 
                            className="scale-btn scale-btn-plus"
                            onClick={(e) => { e.stopPropagation(); handleScaleIncrease(`unknown-${idx}`); }}
                            onMouseDown={(e) => e.stopPropagation()}
                          >+</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              </div>{/* End wrapper for body photo and clothing */}
            </div>
          </div>

          {/* Controls Sidebar */}
          {showControls && (
            <div className="fitting-room-sidebar enhanced">
              
              {/* AI Fit Score */}
              {fitScore && (
                <div className="control-section fit-score-section">
                  <div className="fit-score-header" onClick={() => setShowFitScore(!showFitScore)}>
                    <h4>🎯 AI Fit Score</h4>
                    <div className={`fit-score-badge score-${Math.floor((fitScore.overall || 0) / 20)}`}>
                      {isFinite(fitScore.overall) ? fitScore.overall : 0}%
                    </div>
                  </div>
                  {showFitScore && (
                    <div className="fit-score-details">
                      <div className="score-breakdown">
                        {Object.entries(fitScore.breakdown).map(([key, value]) => (
                          <div key={key} className="score-item">
                            <span className="score-label">{formatScoreLabel(key)}</span>
                            <div className="score-bar">
                              <div 
                                className="score-fill" 
                                style={{ 
                                  width: `${(value / getMaxScore(key)) * 100}%`,
                                  backgroundColor: getScoreColor(value, getMaxScore(key))
                                }}
                              />
                            </div>
                            <span className="score-value">{value}/{getMaxScore(key)}</span>
                          </div>
                        ))}
                      </div>
                      {fitScore.insights.length > 0 && (
                        <div className="fit-insights">
                          {fitScore.insights.slice(0, 2).map((insight, idx) => (
                            <div key={idx} className={`insight ${insight.type}`}>
                              <strong>{insight.message}</strong>
                              <p>{insight.suggestion}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Positioning Mode Instructions (moved out of frame) */}
              {isPositioningMode && rotation === 0 && (
                <div className="positioning-sidebar-hint" role="status" aria-live="polite">
                  <strong style={{display:'block', marginBottom:6}}>📍 Positioning Mode</strong>
                  <div style={{display:'flex', gap:8, alignItems:'center'}}>
                    <div style={{fontSize:18}}>📍</div>
                    <div>
                      <div>Drag to move</div>
                      <div>➕➖ Resize</div>
                      <div>💾 Click Save</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Rotation Buttons */}
              <div className="control-section">
                <h4>📐 View Controls</h4>
                <div className="quick-view-btns">
                  <button onClick={() => setRotation(0)} className="quick-view-btn">
                    Front
                  </button>
                  <button onClick={() => setRotation(90)} className="quick-view-btn">
                    Right
                  </button>
                  <button onClick={() => setRotation(180)} className="quick-view-btn">
                    Back
                  </button>
                  <button onClick={() => setRotation(270)} className="quick-view-btn">
                    Left
                  </button>
                </div>
                
                {/* Positioning Mode Toggle */}
                {(userProfile?.body_photo_front || userProfile?.body_photo_url) && (
                  <div style={{ marginTop: '16px' }}>
                    {/* Auto-Fit Button - AI-Powered */}
                    <button 
                      onClick={autoFitClothing}
                      className="sf-btn sf-btn-primary"
                      style={{ 
                        width: '100%', 
                        marginBottom: '8px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none'
                      }}
                      title="Automatically adjust clothing sizes to fit your body"
                    >
                      ✨ Auto-Fit Clothing
                    </button>
                    
                    <button 
                      onClick={() => {
                        setIsPositioningMode(!isPositioningMode);
                        if (!isPositioningMode) setRotation(0); // Force front view
                      }}
                      className={`sf-btn ${isPositioningMode ? 'sf-btn-primary' : 'sf-btn-outline'}`}
                      style={{ width: '100%', marginBottom: '8px' }}
                    >
                      {isPositioningMode ? '✅ Positioning Mode ON' : '📍 Adjust Clothing Fit'}
                    </button>
                    
                    {isPositioningMode && (
                      <>
                        <button 
                          onClick={saveClothingPositions}
                          className="sf-btn sf-btn-primary"
                          style={{ width: '100%', marginBottom: '4px' }}
                        >
                          💾 Save Positions
                        </button>
                        <button 
                          onClick={resetClothingPositions}
                          className="sf-btn sf-btn-outline"
                          style={{ width: '100%', fontSize: '13px', marginBottom: '4px' }}
                        >
                          🔄 Reset Positions
                        </button>
                        <button 
                          onClick={resetClothingScales}
                          className="sf-btn sf-btn-outline"
                          style={{ width: '100%', fontSize: '13px' }}
                        >
                          ↩️ Reset Auto-Fit
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Zoom Control */}
              <div className="control-section">
                <h4>🔍 Zoom: {(zoom * 100).toFixed(0)}%</h4>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={zoom * 100}
                  onChange={(e) => setZoom(e.target.value / 100)}
                  className="zoom-slider"
                />
                <div className="zoom-btns">
                  <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>−</button>
                  <button onClick={() => setZoom(1)}>Reset</button>
                  <button onClick={() => setZoom(Math.min(2, zoom + 0.1))}>+</button>
                </div>
              </div>

              {/* Outfit Items List */}
              <div className="control-section">
                <h4>👕 Outfit Items</h4>
                <div className="outfit-items-list">
                  {outfit.items.map((item, idx) => (
                    <div key={idx} className="fitting-item">
                      <img src={item.image_url} alt={item.type} />
                      <div>
                        <strong>{item.type}</strong>
                        {item.brand && <span>{item.brand}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Backgrounds Manager */}
              {customBackgrounds.length > 0 && (
                <div className="control-section">
                  <h4>🖼️ Custom Backgrounds</h4>
                  <div className="custom-backgrounds-list">
                    {customBackgrounds.map((bg) => (
                      <div key={bg.id} className="custom-bg-item">
                        <img src={bg.url} alt={bg.name} />
                        <div className="custom-bg-info">
                          <span>{bg.name.slice(0, 15)}</span>
                          <button 
                            onClick={() => deleteCustomBackground(bg.id)}
                            className="delete-bg-btn"
                            title="Delete background"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="control-section">
                {/* Outfit Name Editor */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: 'var(--sf-text)' }}>
                    Outfit Name:
                  </label>
                  {isEditingName ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        value={outfitName}
                        onChange={(e) => setOutfitName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && setIsEditingName(false)}
                        autoFocus
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="sf-btn sf-btn-primary"
                        style={{ padding: '8px 12px' }}
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsEditingName(true)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        background: '#f9fafb'
                      }}
                    >
                      {outfitName || 'Click to name outfit'}
                    </div>
                  )}
                </div>

                <button
                  className="sf-btn sf-btn-primary"
                  onClick={async () => {
                    setIsSaving(true);
                    try {
                      // Save clothing positions and scales
                      if (userProfile?.body_photo_url) {
                        const outfitId = outfit._id || outfit.id || 'temp';
                        if (Object.keys(clothingPositions).length > 0) {
                          localStorage.setItem(`snapfit_positions_${outfitId}`, JSON.stringify(clothingPositions));
                        }
                        if (Object.keys(clothingScales).length > 0) {
                          localStorage.setItem(`snapfit_scales_${outfitId}`, JSON.stringify(clothingScales));
                        }
                      }
                      
                      // Save or update outfit
                      const outfitData = {
                        name: outfitName || generateOutfitName(outfit.items),
                        items: outfit.items,
                        occasion: outfit.occasion,
                        weather: outfit.weather,
                        userId: userProfile.id
                      };

                      if (outfit._id) {
                        // Update existing outfit
                        await updateOutfit(outfit._id, outfitData, userProfile.id);
                        console.log('✅ Outfit updated');
                      } else {
                        // Create new outfit
                        await createOutfit(outfitData, userProfile.id);
                        console.log('✅ New outfit created');
                      }
                      
                      onSave(outfit);
                      onClose();
                    } catch (error) {
                      console.error('❌ Error saving outfit:', error);
                      alert('Failed to save outfit. Please try again.');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  style={{ width: '100%', marginBottom: '8px' }}
                  disabled={isSaving}
                >
                  {isSaving ? '💾 Saving...' : '💾 Save Outfit'}
                </button>
                <button
                  className="sf-btn sf-btn-outline"
                  onClick={onClose}
                  style={{ width: '100%' }}
                >
                  Close
                </button>
              </div>

              {/* Tips */}
              <div className="fitting-tips">
                <p><strong>💡 Pro Tips:</strong></p>
                <ul>
                  <li>Drag to rotate 360°</li>
                  <li>Use quick view buttons</li>
                  <li>Pinch or scroll to zoom</li>
                  {!(userProfile?.body_photo_front || userProfile?.body_photo_url) ? (
                    <li><strong>📸 Upload body photos in Settings</strong></li>
                  ) : !hasAllAngles() ? (
                    <li>⭐ <strong>Add all 4 angles</strong> in Settings for seamless 360°</li>
                  ) : (
                    <li>✅ 360° photos ready!</li>
                  )}
                  <li>Add measurements for accurate fit scores</li>
                  <li>🆕 Items with backgrounds? Re-add them and click "Remove Background"</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
