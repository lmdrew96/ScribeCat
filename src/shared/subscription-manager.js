/**
 * ScribeCat Subscription & Feature Management
 * Handles tier-based feature access and usage tracking
 */

class SubscriptionManager {
  constructor() {
    this.currentTier = 'free'; // free, plus, pro
    this.premiumUnlocks = new Set(); // Store individual unlocks
    this.usageTracking = {
      aiSummariesToday: 0,
      askAITokensToday: 0,
      lastResetDate: new Date().toDateString()
    };
    
    // Tier definitions
    this.tierLimits = {
      free: {
        askAIAccess: false,
        aiSummariesPerSession: 1,
        aiAutopolish: false,
        proThemes: false,
        customStudyPlans: false,
        proBadge: false,
        earlyAccess: false
      },
      plus: {
        askAIAccess: true,
        askAITokensPerDay: 10000,
        aiSummariesPerSession: -1, // unlimited
        aiAutopolish: true,
        proThemes: false,
        customStudyPlans: false,
        proBadge: false,
        earlyAccess: false
      },
      pro: {
        askAIAccess: true,
        askAITokensPerDay: 40000,
        aiSummariesPerSession: -1, // unlimited
        aiAutopolish: true,
        proThemes: true,
        customStudyPlans: true,
        proBadge: true,
        earlyAccess: true
      }
    };

    // Premium unlock categories
    this.premiumUnlockCategories = {
      'designers-pack': {
        name: "Designer's Pack",
        price: 2.99,
        features: ['custom-themes', 'premium-fonts', 'icon-pack']
      },
      'power-editor': {
        name: 'Power Editor',
        price: 2.99,
        features: ['markdown-support', 'latex-support', 'code-blocks']
      },
      'study-boost': {
        name: 'Study Boost',
        price: 2.99,
        features: ['pomodoro-timer', 'focus-mode', 'study-statistics']
      },
      'organization-pro': {
        name: 'Organization Pro',
        price: 2.99,
        features: ['advanced-tagging', 'note-linking', 'smart-search']
      }
    };
  }

  /**
   * Initialize subscription manager with stored data
   * @param {Object} store - Electron store instance
   */
  async initialize(store) {
    this.store = store;
    
    // Load subscription state
    this.currentTier = await store.get('subscription-tier') || 'free';
    this.premiumUnlocks = new Set(await store.get('premium-unlocks') || []);
    this.usageTracking = await store.get('usage-tracking') || this.usageTracking;
    
    // Reset daily usage if it's a new day
    this.resetDailyUsageIfNeeded();
  }

