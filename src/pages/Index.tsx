
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle, 
  TrendingUp,
  Clock,
  Settings as SettingsIcon,
  Shield,
  Database,
  FileCheck,
  FileText
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import StatsCard from '@/components/StatsCard';

import PrescriptionTable from '@/components/PrescriptionTable';
import ClaimMonitoring from '@/components/ClaimMonitoring';
import LogsRequestResponse from '@/components/LogsRequestResponse';
import MedicineMapping from '@/components/MedicineMapping';
import SepPharmacyData from '@/components/SepPharmacyData';
import Settings from '@/components/Settings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const { token, logout, user } = useAuth();
  const [stats, setStats] = useState({
    totalResepHariIni: 24,
    klaimDisetujui: 18,
    menungguVerifikasi: 6,
    pasienAktif: 142
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) {
        setStatsError('No authentication token found');
        setIsLoadingStats(false);
        return;
      }

      try {
        setIsLoadingStats(true);
        setStatsError(null);
        
        const response = await fetch('http://localhost:3001/api/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setStats(result.data);
          } else {
            setStatsError(result.message || 'Failed to load statistics');
          }
        } else if (response.status === 403 || response.status === 401) {
          // Token expired or invalid, logout user
          setStatsError('Session expired. Please login again.');
          setTimeout(() => {
            logout();
          }, 2000);
        } else {
          setStatsError(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Failed to load stats:', error);
        setStatsError('Network error: Unable to connect to server');
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, [token, logout]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="w-fullcontainer mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <div className="gradient-card p-4 sm:p-6 rounded-lg border">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-lg">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                  Selamat Datang di Sistem Bridging BPJS Apotek
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1">
                  Kelola resep, klaim obat, dan sinkronisasi data pasien dengan mudah dan efisien
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsError ? (
            <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-red-600 mr-2">⚠️</div>
                <div>
                  <h3 className="text-red-800 font-medium">Error Loading Statistics</h3>
                  <p className="text-red-600 text-sm">{statsError}</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <StatsCard
                title="Total Resep Hari Ini"
                value={isLoadingStats ? "..." : stats.totalResepHariIni.toString()}
                change={stats.totalResepHariIni > 0 ? `${stats.totalResepHariIni} resep hari ini` : "Belum ada resep"}
                changeType={stats.totalResepHariIni > 0 ? "positive" : "neutral"}
                icon={TrendingUp}
                color="primary"
              />
              <StatsCard
                title="Klaim Disetujui"
                value={isLoadingStats ? "..." : stats.klaimDisetujui.toString()}
                change={stats.klaimDisetujui > 0 ? `${Math.round((stats.klaimDisetujui / (stats.klaimDisetujui + stats.menungguVerifikasi)) * 100)}% approval rate` : "Belum ada klaim"}
                changeType={stats.klaimDisetujui > 0 ? "positive" : "neutral"}
                icon={CheckCircle}
                color="success"
              />
              <StatsCard
                title="Menunggu Verifikasi"
                value={isLoadingStats ? "..." : stats.menungguVerifikasi.toString()}
                change={stats.menungguVerifikasi > 0 ? `${stats.menungguVerifikasi} klaim pending` : "Tidak ada pending"}
                changeType={stats.menungguVerifikasi > 0 ? "negative" : "positive"}
                icon={Clock}
                color="pending"
              />
              <StatsCard
                title="Pasien Aktif"
                value={isLoadingStats ? "..." : stats.pasienAktif.toString()}
                change={stats.pasienAktif > 0 ? `${stats.pasienAktif} pasien terdaftar` : "Belum ada pasien"}
                changeType={stats.pasienAktif > 0 ? "positive" : "neutral"}
                icon={Users}
                color="primary"
              />
            </>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="sep-data" className="space-y-4 sm:space-y-6">
          {/* Mobile: Horizontal scrollable tabs */}
          <div className="sm:hidden">
            <div className="relative">
              <div className="overflow-x-auto scrollbar-hide">
                <TabsList className="inline-flex h-12 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground min-w-max">
                  <TabsTrigger 
                    value="sep-data" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[80px]"
                  >
                    <FileCheck className="w-4 h-4 mr-2" />
                    <span>SEP</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="mapping" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[80px]"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    <span>Mapping</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="monitoring" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[80px]"
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    <span>Monitor</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="logs" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[80px]"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    <span>Logs</span>
                  </TabsTrigger>
                  {user?.role !== 'operator' && (
                    <TabsTrigger 
                      value="settings" 
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm min-w-[80px]"
                    >
                      <SettingsIcon className="w-4 h-4 mr-2" />
                      <span>Setting</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>
              {/* Scroll indicators */}
              <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-background to-transparent pointer-events-none"></div>
              <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-background to-transparent pointer-events-none"></div>
            </div>
          </div>
          
          {/* Desktop: Grid layout */}
          <div className="hidden sm:block">
            <TabsList className={`grid w-full gap-1 sm:gap-0 ${user?.role === 'operator' ? 'grid-cols-3 lg:grid-cols-4' : 'grid-cols-3 lg:grid-cols-5'}`}>
              <TabsTrigger value="sep-data" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                <FileCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Data SEP Apotek</span>
                <span className="sm:hidden">SEP</span>
              </TabsTrigger>
              <TabsTrigger value="mapping" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                <Database className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Mapping Obat</span>
                <span className="sm:hidden">Mapping</span>
              </TabsTrigger>
              <TabsTrigger value="monitoring" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Monitoring</span>
                <span className="sm:hidden">Monitor</span>
              </TabsTrigger>
              <TabsTrigger value="logs" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden lg:inline">Logs</span>
                <span className="lg:hidden">Log</span>
              </TabsTrigger>
              {user?.role !== 'operator' && (
                <TabsTrigger value="settings" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                  <SettingsIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden lg:inline">Pengaturan</span>
                  <span className="lg:hidden">Setting</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <TabsContent value="monitoring">
            <ClaimMonitoring />
          </TabsContent>

          <TabsContent value="logs">
            <LogsRequestResponse />
          </TabsContent>

          <TabsContent value="mapping">
            <MedicineMapping />
          </TabsContent>

          <TabsContent value="sep-data">
            <SepPharmacyData />
          </TabsContent>

          {user?.role !== 'operator' && (
            <TabsContent value="settings">
              <Settings />
            </TabsContent>
          )}

        </Tabs>
      </main>
    </div>
  );
};

export default Index;
