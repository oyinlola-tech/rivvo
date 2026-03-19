import { useState } from 'react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export function AdminSettings() {
  const [settings, setSettings] = useState({
    allowRegistration: true,
    requireEmailVerification: true,
    maxGroupSize: 256,
    maxFileSize: 10,
    enableVoiceCalls: true,
    enableVideoCalls: true,
    enableStatus: true,
  });

  const handleSave = () => {
    toast.success('Settings saved successfully');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl text-foreground mb-2">Platform Settings</h2>
            <p className="text-sm text-muted-foreground">Configure platform-wide settings and features</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            <Save className="w-5 h-5" />
            <span>Save Changes</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* User Registration */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg text-foreground mb-4">User Registration</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground">Allow New Registrations</p>
                <p className="text-sm text-muted-foreground">Enable or disable new user sign-ups</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowRegistration}
                  onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground">Require Email Verification</p>
                <p className="text-sm text-muted-foreground">Users must verify their email with OTP</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.requireEmailVerification}
                  onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg text-foreground mb-4">Features</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground">Voice Calls</p>
                <p className="text-sm text-muted-foreground">Enable voice calling feature</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableVoiceCalls}
                  onChange={(e) => setSettings({ ...settings, enableVoiceCalls: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground">Video Calls</p>
                <p className="text-sm text-muted-foreground">Enable video calling feature</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableVideoCalls}
                  onChange={(e) => setSettings({ ...settings, enableVideoCalls: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground">Status/Stories</p>
                <p className="text-sm text-muted-foreground">Enable status updates feature</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.enableStatus}
                  onChange={(e) => setSettings({ ...settings, enableStatus: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Limits */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg text-foreground mb-4">Limits</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Max Group Size
              </label>
              <input
                type="number"
                value={settings.maxGroupSize}
                onChange={(e) => setSettings({ ...settings, maxGroupSize: parseInt(e.target.value) })}
                min={2}
                max={1000}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                Max File Size (MB)
              </label>
              <input
                type="number"
                value={settings.maxFileSize}
                onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })}
                min={1}
                max={100}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
