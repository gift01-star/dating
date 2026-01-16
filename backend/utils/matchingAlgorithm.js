/**
 * Matching Algorithm for EduLove Dating Platform
 * Calculates compatibility scores based on multiple factors
 */

export const calculateMatchScore = (user1, user2, preferences = {}) => {
  let totalScore = 0;
  let maxScore = 0;

  // 1. Location Compatibility (25 points)
  if (user1.location && user2.location) {
    if (user1.location.toLowerCase() === user2.location.toLowerCase()) {
      totalScore += 25;
    } else {
      totalScore += 5; // Small bonus for same country/region
    }
    maxScore += 25;
  }

  // 2. Age Compatibility (20 points)
  if (user1.dob && user2.dob) {
    const age1 = calculateAge(user1.dob);
    const age2 = calculateAge(user2.dob);
    const ageDifference = Math.abs(age1 - age2);
    
    if (ageDifference === 0) {
      totalScore += 20;
    } else if (ageDifference <= 2) {
      totalScore += 18;
    } else if (ageDifference <= 5) {
      totalScore += 12;
    } else if (ageDifference <= 10) {
      totalScore += 5;
    }
    maxScore += 20;
  }

  // 3. Height Compatibility (15 points)
  if (user1.height && user2.height) {
    const heightDiff = Math.abs(user1.height - user2.height);
    
    if (heightDiff === 0) {
      totalScore += 15;
    } else if (heightDiff <= 5) {
      totalScore += 12;
    } else if (heightDiff <= 15) {
      totalScore += 8;
    } else if (heightDiff <= 25) {
      totalScore += 4;
    }
    maxScore += 15;
  }

  // 4. Gender Preference Match (12 points)
  if (user1.gender && user2.gender && user1.preferredGender && user2.preferredGender) {
    if (
      user2.gender === user1.preferredGender &&
      user1.gender === user2.preferredGender
    ) {
      totalScore += 12;
    }
    maxScore += 12;
  } else if (user1.gender && user2.gender) {
    // Fallback to basic compatibility
    if (
      (user1.gender === 'Male' && user2.gender === 'Female') ||
      (user1.gender === 'Female' && user2.gender === 'Male')
    ) {
      totalScore += 10;
    } else if (user1.gender === 'Other' || user2.gender === 'Other') {
      totalScore += 8;
    }
    maxScore += 12;
  }

  // 5. Interests Overlap (20 points)
  if (user1.interests && user2.interests && user1.interests.length > 0 && user2.interests.length > 0) {
    const commonInterests = user1.interests.filter(interest =>
      user2.interests.some(u2Interest =>
        u2Interest.toLowerCase() === interest.toLowerCase()
      )
    );
    
    const maxCommonInterests = Math.min(user1.interests.length, user2.interests.length);
    const interestScore = (commonInterests.length / maxCommonInterests) * 20;
    totalScore += interestScore;
    maxScore += 20;
  } else {
    maxScore += 20;
  }

  // 6. University/Educational Match (15 points)
  if (user1.university && user2.university) {
    if (user1.university.toLowerCase() === user2.university.toLowerCase()) {
      totalScore += 15;
    } else {
      totalScore += 3; // Small bonus for same education level
    }
    maxScore += 15;
  }

  // 7. Course/Faculty Compatibility (10 points)
  if (user1.course && user2.course) {
    // Exact course match
    if (user1.course.toLowerCase() === user2.course.toLowerCase()) {
      totalScore += 10;
    } else {
      // Check for related fields (STEM, Humanities, etc.)
      const relatedFields = isSimilarField(user1.course, user2.course);
      if (relatedFields) {
        totalScore += 5;
      }
    }
    maxScore += 10;
  }

  // 8. Year of Study Compatibility (10 points)
  if (user1.year && user2.year) {
    const yearDiff = Math.abs(parseYear(user1.year) - parseYear(user2.year));
    
    if (yearDiff === 0) {
      totalScore += 10;
    } else if (yearDiff === 1) {
      totalScore += 8;
    } else if (yearDiff === 2) {
      totalScore += 5;
    } else {
      totalScore += 2;
    }
    maxScore += 10;
  }

  // 9. Verification Status Bonus (8 points)
  if (user1.verified && user2.verified) {
    totalScore += 8;
  } else if (user1.verified || user2.verified) {
    totalScore += 4;
  }
  maxScore += 8;

  // 10. Profile Completeness Bonus (8 points)
  const avgCompletion = ((user1.profileCompletion || 0) + (user2.profileCompletion || 0)) / 2;
  const completionScore = (avgCompletion / 100) * 8;
  totalScore += completionScore;
  maxScore += 8;

  // 11. Bio Sentiment Analysis (bonus 10 points for similar personalities)
  if (user1.bio && user2.bio) {
    // Simple keyword matching for personality traits
    const personalityScore = analyzePersonalityMatch(user1.bio, user2.bio);
    totalScore += personalityScore;
    maxScore += 10;
  } else {
    maxScore += 10;
  }

  // 12. Lifestyle Match (12 points)
  if (user1.lifestyle && user2.lifestyle) {
    const lifestyleMatch = calculateLifestyleCompatibility(user1.lifestyle, user2.lifestyle);
    totalScore += lifestyleMatch * 12;
    maxScore += 12;
  } else {
    maxScore += 12;
  }

  // 13. Future Goals Alignment (10 points)
  if (user1.futureGoals && user2.futureGoals) {
    const goalsMatch = calculateGoalsCompatibility(user1.futureGoals, user2.futureGoals);
    totalScore += goalsMatch * 10;
    maxScore += 10;
  } else {
    maxScore += 10;
  }

  // 14. Photo Quality & Verification (5 points)
  if (user1.photos && user2.photos && user1.photos.length > 0 && user2.photos.length > 0) {
    totalScore += 5;
  }
  maxScore += 5;

  // Calculate final percentage
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  return {
    score: Math.min(100, percentage),
    factors: {
      location: user1.location && user2.location ? (user1.location.toLowerCase() === user2.location.toLowerCase() ? 'Excellent' : 'Good') : 'N/A',
      ageGap: user1.dob && user2.dob ? Math.abs(calculateAge(user1.dob) - calculateAge(user2.dob)) : 'N/A',
      interests: user1.interests && user2.interests ? countCommonInterests(user1.interests, user2.interests) : 0,
      education: user1.university && user2.university ? (user1.university.toLowerCase() === user2.university.toLowerCase() ? 'Same' : 'Different') : 'N/A',
      verified: user1.verified && user2.verified ? 'Both' : user1.verified || user2.verified ? 'One' : 'None'
    }
  };
};

