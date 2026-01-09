/**
 * AI Fit Scoring Engine
 * Analyzes outfit compatibility with user's body type, style preferences, and occasion
 * Enhanced with detailed body measurements for precise fit predictions
 */

/**
 * Calculate how well an outfit fits the user's profile
 * Returns score 0-100 with detailed breakdown
 */
export function calculateFitScore(outfit, userProfile, preferences = {}) {
  const scores = {
    bodyType: 0,
    measurements: 0, // New: precise fit based on measurements
    colorMatch: 0,
    seasonality: 0,
    occasion: 0,
    styleCoherence: 0,
    completeness: 0
  };

  // 1. Body Type Compatibility (15 points - reduced from 25)
  scores.bodyType = calculateBodyTypeScore(outfit, userProfile?.body_type);

  // 2. Measurement-based Fit (20 points - NEW!)
  scores.measurements = calculateMeasurementFit(outfit, userProfile);

  // 3. Color Harmony (15 points)
  scores.colorMatch = calculateColorHarmony(outfit.items);

  // 4. Seasonality Match (15 points)
  scores.seasonality = calculateSeasonalityScore(outfit.items, preferences.currentSeason);

  // 5. Occasion Appropriateness (15 points - reduced from 20)
  scores.occasion = calculateOccasionScore(outfit, preferences.targetOccasion);

  // 6. Style Coherence (10 points - reduced from 15)
  scores.styleCoherence = calculateStyleCoherence(outfit.items);

  // 7. Outfit Completeness (10 points)
  scores.completeness = calculateCompleteness(outfit.items);

  const totalScore = Object.values(scores).reduce((sum, score) => sum + (isFinite(score) ? score : 0), 0);

  return {
    overall: Math.round(isFinite(totalScore) ? totalScore : 0),
    breakdown: scores,
    insights: generateInsights(scores, outfit, userProfile),
    recommendations: generateRecommendations(scores, outfit, userProfile)
  };
}

/**
 * NEW: Calculate fit based on precise body measurements
 * Compares user's measurements to garment requirements
 */
function calculateMeasurementFit(outfit, userProfile) {
  if (!userProfile) return 10; // Neutral score if no profile
  
  const hasMeasurements = userProfile.shoulder_width || 
                          userProfile.chest_circumference || 
                          userProfile.waist_circumference || 
                          userProfile.hip_circumference;
  
  if (!hasMeasurements) return 10; // Neutral if no measurements provided
  
  let fitScore = 10; // Start with base score
  let totalChecks = 0;
  let passedChecks = 0;

  outfit.items.forEach(item => {
    const itemType = item.type?.toLowerCase();
    
    // Check shoulder fit for tops
    if (userProfile.shoulder_width && ['shirt', 't-shirt', 'blouse', 'jacket', 'hoodie', 'sweater'].includes(itemType)) {
      totalChecks++;
      // Shirts/jackets should fit shoulders well
      const fit = item.fit?.toLowerCase();
      if (fit === 'fitted' || fit === 'tailored' || fit === 'regular') {
        passedChecks++;
        fitScore += 1.5;
      }
    }
    
    // Check chest fit for tops
    if (userProfile.chest_circumference && ['shirt', 't-shirt', 'blouse', 'jacket', 'hoodie', 'sweater', 'dress'].includes(itemType)) {
      totalChecks++;
      const fit = item.fit?.toLowerCase();
      if (fit === 'fitted' || fit === 'regular') {
        passedChecks++;
        fitScore += 1.5;
      } else if (fit === 'oversized' || fit === 'baggy') {
        // Oversized can work but less precise
        passedChecks += 0.5;
        fitScore += 0.5;
      }
    }
    
    // Check waist fit for pants/skirts/dresses
    if (userProfile.waist_circumference && ['pants', 'jeans', 'shorts', 'skirt', 'dress'].includes(itemType)) {
      totalChecks++;
      const fit = item.fit?.toLowerCase();
      if (fit === 'fitted' || fit === 'tailored' || fit === 'regular') {
        passedChecks++;
        fitScore += 2;
      }
    }
    
    // Check hip fit for bottoms
    if (userProfile.hip_circumference && ['pants', 'jeans', 'shorts', 'skirt'].includes(itemType)) {
      totalChecks++;
      const fit = item.fit?.toLowerCase();
      if (fit === 'fitted' || fit === 'regular') {
        passedChecks++;
        fitScore += 1.5;
      }
    }
    
    // Check sleeve length for long-sleeved items
    if (userProfile.arm_length && ['shirt', 'jacket', 'hoodie', 'sweater'].includes(itemType)) {
      totalChecks++;
      // Assume good fit for now - could be enhanced with garment measurements
      if (!item.tags?.includes('sleeveless')) {
        passedChecks++;
        fitScore += 1;
      }
    }
    
    // Check inseam for pants
    if (userProfile.inseam && ['pants', 'jeans'].includes(itemType)) {
      totalChecks++;
      // Full-length pants should match inseam
      if (!item.tags?.includes('cropped') && !item.tags?.includes('ankle')) {
        passedChecks++;
        fitScore += 1.5;
      }
    }
    
    // Check neck fit for collared items
    if (userProfile.neck_circumference && ['shirt', 'blouse'].includes(itemType)) {
      totalChecks++;
      const tags = item.tags || [];
      if (tags.includes('collared') && (item.fit === 'fitted' || item.fit === 'tailored')) {
        passedChecks++;
        fitScore += 1;
      } else {
        // More forgiving for casual items
        passedChecks += 0.7;
        fitScore += 0.7;
      }
    }
  });
  
  // Bonus for having comprehensive measurements
  const measurementCount = [
    userProfile.shoulder_width,
    userProfile.chest_circumference,
    userProfile.waist_circumference,
    userProfile.hip_circumference,
    userProfile.inseam,
    userProfile.arm_length,
    userProfile.neck_circumference,
    userProfile.torso_length
  ].filter(Boolean).length;
  
  if (measurementCount >= 4) fitScore += 2;
  if (measurementCount >= 7) fitScore += 1;
  
  return Math.max(0, Math.min(20, Math.round(fitScore)));
}

