// src/components/settings/SettingsPage.tsx
import React, { useState } from 'react';
import { 
  Settings, 
  Palette, 
  Upload, 
  RefreshCw, 
  Save, 
  AlertCircle,
  Image,
  Type,
  LayoutTemplate 
} from 'lucide-react';
import { useBrandSettings } from '../hooks/useBrandSettings';
import { useAuth } from '../hooks/useAuth';
import BrandingForm from './BrandingForm';
import { COLOR_SCHEMES } from '../../constants/colorSchemes';  // ← FIXED: lowercase 's' to match file colorSchemes.ts
import type { BrandSettings, ColorSchemePreset } from '../../types';

const SettingsPage: React.FC = () => {
  const { 
    brandSettings, 
    isLoading, 
    isSaving, 
    error, 
    saveSettings, 
    uploadLogo,
    resetToDefaults,
    refetch,
    getThemeColors 
  } = useBrandSettings();
  
  const { user } = useAuth();
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [selectedScheme, setSelectedScheme] = useState<ColorSchemePreset>(
    COLOR_SCHEMES.find(scheme => scheme.name === brandSettings.colorScheme) || COLOR_SCHEMES[0]
  );
  const [activeTab, setActiveTab] = useState<'branding' | 'appearance' | 'advanced'>('branding');

  // Only admins can access settings
  if (user?.role !== 'admin') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 mb-2">Access Restricted</h3>
        <p className="text-slate-600">
          Only administrators can access brand settings.
        </p>
      </div>
    );
  }

  // Handle logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setPreviewLogo(previewUrl);
    
    try {
      await uploadLogo(file);
      alert('Logo uploaded successfully!');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Upload failed';
      alert(`Failed to upload logo: ${errorMsg}`);
      setPreviewLogo(null);
    }
  };

  // Handle color scheme selection
  const handleApplyPreset = async (preset: ColorSchemePreset) => {
    setSelectedScheme(preset);
    await saveSettings({
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      colorScheme: preset.name,
    });
    alert(`Color scheme "${preset.label}" applied successfully!`);
  };

  // Handle custom color change
  const handleColorChange = async (field: keyof Pick<BrandSettings, 'primaryColor' | 'secondaryColor' | 'accentColor'>, value: string) => {
    await saveSettings({ [field]: value, colorScheme: 'custom' });
    setSelectedScheme(COLOR_SCHEMES.find(s => s.name === 'custom')!);
  };

  // Handle form submission
  const handleSaveSettings = async (formData: Partial<BrandSettings>) => {
    try {
      await saveSettings(formData);
      alert('Settings saved successfully!');
    } catch (err) {
      alert('Failed to save settings. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const themeColors = getThemeColors();

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-8 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">Brand Settings</h2>
          <p className="text-slate-500 text-sm mt-1">
            Customize your organization's visual identity and appearance
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={resetToDefaults}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:text-red-600 border border-slate-200 rounded-lg hover:border-red-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Reset to Defaults
          </button>
          <button
            onClick={refetch}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-100">
          <nav className="flex flex-wrap">
            <button
              onClick={() => setActiveTab('branding')}
              className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'branding'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings size={18} />
                <span>Branding</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'appearance'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <Palette size={18} />
                <span>Appearance</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-6 py-4 font-bold text-sm border-b-2 transition-colors ${
                activeTab === 'advanced'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutTemplate size={18} />
                <span>Advanced</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 md:p-8">
          {activeTab === 'branding' && (
            <>
              {/* Logo Upload Section */}
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Image size={20} />
                  Company Logo
                </h3>
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="relative">
                      <img
                        src={previewLogo || brandSettings.logoUrl}
                        alt="Company Logo"
                        className="w-48 h-24 object-contain rounded-lg border-2 border-dashed border-slate-300 p-4 bg-white"
                      />
                      {previewLogo && (
                        <button
                          onClick={() => setPreviewLogo(null)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          title="Remove preview"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <p className="text-slate-600 mb-4">
                        Upload your company logo (PNG, JPG, SVG - max 5MB)
                      </p>
                      <label className="cursor-pointer inline-block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={isSaving}
                        />
                        <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-colors ${
                          isSaving
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                        }`}>
                          <Upload size={18} />
                          {isSaving ? 'Uploading...' : 'Upload Logo'}
                        </div>
                      </label>
                      <p className="text-xs text-slate-400 mt-2">
                        Recommended size: 400x200 pixels
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Branding Form */}
              <BrandingForm
                initialValues={brandSettings}
                onSubmit={handleSaveSettings}
                isSaving={isSaving}
              />
            </>
          )}

          {activeTab === 'appearance' && (
            <>
              {/* Color Scheme Presets */}
              <div className="mb-8">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Palette size={20} />
                  Color Schemes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {COLOR_SCHEMES.map((preset) => (
                    <div
                      key={preset.name}
                      onClick={() => handleApplyPreset(preset)}
                      className={`p-4 rounded-lg cursor-pointer border-2 transition-all ${
                        selectedScheme.name === preset.name
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-slate-800">{preset.label}</span>
                        {selectedScheme.name === preset.name && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-3">{preset.description}</p>
                      <div className="flex gap-2">
                        <div 
                          className="w-8 h-8 rounded" 
                          style={{ backgroundColor: preset.primaryColor }}
                        />
                        <div 
                          className="w-8 h-8 rounded" 
                          style={{ backgroundColor: preset.secondaryColor }}
                        />
                        <div 
                          className="w-8 h-8 rounded" 
                          style={{ backgroundColor: preset.accentColor }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div>
                <h3 className="text-lg font-bold mb-4">Custom Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Primary Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brandSettings.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        className="w-12 h-12 rounded cursor-pointer"
                        disabled={isSaving}
                      />
                      <input
                        type="text"
                        value={brandSettings.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        className="flex-1 p-2 border border-slate-200 rounded-lg font-mono text-sm"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Secondary Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brandSettings.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        className="w-12 h-12 rounded cursor-pointer"
                        disabled={isSaving}
                      />
                      <input
                        type="text"
                        value={brandSettings.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        className="flex-1 p-2 border border-slate-200 rounded-lg font-mono text-sm"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Accent Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brandSettings.accentColor}
                        onChange={(e) => handleColorChange('accentColor', e.target.value)}
                        className="w-12 h-12 rounded cursor-pointer"
                        disabled={isSaving}
                      />
                      <input
                        type="text"
                        value={brandSettings.accentColor}
                        onChange={(e) => handleColorChange('accentColor', e.target.value)}
                        className="flex-1 p-2 border border-slate-200 rounded-lg font-mono text-sm"
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'advanced' && (
            <>
              <h3 className="text-lg font-bold mb-4">Advanced Settings</h3>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Primary Font
                    </label>
                    <select
                      value={brandSettings.primaryFont}
                      onChange={(e) => saveSettings({ primaryFont: e.target.value })}
                      disabled={isSaving}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white disabled:bg-slate-100"
                    >
                      <option value="Inter, sans-serif">Inter (Default)</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Open Sans, sans-serif">Open Sans</option>
                      <option value="Montserrat, sans-serif">Montserrat</option>
                      <option value="Poppins, sans-serif">Poppins</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Secondary Font
                    </label>
                    <select
                      value={brandSettings.secondaryFont}
                      onChange={(e) => saveSettings({ secondaryFont: e.target.value })}
                      disabled={isSaving}
                      className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-slate-700 bg-white disabled:bg-slate-100"
                    >
                      <option value="Inter, sans-serif">Inter (Default)</option>
                      <option value="Roboto, sans-serif">Roboto</option>
                      <option value="Open Sans, sans-serif">Open Sans</option>
                      <option value="Montserrat, sans-serif">Montserrat</option>
                      <option value="Poppins, sans-serif">Poppins</option>
                    </select>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Display Options</h4>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={brandSettings.showCompanyName}
                          onChange={(e) => saveSettings({ showCompanyName: e.target.checked })}
                          disabled={isSaving}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 font-medium">
                          Show company name in sidebar
                        </span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={brandSettings.showTagline}
                          onChange={(e) => saveSettings({ showTagline: e.target.checked })}
                          disabled={isSaving}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 font-medium">
                          Show tagline in header
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Current Theme Colors</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Primary</div>
                        <div 
                          className="w-full h-8 rounded"
                          style={{ backgroundColor: themeColors.primary }}
                        />
                        <div className="text-xs font-mono text-center mt-1">{themeColors.primary}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Secondary</div>
                        <div 
                          className="w-full h-8 rounded"
                          style={{ backgroundColor: themeColors.secondary }}
                        />
                        <div className="text-xs font-mono text-center mt-1">{themeColors.secondary}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Accent</div>
                        <div 
                          className="w-full h-8 rounded"
                          style={{ backgroundColor: themeColors.accent }}
                        />
                        <div className="text-xs font-mono text-center mt-1">{themeColors.accent}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;