/**
 * Helper Functions
 */

function calculateAge(dob) {
  if (!dob) return 0;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function parseYear(yearString) {
  const map = {
    '1st Year': 1,
    '2nd Year': 2,
    '3rd Year': 3,
    '4th Year': 4,
    'Other': 0
  };
  return map[yearString] || 0;
}

function isSimilarField(course1, course2) {
  const stemFields = ['Engineering', 'Science', 'Computer', 'IT', 'Math', 'Physics', 'Chemistry', 'Biology'];
  const humanitiesFields = ['English', 'History', 'Literature', 'Philosophy', 'Languages', 'Arts'];
  const businessFields = ['Business', 'Economics', 'Finance', 'Accounting', 'Management'];
  const healthFields = ['Medicine', 'Nursing', 'Health', 'Psychology', 'Pharmacy'];

  const c1Lower = course1.toLowerCase();
  const c2Lower = course2.toLowerCase();

  const inStem = (field) => stemFields.some(s => field.includes(s.toLowerCase()));
  const inHumanities = (field) => humanitiesFields.some(h => field.includes(h.toLowerCase()));
  const inBusiness = (field) => businessFields.some(b => field.includes(b.toLowerCase()));
  const inHealth = (field) => healthFields.some(h => field.includes(h.toLowerCase()));

  if (inStem(c1Lower) && inStem(c2Lower)) return true;
  if (inHumanities(c1Lower) && inHumanities(c2Lower)) return true;
  if (inBusiness(c1Lower) && inBusiness(c2Lower)) return true;
  if (inHealth(c1Lower) && inHealth(c2Lower)) return true;

  return false;
}

function countCommonInterests(interests1, interests2) {
  return interests1.filter(interest =>
    interests2.some(i2 => i2.toLowerCase() === interest.toLowerCase())
  ).length;
}

function analyzePersonalityMatch(bio1, bio2) {
  const positiveTraits = ['adventurous', 'creative', 'funny', 'kind', 'smart', 'ambitious', 'passionate', 'friendly', 'thoughtful', 'genuine'];
  
  let score = 0;
  let matchCount = 0;

  for (const trait of positiveTraits) {
    const hasTrait1 = bio1.toLowerCase().includes(trait);
    const hasTrait2 = bio2.toLowerCase().includes(trait);
    
    if (hasTrait1 && hasTrait2) {
      score += 2;
      matchCount++;
    }
  }

  return Math.min(10, score);
}

/**
 * Get recommended matches for a user
 */
export const getRecommendedMatches = (user, allUsers) => {
  if (!user || !allUsers) return [];

  const recommendations = allUsers
    .filter(otherUser => 
      otherUser._id !== user._id &&
      !user.blocked?.includes(otherUser._id) &&
      !otherUser.blocked?.includes(user._id)
    )
    .map(otherUser => ({
      user: otherUser,
      matchScore: calculateMatchScore(user, otherUser)
    }))
    .sort((a, b) => b.matchScore.score - a.matchScore.score);

  return recommendations;
};

/**
 * Get match compatibility details
 */
export const getMatchDetails = (user1, user2) => {
  const score = calculateMatchScore(user1, user2);
  
  const details = {
    overallScore: score.score,
    compatibility: getCompatibilityLabel(score.score),
    factors: score.factors,
    matches: {
      location: user1.location && user2.location && user1.location.toLowerCase() === user2.location.toLowerCase(),
      sameCourse: user1.course && user2.course && user1.course.toLowerCase() === user2.course.toLowerCase(),
      sameUniversity: user1.university && user2.university && user1.university.toLowerCase() === user2.university.toLowerCase(),
      commonInterests: user1.interests && user2.interests ? countCommonInterests(user1.interests, user2.interests) : 0,
      bothVerified: user1.verified && user2.verified,
      ageCompatible: user1.dob && user2.dob && Math.abs(calculateAge(user1.dob) - calculateAge(user2.dob)) <= 5
    }
  };

  return details;
};

function calculateLifestyleCompatibility(lifestyle1, lifestyle2) {
  // Compare lifestyle factors like drinking, smoking, etc.
  const factors = ['smoking', 'drinking', 'exercise', 'diet'];
  let matches = 0;
  let comparisons = 0;

  for (const factor of factors) {
    if (lifestyle1[factor] !== undefined && lifestyle2[factor] !== undefined) {
      comparisons++;
      if (lifestyle1[factor] === lifestyle2[factor]) {
        matches++;
      }
    }
  }

  return comparisons > 0 ? matches / comparisons : 0.5;
}

function calculateGoalsCompatibility(goals1, goals2) {
  // Compare future goals like career, family, etc.
  const goalCategories = ['career', 'family', 'travel', 'education'];
  let matches = 0;
  let comparisons = 0;

  for (const category of goalCategories) {
    if (goals1[category] !== undefined && goals2[category] !== undefined) {
      comparisons++;
      if (goals1[category] === goals2[category]) {
        matches++;
      }
    }
  }

  return comparisons > 0 ? matches / comparisons : 0.5;
}

function getCompatibilityLabel(score) {
  if (score >= 85) return '🔥 Perfect Match';
  if (score >= 70) return '💕 Great Match';
  if (score >= 55) return '💘 Good Match';
  if (score >= 40) return '💝 Potential Match';
  return '⭐ Maybe';
}