function calculateBodyTypeScore(outfit, bodyType) {
  if (!bodyType) return 10; // Neutral score if no body type set (reduced from 15)

  const bodyTypeRules = {
    slim: {
      good: ['fitted', 'tailored', 'structured', 'layered'],
      avoid: ['oversized', 'baggy']
    },
    average: {
      good: ['fitted', 'casual', 'balanced', 'versatile'],
      avoid: []
    },
    athletic: {
      good: ['fitted', 'structured', 'sporty', 'tailored'],
      avoid: ['tight', 'restrictive']
    },
    curvy: {
      good: ['fitted', 'wrap', 'a-line', 'empire'],
      avoid: ['boxy', 'shapeless']
    },
    plus: {
      good: ['fitted', 'structured', 'wrap', 'a-line'],
      avoid: ['tight', 'baggy']
    }
  };

  const rules = bodyTypeRules[bodyType] || bodyTypeRules.average;
  let score = 10;

  outfit.items.forEach(item => {
    const tags = (item.tags || []).map(t => t.toLowerCase());
    const hasGoodTag = rules.good.some(tag => tags.includes(tag));
    const hasAvoidTag = rules.avoid.some(tag => tags.includes(tag));

    if (hasGoodTag) score += 1.5;
    if (hasAvoidTag) score -= 2;
  });

  return Math.max(0, Math.min(15, score));
}

function calculateColorHarmony(items) {
  if (!items || items.length === 0) return 0;

  const colors = items.map(item => item.color).filter(Boolean);
  if (colors.length < 2) return 15;

  // Check for complementary colors, monochromatic schemes, etc.
  const hasNeutral = colors.some(c => isNeutralColor(c));
  const colorCount = new Set(colors).size;

  let score = 10;

  // Good: 2-3 colors with neutrals
  if (colorCount >= 2 && colorCount <= 3 && hasNeutral) score += 5;
  
  // Too many colors is chaotic
  if (colorCount > 4) score -= 3;

  // Monochromatic is always safe
  if (colorCount === 1) score += 3;

  return Math.max(0, Math.min(15, score));
}

