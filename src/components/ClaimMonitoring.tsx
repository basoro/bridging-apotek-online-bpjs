import React, { useState } from 'react';
import { Search, Calendar, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ClaimData {
  nosepapotek: string;
  nosepaasal: string;
  nokapst: string;
  nmpst: string;
  noresep: string;
  nmjnsobat: string;
  tglpelayanan: string;
  biayapengajuan: string;
  biayasetujui: string;
}

interface ClaimResponse {
  jumlahdata: string;
  totalbiayapengajuan: string;
  totalbiayasetuju: string;
  listsep: ClaimData[];
}

const ClaimMonitoring: React.FC = () => {
  const [formData, setFormData] = useState({
    bulan: '',
    tahun: '',
    jenisObat: '',
    status: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState<ClaimResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const jenisObatOptions = [
    { value: '0', label: 'Semua' },
    { value: '1', label: 'Obat PRB' },
    { value: '2', label: 'Obat Kronis Blm Stabil' },
    { value: '3', label: 'Obat Kemoterapi' }
  ];

  const statusOptions = [
    { value: '0', label: 'Belum diverifikasi' },
    { value: '1', label: 'Sudah Verifikasi' }
  ];

  // Generate tahun options dari 5 tahun ke belakang sampai tahun sekarang
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= currentYear - 5; year--) {
      years.push({ value: year.toString(), label: year.toString() });
    }
    return years;
  };

  const yearOptions = generateYearOptions();

  // Helper function to format month without leading zero
  const formatMonth = (month: string) => {
    return parseInt(month, 10).toString();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: string) => {
    const num = parseInt(amount);
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getJenisObatLabel = (value: string) => {
    const option = jenisObatOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bulan || !formData.tahun || !formData.jenisObat || !formData.status) {
      setError('Semua field harus diisi');
      return;
    }

    setLoading(true);
    setError(null);
    setNotification(null);
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Token tidak ditemukan');
      }
      
      const response = await fetch(
         `http://localhost:3001/api/monitoring/klaim/${formatMonth(formData.bulan)}/${formData.tahun}/${formData.jenisObat}/${formData.status}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success) {
        setResponseData(result.data);
        // Tampilkan notifikasi berdasarkan responseBody message
        console.log('Checking dataRaw:', result.dataRaw);
        if (result.dataRaw?.metaData?.message) {
          console.log('Setting notification:', result.dataRaw.metaData.message);
          setNotification({
            type: result.dataRaw.metaData.code === '200' ? 'success' : 'info',
            message: result.dataRaw.metaData.message
          });
        } else {
          console.log('No metaData message found');
        }
      } else {
        throw new Error(result.message || 'Gagal mengambil data monitoring');
      }
    } catch (err) {
      console.error('Error fetching monitoring data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data';
      setError(errorMessage);
      setNotification({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      bulan: '',
      tahun: '',
      jenisObat: '',
      status: ''
    });
    setResponseData(null);
    setError(null);
    setNotification(null);
  };

  return (
    <Card className="medical-card">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-primary" />
          <span>Monitoring Klaim BPJS</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Form Input */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="bulan">Bulan</Label>
              <Select value={formData.bulan} onValueChange={(value) => handleInputChange('bulan', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih bulan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Januari</SelectItem>
                  <SelectItem value="2">Februari</SelectItem>
                  <SelectItem value="3">Maret</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">Mei</SelectItem>
                  <SelectItem value="6">Juni</SelectItem>
                  <SelectItem value="7">Juli</SelectItem>
                  <SelectItem value="8">Agustus</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">Oktober</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">Desember</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="tahun">Tahun</Label>
              <Select value={formData.tahun} onValueChange={(value) => handleInputChange('tahun', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="jenisObat">Jenis Obat</Label>
              <Select value={formData.jenisObat} onValueChange={(value) => handleInputChange('jenisObat', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis obat" />
                </SelectTrigger>
                <SelectContent>
                  {jenisObatOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 sm:justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  <span className="hidden sm:inline">Memuat...</span>
                  <span className="sm:hidden">Loading</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Cek Monitoring</span>
                  <span className="sm:hidden">Cari</span>
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset} className="sm:w-auto">
              Reset
            </Button>
          </div>
        </form>

        {/* Notification */}
        {notification && (
          <div className={`p-4 rounded-lg mb-6 flex items-center space-x-2 ${
            notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {notification.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {notification.type === 'info' && <AlertCircle className="w-5 h-5" />}
            <span>{notification.message}</span>
            <button 
              onClick={() => setNotification(null)}
              className="ml-auto text-sm underline hover:no-underline"
            >
              Tutup
            </button>
          </div>
        )}

        {/* API Endpoint Info */}
        {/* <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h4 className="font-medium mb-2">Endpoint API:</h4>
          <code className="text-sm bg-white p-2 rounded border block">
            GET {`{Base URL}/{Service Name}/monitoring/klaim/${formData.bulan || '{bulan}'}/${formData.tahun || '{tahun}'}/${formData.jenisObat || '{jenis_obat}'}/${formData.status || '{status}'}`}
          </code>
          <p className="text-sm text-gray-600 mt-2">
            Content-Type: application/json; charset=utf-8
          </p>
        </div> */}

        {/* Response Data */}
        {responseData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Jumlah Data</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-blue-600">
                  {responseData.jumlahdata || '-'}
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Total Biaya Pengajuan</span>
                </div>
                <p className="text-lg font-bold mt-1 text-green-600">
                  {formatCurrency(responseData.totalbiayapengajuan || '0')}
                </p>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="font-medium">Total Biaya Setuju</span>
                </div>
                <p className="text-lg font-bold mt-1 text-orange-600">
                  {formatCurrency(responseData.totalbiayasetuju || '0')}
                </p>
              </div>
            </div>

            {/* Data Table */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px] whitespace-nowrap">No SEP Apotek</TableHead>
                    <TableHead className="min-w-[150px] whitespace-nowrap">No SEP Asal</TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">No Kartu</TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">Nama Peserta</TableHead>
                    <TableHead className="min-w-[100px] whitespace-nowrap">No Resep</TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">Jenis Obat</TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">Tgl Pelayanan</TableHead>
                    <TableHead className="min-w-[130px] whitespace-nowrap">Biaya Pengajuan</TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">Biaya Setuju</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {responseData.listsep?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{item.nosepapotek}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{item.nosepaasal}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{item.nokapst}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{item.nmpst}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{item.noresep}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">{item.nmjnsobat}</Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{formatDate(item.tglpelayanan)}</TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium whitespace-nowrap">{formatCurrency(item.biayapengajuan)}</TableCell>
                      <TableCell className="text-xs sm:text-sm font-medium whitespace-nowrap">{formatCurrency(item.biayasetujui)}</TableCell>
                    </TableRow>
                  )) || []}
                </TableBody>
              </Table>
            </div>

            {/* Raw API Response Table */}
            {/* <div className="space-y-4">
              <h4 className="font-medium text-lg flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Respon API BPJS</span>
              </h4>
              
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Field</TableHead>
                      <TableHead className="min-w-[300px]">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Jumlah Data</TableCell>
                      <TableCell className="font-mono">{responseData.jumlahdata || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total Biaya Pengajuan</TableCell>
                      <TableCell className="font-mono">{responseData.totalbiayapengajuan || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Total Biaya Setuju</TableCell>
                      <TableCell className="font-mono">{responseData.totalbiayasetuju || '-'}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Timestamp Request</TableCell>
                      <TableCell className="font-mono">{new Date().toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div> */}

          </div>
        )}

        {responseData && responseData.listsep?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Tidak ada data klaim yang ditemukan</p>
            <p className="text-sm">Coba ubah parameter pencarian</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ClaimMonitoring;