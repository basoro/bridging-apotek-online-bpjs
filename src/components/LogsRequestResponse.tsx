import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Search, Download, Eye, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  operation: string;
  method: string;
  endpoint: string;
  requestHeaders: Record<string, string>;
  requestBody?: any;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseBody: any;
  duration: number;
  success: boolean;
}

const LogsRequestResponse = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [operationFilter, setOperationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch logs from API
  const fetchLogs = async (reset = true) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const currentOffset = reset ? 0 : offset;
      const response = await fetch(`http://localhost:3001/api/logs?limit=${LIMIT}&offset=${currentOffset}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        const newLogs = result.data || [];
        if (reset) {
          setLogs(newLogs);
        } else {
          setLogs(prevLogs => [...prevLogs, ...newLogs]);
        }
        setHasMore(result.pagination?.hasMore || false);
        setOffset(currentOffset + LIMIT);
      } else {
        console.error('Failed to fetch logs:', result.message);
        if (reset) setLogs([]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      if (reset) setLogs([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more logs for infinity scroll
  const loadMoreLogs = () => {
    if (!loadingMore && hasMore) {
      fetchLogs(false);
    }
  };

  // Handle scroll event for infinity scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom && hasMore && !loadingMore && !loading) {
      loadMoreLogs();
    }
  }, [hasMore, loadingMore, loading]);

  useEffect(() => {
    fetchLogs(true);
  }, []);

  // Reset and reload logs when filters change
  useEffect(() => {
    if (searchTerm || operationFilter !== 'all' || statusFilter !== 'all') {
      // For filtered data, we need to load all logs first then filter client-side
      // This is a simplified approach - in production you might want server-side filtering
      setOffset(0);
      setHasMore(true);
    }
  }, [searchTerm, operationFilter, statusFilter]);

  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.endpoint.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (operationFilter !== 'all') {
      filtered = filtered.filter(log => log.operation === operationFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'success') {
        filtered = filtered.filter(log => log.success);
      } else if (statusFilter === 'error') {
        filtered = filtered.filter(log => !log.success);
      }
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, operationFilter, statusFilter]);

  const handleRefresh = () => {
    fetchLogs(true);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('id-ID');
  };

  const getStatusBadge = (success: boolean, status: number) => {
    if (success) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />{status}</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />{status}</Badge>;
    }
  };

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `logs_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-base sm:text-lg">Logs Request & Response</span>
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={exportLogs} variant="outline" size="sm" className="flex-1 sm:flex-none">
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
              </Button>
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading} className="flex-1 sm:flex-none">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Cari berdasarkan operasi atau endpoint..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 sm:gap-4">
              <Select value={operationFilter} onValueChange={setOperationFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter Operasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Operasi</SelectItem>
                  <SelectItem value="Get SEP Data">Get SEP Data</SelectItem>
                  <SelectItem value="Kirim Resep">Kirim Resep</SelectItem>
                  <SelectItem value="Kirim Obat">Kirim Obat</SelectItem>
                  <SelectItem value="Get DPHO">Get DPHO</SelectItem>
                  <SelectItem value="Get Monitoring Klaim">Get Monitoring Klaim</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="success">Sukses</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
            {/* Logs List */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Daftar Logs ({filteredLogs.length})</h3>
              <ScrollArea 
                ref={scrollAreaRef}
                className="h-80 sm:h-96 border rounded-lg"
                onScrollCapture={handleScroll}
              >
                <div className="space-y-2 p-2 sm:p-4">
                  {filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2 sm:p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedLog?.id === log.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs sm:text-sm truncate">{log.operation}</h4>
                          <p className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</p>
                        </div>
                        <div className="ml-2 flex-shrink-0">
                          {getStatusBadge(log.success, log.responseStatus)}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 text-xs">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs truncate">
                          {log.method} {log.endpoint}
                        </span>
                        <span className="text-gray-500 text-right">{log.duration}ms</span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Load More Button */}
                  {hasMore && filteredLogs.length > 0 && (
                    <div className="flex justify-center py-4">
                      <Button 
                        onClick={loadMoreLogs} 
                        variant="outline" 
                        size="sm" 
                        disabled={loadingMore}
                        className="w-full max-w-xs"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Memuat...
                          </>
                        ) : (
                          'Muat Lebih Banyak'
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {filteredLogs.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-500">
                      Tidak ada logs yang ditemukan
                    </div>
                  )}
                  
                  {loading && filteredLogs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      Memuat logs...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Log Detail */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Detail Log</h3>
              {selectedLog ? (
                <ScrollArea className="h-80 sm:h-96 border rounded-lg">
                  <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
                    <div>
                      <h4 className="font-medium mb-2 text-sm sm:text-base">Informasi Umum</h4>
                      <div className="bg-gray-50 p-2 sm:p-3 rounded text-xs sm:text-sm space-y-1">
                        <div><strong>Operasi:</strong> {selectedLog.operation}</div>
                        <div><strong>Timestamp:</strong> {formatTimestamp(selectedLog.timestamp)}</div>
                        <div><strong>Method:</strong> {selectedLog.method}</div>
                        <div className="break-all"><strong>Endpoint:</strong> {selectedLog.endpoint}</div>
                        <div><strong>Duration:</strong> {selectedLog.duration}ms</div>
                        <div><strong>Status:</strong> {getStatusBadge(selectedLog.success, selectedLog.responseStatus)}</div>
                      </div>
                    </div>

                    <Tabs defaultValue="request" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 text-xs sm:text-sm">
                        <TabsTrigger value="request" className="text-xs sm:text-sm">Request</TabsTrigger>
                        <TabsTrigger value="response" className="text-xs sm:text-sm">Response</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="request" className="space-y-2 sm:space-y-3">
                        <div>
                          <h5 className="font-medium mb-2 text-xs sm:text-sm">Headers</h5>
                          <pre className="bg-gray-50 p-2 sm:p-3 rounded text-xs overflow-x-auto max-h-32 sm:max-h-40">
                            {JSON.stringify(selectedLog.requestHeaders, null, 2)}
                          </pre>
                        </div>
                        {selectedLog.requestBody && (
                          <div>
                            <h5 className="font-medium mb-2 text-xs sm:text-sm">Body</h5>
                            <pre className="bg-gray-50 p-2 sm:p-3 rounded text-xs overflow-x-auto max-h-32 sm:max-h-40">
                              {JSON.stringify(selectedLog.requestBody, null, 2)}
                            </pre>
                          </div>
                        )}
                      </TabsContent>
                      
                      <TabsContent value="response" className="space-y-2 sm:space-y-3">
                        <div>
                          <h5 className="font-medium mb-2 text-xs sm:text-sm">Headers</h5>
                          <pre className="bg-gray-50 p-2 sm:p-3 rounded text-xs overflow-x-auto max-h-32 sm:max-h-40">
                            {JSON.stringify(selectedLog.responseHeaders, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <h5 className="font-medium mb-2 text-xs sm:text-sm">Body</h5>
                          <pre className="bg-gray-50 p-2 sm:p-3 rounded text-xs overflow-x-auto max-h-32 sm:max-h-40">
                            {JSON.stringify(selectedLog.responseBody, null, 2)}
                          </pre>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-80 sm:h-96 border rounded-lg flex items-center justify-center text-gray-500">
                  <div className="text-center p-4">
                    <Eye className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm sm:text-base">Pilih log untuk melihat detail</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LogsRequestResponse;