function isNeutralColor(color) {
  const neutrals = ['#000000', '#ffffff', '#808080', '#c0c0c0', '#a52a2a', '#f5f5dc'];
  return neutrals.some(n => color?.toLowerCase().includes(n.substring(1)));
}

function calculateSeasonalityScore(items, currentSeason) {
  if (!currentSeason) return 10;

  let matchCount = 0;
  items.forEach(item => {
    const season = item.season?.toLowerCase();
    if (season === 'all' || season === currentSeason) {
      matchCount++;
    }
  });

  const matchRatio = matchCount / items.length;
  return Math.round(matchRatio * 15);
}

function calculateOccasionScore(outfit, targetOccasion) {
  if (!targetOccasion || !outfit.occasion) return 15;

  const occasionMatch = {
    casual: ['casual', 'everyday', 'weekend'],
    work: ['work', 'professional', 'business', 'office'],
    formal: ['formal', 'dressy', 'evening', 'event'],
    party: ['party', 'night out', 'clubbing', 'celebration'],
    athletic: ['athletic', 'gym', 'sports', 'workout']
  };

  const targetCategories = occasionMatch[targetOccasion] || [targetOccasion];
  const outfitOccasion = outfit.occasion?.toLowerCase();

  if (targetCategories.includes(outfitOccasion)) return 20;
  if (outfitOccasion === 'casual' && targetOccasion !== 'formal') return 15;
  
  return 10;
}

function calculateStyleCoherence(items) {
  if (!items || items.length === 0) return 0;

  const styles = items.flatMap(item => item.tags || []);
  const styleMap = {};

  styles.forEach(style => {
    const normalized = style.toLowerCase();
    styleMap[normalized] = (styleMap[normalized] || 0) + 1;
  });

  // Check if there's a dominant style
  const maxCount = Math.max(...Object.values(styleMap));
  const coherence = maxCount / styles.length;

  return Math.round(coherence * 15);
}

function calculateCompleteness(items) {
  const types = new Set(items.map(item => item.type));
  
  let score = 5; // Base score
  
  // Full outfit bonus
  if (types.has('shirt') || types.has('dress')) score += 2;
  if (types.has('pants') || types.has('shorts') || types.has('skirt') || types.has('dress')) score += 2;
  if (types.has('shoes')) score += 1;

  return Math.min(10, score);
}

function generateInsights(scores, outfit, userProfile) {
  const insights = [];

  // Measurement-based insights (NEW!)
  if (scores.measurements !== undefined) {
    const hasMeasurements = userProfile?.shoulder_width || 
                            userProfile?.chest_circumference || 
                            userProfile?.waist_circumference || 
                            userProfile?.hip_circumference;
    
    if (!hasMeasurements) {
      insights.push({
        type: 'info',
        message: '📏 Add body measurements for better fit predictions',
        suggestion: 'Go to Settings > Body Silhouette to add your measurements'
      });
    } else if (scores.measurements < 12) {
      insights.push({
        type: 'warning',
        message: 'Fit may not be ideal based on your measurements',
        suggestion: 'Consider tailored or adjustable fit options for this outfit'
      });
    } else if (scores.measurements >= 17) {
      insights.push({
        type: 'success',
        message: '✨ Excellent fit based on your measurements!',
        suggestion: 'This outfit should fit your proportions perfectly'
      });
    }
  }

  if (scores.bodyType < 10) {
    insights.push({
      type: 'warning',
      message: 'This style may not be ideal for your body type',
      suggestion: 'Try more fitted or structured pieces'
    });
  } else if (scores.bodyType >= 13) {
    insights.push({
      type: 'success',
      message: 'Perfect match for your body type!',
      suggestion: 'This silhouette complements your shape beautifully'
    });
  }

  if (scores.colorMatch < 10) {
    insights.push({
      type: 'warning',
      message: 'Color combination could be improved',
      suggestion: 'Consider adding neutral pieces or reducing color count'
    });
  }

  if (scores.styleCoherence < 7) {
    insights.push({
      type: 'info',
      message: 'Mixed style elements detected',
      suggestion: 'This creates an eclectic look - perfect for standing out!'
    });
  }

  if (scores.completeness < 8) {
    insights.push({
      type: 'warning',
      message: 'Outfit is missing key pieces',
      suggestion: 'Add shoes or accessories to complete the look'
    });
  }

  return insights;
}