  /**
   * Check if a feature is available for the current user
   * @param {string} feature - Feature to check
   * @returns {boolean} Whether feature is available
   */
  hasFeatureAccess(feature) {
    const tierAccess = this.tierLimits[this.currentTier];
    
    // Check tier-based access
    if (tierAccess && tierAccess[feature] === true) {
      return true;
    }
    
    // Check premium unlock access
    for (const [unlockId, unlockData] of Object.entries(this.premiumUnlockCategories)) {
      if (this.premiumUnlocks.has(unlockId) && unlockData.features.includes(feature)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if user can use AskAI chat
   * @returns {Object} { allowed: boolean, reason?: string, tokensRemaining?: number }
   */
  canUseAskAI() {
    if (!this.hasFeatureAccess('askAIAccess')) {
      return {
        allowed: false,
        reason: 'AskAI chat is available for Plus and Pro subscribers. Upgrade to unlock unlimited AI conversations!',
        upgradeUrl: 'plus'
      };
    }

    const tierLimits = this.tierLimits[this.currentTier];
    const tokensUsed = this.usageTracking.askAITokensToday;
    const tokensRemaining = tierLimits.askAITokensPerDay - tokensUsed;

    if (tokensRemaining <= 0) {
      return {
        allowed: false,
        reason: `You've reached your daily AskAI limit of ${tierLimits.askAITokensPerDay} tokens. Upgrade to Pro for more capacity!`,
        upgradeUrl: 'pro'
      };
    }

    return {
      allowed: true,
      tokensRemaining
    };
  }

  /**
   * Check if user can generate an AI summary
   * @returns {Object} { allowed: boolean, reason?: string, remainingCount?: number }
   */
  canGenerateAISummary() {
    const tierLimits = this.tierLimits[this.currentTier];
    const summariesPerSession = tierLimits.aiSummariesPerSession;
    
    if (summariesPerSession === -1) {
      return { allowed: true }; // Unlimited
    }
    
    const sessionSummaries = this.getSessionSummaryCount();
    
    if (sessionSummaries >= summariesPerSession) {
      return {
        allowed: false,
        reason: `Free users can generate ${summariesPerSession} AI summary per recording session. Upgrade to Plus for unlimited summaries!`,
        upgradeUrl: 'plus'
      };
    }
    
    return {
      allowed: true,
      remainingCount: summariesPerSession - sessionSummaries
    };
  }

  /**
   * Track AskAI token usage
   * @param {number} tokens - Number of tokens used
   */
  async trackAskAIUsage(tokens) {
    this.usageTracking.askAITokensToday += tokens;
    await this.saveUsageTracking();
  }

  /**
   * Track AI summary generation
   */
  async trackAISummaryUsage() {
    // Session-based tracking is handled separately
    // This could be used for analytics
    await this.saveUsageTracking();
  }

  /**
   * Get current session summary count
   * This would be managed by the main app, not persisted
   */
  getSessionSummaryCount() {
    // This will be implemented in the main app logic
    if (typeof window !== 'undefined' && window.scribeCatApp) {
      return window.scribeCatApp.currentSessionSummaries || 0;
    }
    return 0; // Default for Node.js environment
  }

  /**
   * Reset daily usage counters if it's a new day
   */
  resetDailyUsageIfNeeded() {
    const today = new Date().toDateString();
    if (this.usageTracking.lastResetDate !== today) {
      this.usageTracking.askAITokensToday = 0;
      this.usageTracking.lastResetDate = today;
      this.saveUsageTracking();
    }
  }

  /**
   * Change subscription tier
   * @param {string} tier - New tier (free, plus, pro)
   */
  async setSubscriptionTier(tier) {
    if (!['free', 'plus', 'pro'].includes(tier)) {
      throw new Error('Invalid subscription tier');
    }
    
    this.currentTier = tier;
    await this.store.set('subscription-tier', tier);
  }

  /**
   * Add premium unlock
   * @param {string} unlockId - Premium unlock ID
   */
  async addPremiumUnlock(unlockId) {
    if (!this.premiumUnlockCategories[unlockId]) {
      throw new Error('Invalid premium unlock ID');
    }
    
    this.premiumUnlocks.add(unlockId);
    await this.store.set('premium-unlocks', Array.from(this.premiumUnlocks));
  }

  /**
   * Get current subscription status
   */
  getSubscriptionStatus() {
    return {
      tier: this.currentTier,
      tierDisplayName: this.getTierDisplayName(),
      premiumUnlocks: Array.from(this.premiumUnlocks),
      usageTracking: { ...this.usageTracking },
      features: this.tierLimits[this.currentTier]
    };
  }

  /**
   * Get tier display name
   */
  getTierDisplayName() {
    const displayNames = {
      free: 'Free',
      plus: 'Plus ($12/month)',
      pro: 'Pro ($35/month)'
    };
    return displayNames[this.currentTier] || 'Unknown';
  }

  /**
   * Save usage tracking to store
   */
  async saveUsageTracking() {
    if (this.store) {
      await this.store.set('usage-tracking', this.usageTracking);
    }
  }

  /**
   * Get upgrade messaging for a specific feature
   * @param {string} feature - Feature name
   */
  getUpgradeMessage(feature) {
    const messages = {
      askAIAccess: 'AskAI chat is available for Plus and Pro subscribers. Upgrade to unlock unlimited AI conversations with your notes and transcriptions!',
      aiAutopolish: 'AI Autopolish automatically enhances your transcriptions. Available in Plus and Pro plans.',
      proThemes: 'Exclusive Pro themes help you personalize your workspace. Available in Pro plan.',
      customStudyPlans: 'Custom AI Study Plans create personalized learning schedules. Available in Pro plan.'
    };
    
    return messages[feature] || 'This feature is available in paid plans. Upgrade to unlock!';
  }
}

// Export for use in both main and renderer processes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SubscriptionManager;
} else if (typeof window !== 'undefined') {
  window.SubscriptionManager = SubscriptionManager;
}