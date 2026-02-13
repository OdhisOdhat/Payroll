// src/hooks/useBrandSettings.ts
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { apiService } from '../../services/apiService';
import type { BrandSettings, ColorScheme, LogoUploadResult } from '../../types';

interface BrandSettingsContextType {
  brandSettings: BrandSettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveSettings: (settings: Partial<BrandSettings>) => Promise<void>;
  uploadLogo: (file: File) => Promise<LogoUploadResult>;
  resetToDefaults: () => Promise<void>;
  refetch: () => Promise<void>;
  getColorSchemeClass: () => string;
  getThemeColors: () => {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const BrandSettingsContext = createContext<BrandSettingsContextType | undefined>(undefined);

// Default brand settings
const DEFAULT_SETTINGS: BrandSettings = {
  entityName: 'PayrollPro Kenya',
  companyName: 'PayrollPro Kenya',
  companyTagline: 'Professional Payroll Management',
  primaryColor: '#2563eb', // Blue-600
  secondaryColor: '#0f172a', // Slate-900
  accentColor: '#0ea5e9', // Cyan-500
  logoUrl: '/default-logo.png',
  faviconUrl: '/favicon.ico',
  primaryFont: 'Inter, sans-serif',
  secondaryFont: 'Inter, sans-serif',
  showCompanyName: true,
  showTagline: true,
  colorScheme: 'corporate',
  lastUpdated: new Date().toISOString(),
};

export const BrandSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load brand settings from API
  const loadBrandSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const settings = await apiService.getBrandSettings();
      // Merge with defaults to ensure all fields exist
      setBrandSettings({ ...DEFAULT_SETTINGS, ...settings });
    } catch (err) {
      // If API fails, use defaults
      console.warn('Failed to load brand settings, using defaults:', err);
      setBrandSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save brand settings with optimistic update
  const saveSettings = useCallback(async (updates: Partial<BrandSettings>): Promise<void> => {
    setIsSaving(true);
    setError(null);
    
    // Optimistic update
    const optimisticSettings = { ...brandSettings, ...updates, lastUpdated: new Date().toISOString() };
    setBrandSettings(optimisticSettings);
    
    try {
      const savedSettings = await apiService.saveBrandSettings(optimisticSettings);
      // Update with server response (in case server modifies anything)
      setBrandSettings(savedSettings);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save brand settings';
      console.error('Brand settings save error:', errorMsg);
      setError(errorMsg);
      
      // Revert optimistic update on error
      setBrandSettings(brandSettings);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [brandSettings]);

  // Upload logo file
  const uploadLogo = useCallback(async (file: File): Promise<LogoUploadResult> => {
    setIsSaving(true);
    setError(null);
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file (PNG, JPG, SVG)');
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size must be less than 5MB');
    }
    
    try {
      const result = await apiService.uploadLogo(file);
      
      // Update brand settings with new logo URL
      setBrandSettings(prev => ({
        ...prev,
        logoUrl: result.url,
        lastUpdated: new Date().toISOString(),
      }));
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload logo';
      console.error('Logo upload error:', errorMsg);
      setError(errorMsg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Reset to default settings
  const resetToDefaults = useCallback(async (): Promise<void> => {
    if (!window.confirm('Reset all brand settings to default values? This action cannot be undone.')) {
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      // Optimistic update
      setBrandSettings(DEFAULT_SETTINGS);
      
      // Save to server
      await apiService.saveBrandSettings(DEFAULT_SETTINGS);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reset brand settings';
      console.error('Brand settings reset error:', errorMsg);
      setError(errorMsg);
      
      // Revert on error
      await loadBrandSettings();
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [loadBrandSettings]);

  // Get CSS class for current color scheme
  const getColorSchemeClass = useCallback((): string => {
    const { primaryColor, secondaryColor } = brandSettings;
    
    // Generate CSS variables
    return `
      --primary-color: ${primaryColor};
      --secondary-color: ${secondaryColor};
      --accent-color: ${brandSettings.accentColor};
      --primary-hover: ${adjustColor(primaryColor, -15)};
      --secondary-hover: ${adjustColor(secondaryColor, -15)};
    `;
  }, [brandSettings]);

  // Get theme colors object
  const getThemeColors = useCallback(() => {
    return {
      primary: brandSettings.primaryColor,
      secondary: brandSettings.secondaryColor,
      accent: brandSettings.accentColor,
    };
  }, [brandSettings]);

  // Helper function to adjust color brightness
  function adjustColor(color: string, amount: number): string {
    // Remove hash if present
    let hex = color.replace('#', '');
    
    // Handle 3-digit hex
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    
    // Parse RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Adjust
    const newR = Math.max(0, Math.min(255, r + amount));
    const newG = Math.max(0, Math.min(255, g + amount));
    const newB = Math.max(0, Math.min(255, b + amount));
    
    // Convert back to hex
    return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
  }

  // Initial load
  useEffect(() => {
    loadBrandSettings();
  }, [loadBrandSettings]);

  const value = {
    brandSettings,
    isLoading,
    isSaving,
    error,
    saveSettings,
    uploadLogo,
    resetToDefaults,
    refetch: loadBrandSettings,
    getColorSchemeClass,
    getThemeColors,
  };

  return (
    <BrandSettingsContext.Provider value={value}>
      {children}
    </BrandSettingsContext.Provider>
  );
};

export const useBrandSettings = () => {
  const context = useContext(BrandSettingsContext);
  if (!context) {
    throw new Error('useBrandSettings must be used within BrandSettingsProvider');
  }
  return context;
};