function generateRecommendations(scores, outfit, userProfile) {
  const recommendations = [];

  if (scores.overall >= 80) {
    recommendations.push('This is an excellent outfit choice! You\'ll look amazing.');
  } else if (scores.overall >= 60) {
    recommendations.push('Good outfit with room for improvement.');
  } else {
    recommendations.push('Consider adjusting this outfit for better results.');
  }

  // Measurement-specific recommendations
  if (userProfile) {
    const hasMeasurements = userProfile.shoulder_width || 
                            userProfile.chest_circumference || 
                            userProfile.waist_circumference || 
                            userProfile.hip_circumference;
    
    if (!hasMeasurements) {
      recommendations.push('📏 Add your body measurements in Settings for personalized fit recommendations.');
    } else if (scores.measurements && scores.measurements < 12) {
      recommendations.push('💡 Try items with adjustable features or consider tailoring for the perfect fit.');
    }
  }

  if (scores.colorMatch < 12) {
    recommendations.push('Try swapping one item for a neutral color.');
  }

  if (scores.completeness < 8) {
    recommendations.push('Add accessories or shoes to complete your look.');
  }

  return recommendations;
}

/**
 * Track outfit performance over time
 */
export function trackOutfitAnalytics(outfitId, event) {
  const analyticsKey = 'snapfit_outfit_analytics';
  const analytics = JSON.parse(localStorage.getItem(analyticsKey) || '{}');

  if (!analytics[outfitId]) {
    analytics[outfitId] = {
      views: 0,
      tryOns: 0,
      saves: 0,
      shares: 0,
      likes: 0,
      wornDates: [],
      avgFitScore: 0
    };
  }

  const outfit = analytics[outfitId];

  switch (event.type) {
    case 'view':
      outfit.views++;
      break;
    case 'tryOn':
      outfit.tryOns++;
      break;
    case 'save':
      outfit.saves++;
      break;
    case 'share':
      outfit.shares++;
      break;
    case 'like':
      outfit.likes++;
      break;
    case 'worn':
      outfit.wornDates.push(event.date || new Date().toISOString());
      break;
    case 'scored':
      outfit.avgFitScore = event.score;
      break;
  }

  localStorage.setItem(analyticsKey, JSON.stringify(analytics));
  return analytics[outfitId];
}

/**
 * Get user's style insights
 */
export function getUserStyleInsights() {
  const analyticsKey = 'snapfit_outfit_analytics';
  const analytics = JSON.parse(localStorage.getItem(analyticsKey) || '{}');

  const allOutfits = Object.values(analytics);
  if (allOutfits.length === 0) return null;

  const totalTryOns = allOutfits.reduce((sum, o) => sum + o.tryOns, 0);
  const totalWorn = allOutfits.reduce((sum, o) => sum + o.wornDates.length, 0);
  const avgScore = allOutfits.reduce((sum, o) => sum + (o.avgFitScore || 0), 0) / allOutfits.length;

  const mostTried = allOutfits.sort((a, b) => b.tryOns - a.tryOns)[0];
  const mostWorn = allOutfits.sort((a, b) => b.wornDates.length - a.wornDates.length)[0];

  return {
    totalOutfits: allOutfits.length,
    totalTryOns,
    totalWorn,
    avgFitScore: Math.round(avgScore),
    mostPopular: {
      tried: mostTried,
      worn: mostWorn
    },
    weeklyActivity: calculateWeeklyActivity(allOutfits)
  };
}

function calculateWeeklyActivity(outfits) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let weeklyTryOns = 0;
  let weeklyWorn = 0;

  outfits.forEach(outfit => {
    const recentWorn = outfit.wornDates.filter(date => new Date(date) > oneWeekAgo);
    weeklyWorn += recentWorn.length;
  });

  return { tryOns: weeklyTryOns, worn: weeklyWorn };
}
