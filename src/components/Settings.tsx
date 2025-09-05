import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Eye, EyeOff, Key, Globe, Shield, Loader2, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { token } = useAuth();
  const [showConsumerSecret, setShowConsumerSecret] = useState(false);
  const [showUserKey, setShowUserKey] = useState(false);
  const [showSimrsPassword, setShowSimrsPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingSimrs, setIsTestingSimrs] = useState(false);
  const [isSavingSimrs, setIsSavingSimrs] = useState(false);
  const [settings, setSettings] = useState({
    baseUrl: 'https://apijkn-dev.bpjs-kesehatan.go.id/vclaim-rest-dev',
    consumerID: '',
    consumerSecret: '',
    userKey: '',
    kodePpkApotek: '',
    environment: 'development',
    timeout: 30,
    retryAttempts: 3
  });
  
  const [bridgingSimrs, setBridgingSimrs] = useState(false);
  const [simrsSettings, setSimrsSettings] = useState({
    host: '',
    port: 3306,
    database: '',
    username: '',
    password: '',
    simrs_type: 'mLITE'
  });

  // Fetch settings from backend
  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3001/api/settings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.bpjs_settings) {
          setSettings(data.data.bpjs_settings);
        }
        if (data.success && data.data.bridging_simrs !== undefined) {
          setBridgingSimrs(data.data.bridging_simrs);
        }
        if (data.success && data.data.simrs_settings) {
          setSimrsSettings(data.data.simrs_settings);
        }
      } else if (response.status === 404) {
        // Settings not found, use default values
        console.log('Settings not found, using defaults');
      } else {
        toast.error('Gagal memuat pengaturan');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Gagal memuat pengaturan');
    } finally {
      setIsLoading(false);
    }
  };

  // Load settings on component mount
  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

  const handleInputChange = (field: string, value: string | number) => {
    setSettings(prev => {
      const newSettings = { ...prev, [field]: value };
      
      // Auto-update Base URL when environment changes
      if (field === 'environment') {
        if (value === 'development') {
          newSettings.baseUrl = 'https://apijkn-dev.bpjs-kesehatan.go.id/apotek-rest-dev';
        } else if (value === 'production') {
          newSettings.baseUrl = 'https://apijkn.bpjs-kesehatan.go.id/apotek-rest';
        }
      }
      
      return newSettings;
    });
  };

  const handleSave = async () => {
    if (!settings.consumerID || !settings.consumerSecret || !settings.userKey || !settings.kodePpkApotek) {
      toast.error('Mohon lengkapi semua kredensial yang diperlukan');
      return;
    }
    
    try {
      setIsSaving(true);
      const response = await fetch('http://localhost:3001/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bpjs_settings: settings,
          bridging_simrs: bridgingSimrs,
          simrs_settings: simrsSettings
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Pengaturan berhasil disimpan');
      } else {
        toast.error(data.message || 'Gagal menyimpan pengaturan');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBridgingSimrsToggle = async (checked: boolean) => {
    setBridgingSimrs(checked);
    
    try {
      const response = await fetch('http://localhost:3001/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bpjs_settings: settings,
          bridging_simrs: checked,
          simrs_settings: simrsSettings
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(`Bridging SIMRS ${checked ? 'diaktifkan' : 'dinonaktifkan'}`);
      } else {
        // Revert the toggle if save failed
        setBridgingSimrs(!checked);
        toast.error(data.message || 'Gagal menyimpan pengaturan bridging SIMRS');
      }
    } catch (error) {
      console.error('Error saving bridging SIMRS setting:', error);
      // Revert the toggle if save failed
      setBridgingSimrs(!checked);
      toast.error('Gagal menyimpan pengaturan bridging SIMRS');
    }
  };

  const testConnection = async () => {
    if (!settings.consumerID || !settings.consumerSecret || !settings.userKey || !settings.kodePpkApotek) {
      toast.error('Mohon lengkapi kredensial terlebih dahulu');
      return;
    }

    try {
      setIsTesting(true);
      toast.info('Menguji koneksi ke BPJS...');
      
      const response = await fetch('http://localhost:3001/api/settings/test-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          baseUrl: settings.baseUrl,
          consumerID: settings.consumerID,
          consumerSecret: settings.consumerSecret,
          userKey: settings.userKey,
          kodePpkApotek: settings.kodePpkApotek
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(data.message || 'Koneksi ke BPJS berhasil!');
      } else {
        toast.error(data.message || 'Gagal menguji koneksi ke BPJS');
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Gagal menguji koneksi ke BPJS');
    } finally {
      setIsTesting(false);
    }
  };

  const testSimrsConnection = async () => {
    if (!simrsSettings.host || !simrsSettings.database || !simrsSettings.username || !simrsSettings.password) {
      toast.error('Mohon lengkapi semua field koneksi database');
      return;
    }

    try {
      setIsTestingSimrs(true);
      toast.info('Menguji koneksi ke database SIMRS...');
      
      const response = await fetch('http://localhost:3001/api/settings/test-simrs-connection', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(simrsSettings)
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(data.message || 'Koneksi ke database SIMRS berhasil!');
      } else {
        toast.error(data.message || 'Gagal menguji koneksi ke database SIMRS');
      }
    } catch (error) {
      console.error('Error testing SIMRS connection:', error);
      toast.error('Gagal menguji koneksi ke database SIMRS');
    } finally {
      setIsTestingSimrs(false);
    }
  };

  const saveSimrsSettings = async () => {
    if (!simrsSettings.host || !simrsSettings.database || !simrsSettings.username || !simrsSettings.password) {
      toast.error('Mohon lengkapi semua field koneksi database');
      return;
    }
    
    if (bridgingSimrs && !simrsSettings.simrs_type) {
      toast.error('Mohon pilih tipe SIMRS');
      return;
    }
    
    try {
      setIsSavingSimrs(true);
      const response = await fetch('http://localhost:3001/api/settings/simrs', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          simrs_settings: simrsSettings,
          bridging_simrs: bridgingSimrs
        })
      });

      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success('Pengaturan SIMRS berhasil disimpan');
      } else {
        toast.error(data.message || 'Gagal menyimpan pengaturan SIMRS');
      }
    } catch (error) {
      console.error('Error saving SIMRS settings:', error);
      toast.error('Gagal menyimpan pengaturan SIMRS');
    } finally {
      setIsSavingSimrs(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Memuat pengaturan...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <span>Pengaturan Bridging BPJS</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Environment Selection */}
          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Select value={settings.environment} onValueChange={(value) => handleInputChange('environment', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">DEV</Badge>
                    <span>Development</span>
                  </div>
                </SelectItem>
                <SelectItem value="production">
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-green-100 text-green-800">PROD</Badge>
                    <span>Production</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="baseUrl"
                value={settings.baseUrl}
                onChange={(e) => handleInputChange('baseUrl', e.target.value)}
                placeholder="https://apijkn-dev.bpjs-kesehatan.go.id/apotek-rest-dev"
                className="pl-10"
              />
            </div>
          </div>

          {/* Consumer ID */}
          <div className="space-y-2">
            <Label htmlFor="consumerID">Consumer ID</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="consumerID"
                value={settings.consumerID}
                onChange={(e) => handleInputChange('consumerID', e.target.value)}
                placeholder="Masukkan Consumer ID"
                className="pl-10"
              />
            </div>
          </div>

          {/* Consumer Secret */}
          <div className="space-y-2">
            <Label htmlFor="consumerSecret">Consumer Secret</Label>
            <div className="relative">
              <Shield className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="consumerSecret"
                type={showConsumerSecret ? 'text' : 'password'}
                value={settings.consumerSecret}
                onChange={(e) => handleInputChange('consumerSecret', e.target.value)}
                placeholder="Masukkan Consumer Secret"
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={() => setShowConsumerSecret(!showConsumerSecret)}
              >
                {showConsumerSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* User Key */}
          <div className="space-y-2">
            <Label htmlFor="userKey">User Key</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="userKey"
                type={showUserKey ? 'text' : 'password'}
                value={settings.userKey}
                onChange={(e) => handleInputChange('userKey', e.target.value)}
                placeholder="Masukkan User Key"
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={() => setShowUserKey(!showUserKey)}
              >
                {showUserKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Kode PPK Apotek */}
          <div className="space-y-2">
            <Label htmlFor="kodePpkApotek">Kode PPK Apotek</Label>
            <div className="relative">
              <Key className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                id="kodePpkApotek"
                value={settings.kodePpkApotek}
                onChange={(e) => handleInputChange('kodePpkApotek', e.target.value)}
                placeholder="Masukkan Kode PPK Apotek"
                className="pl-10"
              />
            </div>
          </div>

          {/* Connection Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (detik)</Label>
              <Input
                id="timeout"
                type="number"
                value={settings.timeout}
                onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || 30)}
                placeholder="30"
                min="5"
                max="120"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retryAttempts">Retry Attempts</Label>
              <Input
                id="retryAttempts"
                type="number"
                value={settings.retryAttempts}
                onChange={(e) => handleInputChange('retryAttempts', parseInt(e.target.value) || 3)}
                placeholder="3"
                min="1"
                max="10"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={testConnection}
              disabled={isTesting || isSaving}
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Koneksi'
              )}
            </Button>
            <Button 
              type="button" 
              onClick={handleSave} 
              className="gradient-primary"
              disabled={isSaving || isTesting}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Simpan Pengaturan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bridging SIMRS Card */}
      <Card className="medical-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>Bridging SIMRS</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="bridging-simrs">Aktifkan Bridging SIMRS</Label>
              <p className="text-sm text-muted-foreground">
                Mengaktifkan integrasi dengan Sistem Informasi Manajemen Rumah Sakit (SIMRS)
              </p>
            </div>
            <Switch
              id="bridging-simrs"
              checked={bridgingSimrs}
              onCheckedChange={handleBridgingSimrsToggle}
            />
          </div>
          
          {bridgingSimrs && (
            <div className="mt-4 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-2">
                  <Database className="w-4 h-4 mt-0.5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Bridging SIMRS Aktif</p>
                    <p className="text-sm text-blue-700">
                      Sistem akan melakukan sinkronisasi data dengan SIMRS secara otomatis.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Jenis SIMRS */}
              <div className="space-y-2">
                <Label htmlFor="jenis-simrs">Jenis SIMRS</Label>
                <Select 
                  value={simrsSettings.simrs_type}
                  onValueChange={(value) => setSimrsSettings(prev => ({ ...prev, simrs_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis SIMRS" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mLITE">mLITE</SelectItem>
                    <SelectItem value="Khanza">Khanza</SelectItem>
                    <SelectItem value="SIMGOS">SIMGOS</SelectItem>
                    <SelectItem value="Vendor Lain">Vendor Lain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Koneksi MySQL */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Pengaturan Koneksi MySQL</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mysql-host">Host</Label>
                    <Input
                      id="mysql-host"
                      value={simrsSettings.host}
                      onChange={(e) => setSimrsSettings(prev => ({ ...prev, host: e.target.value }))}
                      placeholder="localhost"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mysql-port">Port</Label>
                    <Input
                      id="mysql-port"
                      type="number"
                      value={simrsSettings.port}
                      onChange={(e) => setSimrsSettings(prev => ({ ...prev, port: parseInt(e.target.value) || 3306 }))}
                      placeholder="3306"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mysql-database">Database</Label>
                  <Input
                    id="mysql-database"
                    value={simrsSettings.database}
                    onChange={(e) => setSimrsSettings(prev => ({ ...prev, database: e.target.value }))}
                    placeholder="Nama database SIMRS"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mysql-username">Username</Label>
                    <Input
                      id="mysql-username"
                      value={simrsSettings.username}
                      onChange={(e) => setSimrsSettings(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Username database"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mysql-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="mysql-password"
                        type={showSimrsPassword ? 'text' : 'password'}
                        value={simrsSettings.password}
                        onChange={(e) => setSimrsSettings(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Password database"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSimrsPassword(!showSimrsPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showSimrsPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                 </div>
                 
                 {/* Action Buttons */}
                 <div className="flex justify-end space-x-2 pt-4">
                   <Button 
                     type="button" 
                     variant="outline" 
                     onClick={testSimrsConnection}
                     disabled={isTestingSimrs || isSavingSimrs}
                   >
                     {isTestingSimrs ? (
                       <>
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                         Testing...
                       </>
                     ) : (
                       'Test Koneksi'
                     )}
                   </Button>
                   <Button 
                     type="button" 
                     onClick={saveSimrsSettings} 
                     className="gradient-primary"
                     disabled={isSavingSimrs || isTestingSimrs}
                   >
                     {isSavingSimrs ? (
                       <>
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                         Menyimpan...
                       </>
                     ) : (
                       <>
                         <Save className="w-4 h-4 mr-2" />
                         Simpan Pengaturan
                       </>
                     )}
                   </Button>
                 </div>
               </div>
             </div>
           )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Informasi Penting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 mt-0.5 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">Keamanan Kredensial</p>
              <p>Kredensial disimpan secara lokal dan dienkripsi. Pastikan tidak membagikan informasi ini kepada pihak yang tidak berwenang.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <Globe className="w-4 h-4 mt-0.5 text-blue-500" />
            <div>
              <p className="font-medium text-foreground">Environment</p>
              <p>Gunakan Development untuk testing dan Production untuk operasional live. Pastikan kredensial sesuai dengan environment yang dipilih.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;