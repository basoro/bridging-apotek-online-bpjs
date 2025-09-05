
import React, { useState } from 'react';
import { Database, Search, Plus, Edit, Trash2, Save, X, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface MedicineMappingData {
  id: string;
  localCode: string;
  localName: string;
  bpjsCode: string;
  bpjsName: string;
  status: 'active' | 'inactive' | 'pending';
  lastSync: string;
}

interface ObatLokalData {
  kode_brng: string;
  nama_brng: string;
  kode_sat: string;
  letak_barang: string;
  expire: string;
  status: string;
}

interface DphoData {
  kodeobat: string;
  namaobat: string;
  prb: string;
  kronis: string;
  kemo: string;
  harga: string;
  restriksi: string;
  generik: string;
  aktif: string | null;
}

const MedicineMapping: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MedicineMappingData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editMapping, setEditMapping] = useState({
    localCode: '',
    localName: '',
    bpjsCode: '',
    bpjsName: '',
    status: 'active' as 'active' | 'inactive' | 'pending'
  });
  const [isObatLokalModalOpen, setIsObatLokalModalOpen] = useState(false);
  const [obatLokalData, setObatLokalData] = useState<ObatLokalData[]>([]);
  const [obatLokalSearch, setObatLokalSearch] = useState('');
  const [isLoadingObatLokal, setIsLoadingObatLokal] = useState(false);
  const [isDphoModalOpen, setIsDphoModalOpen] = useState(false);
  const [dphoData, setDphoData] = useState<DphoData[]>([]);
  const [dphoSearch, setDphoSearch] = useState('');
  const [isLoadingDpho, setIsLoadingDpho] = useState(false);
  const [bridgingSimrs, setBridgingSimrs] = useState<boolean>(true);



  const [mappingData, setMappingData] = useState<MedicineMappingData[]>([]);
  const [newMapping, setNewMapping] = useState({
    localCode: '',
    localName: '',
    bpjsCode: '',
    bpjsName: ''
  });

  // Function to load existing mapping data from file
  const loadMappingData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/load-mapping');
      if (response.ok) {
        const data = await response.json();
        if (data.mappings && data.mappings.length > 0) {
          setMappingData(data.mappings);
        } else {
          // If no saved data, start with empty array
          setMappingData([]);
        }
      } else {
        // If file doesn't exist or error, start with empty array
        setMappingData([]);
      }
    } catch (error) {
      console.error('Error loading mapping data:', error);
      // If error, start with empty array
      setMappingData([]);
    }
  };

  // Load mapping data and settings on component mount
  React.useEffect(() => {
    loadMappingData();
    loadSettings();
  }, []);

  // Function to load settings
  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('http://localhost:3001/api/settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setBridgingSimrs(result.data.bridging_simrs || false);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveToObatLokal = async (obatData: ObatLokalData) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:3001/api/obat-lokal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(obatData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save to obat_lokal.json');
      }
    } catch (error) {
      console.error('Error saving to obat_lokal.json:', error);
    }
  };

  // Function to fetch obat lokal data from backend or local file
  const fetchObatLokal = async (search: string = '') => {
    setIsLoadingObatLokal(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      let result;
      
      if (bridgingSimrs) {
        // Fetch from SIMRS database via API
        const queryParams = new URLSearchParams();
        if (search) {
          queryParams.append('search', search);
        }
        queryParams.append('limit', '100');
        queryParams.append('offset', '0');

        const response = await fetch(`http://localhost:3001/api/obat-lokal?${queryParams}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch obat lokal data from SIMRS');
        }

        result = await response.json();
      } else {
        // Fetch from local file
        const response = await fetch('/data/obat_lokal.json');
        if (!response.ok) {
          throw new Error('Failed to fetch obat lokal data from local file');
        }
        
        const fileData = await response.json();
        
        // Filter data based on search term if provided
        let filteredData = fileData.query_result || [];
        if (search) {
          const searchLower = search.toLowerCase();
          filteredData = filteredData.filter((obat: any) => 
            obat.nama_brng?.toLowerCase().includes(searchLower) ||
            obat.kode_brng?.toLowerCase().includes(searchLower)
          );
        }
        
        // Transform to match expected format
        result = {
          success: true,
          data: filteredData.map((obat: any) => ({
            kode_brng: obat.kode_brng,
            nama_brng: obat.nama_brng,
            kode_sat: obat.kode_sat || '',
            letak_barang: obat.letak_barang || '',
            expire: obat.expire || '',
            status: obat.status || 'active'
          }))
        };
      }

      if (result.success) {
        setObatLokalData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch data');
      }
    } catch (error) {
      setObatLokalData([]);
    } finally {
      setIsLoadingObatLokal(false);
    }
  };

  // Function to handle obat lokal selection
  const handleObatLokalSelect = (obat: ObatLokalData) => {
    setNewMapping(prev => ({
      ...prev,
      localCode: obat.kode_brng,
      localName: obat.nama_brng
    }));
    setIsObatLokalModalOpen(false);
  };

  // Function to fetch DPHO data from BPJS API
  const fetchDpho = async (search: string = '') => {
    setIsLoadingDpho(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams();
      if (search) {
        queryParams.append('search', search);
      }
      queryParams.append('limit', '100');
      queryParams.append('offset', '0');

      const response = await fetch(`http://localhost:3001/api/dpho?${queryParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch DPHO data');
      }

      const result = await response.json();
      if (result.success) {
        setDphoData(result.data);
      } else {
        throw new Error(result.message || 'Failed to fetch DPHO data');
      }
    } catch (error) {
      console.error('Error fetching DPHO:', error);
      setDphoData([]);
    } finally {
      setIsLoadingDpho(false);
    }
  };

  // Function to handle DPHO selection
  const handleDphoSelect = (dpho: DphoData) => {
    setNewMapping(prev => ({
      ...prev,
      bpjsCode: dpho.kodeobat,
      bpjsName: dpho.namaobat
    }));
    setIsDphoModalOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { class: 'status-success', text: 'Aktif' },
      inactive: { class: 'status-error', text: 'Tidak Aktif' },
      pending: { class: 'status-pending', text: 'Pending' }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <Badge className={`status-badge ${config?.class || 'bg-gray-100 text-gray-800'}`}>
        {config?.text || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredMappingData = mappingData.filter(item => {
    const matchesFilter = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      item.localName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.localCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bpjsName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.bpjsCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const handleAddMapping = async () => {
    if (newMapping.localCode && newMapping.localName) {
      const mapping: MedicineMappingData = {
        id: Date.now().toString(),
        ...newMapping,
        status: newMapping.bpjsCode ? 'active' : 'pending',
        lastSync: new Date().toISOString()
      };
      
      const updatedMappingData = [...mappingData, mapping];
      setMappingData(updatedMappingData);
      
      // Save to JSON file
      await handleSaveAsJSON(updatedMappingData);
      
      // If bridging_simrs is false, also save to obat_lokal.json
      if (!bridgingSimrs) {
        await saveToObatLokal({
          kode_brng: newMapping.localCode,
          nama_brng: newMapping.localName,
          kode_sat: '-',
          letak_barang: '-',
          expire: '',
          status: 'active'
        });
      }
      
      setNewMapping({
        localCode: '',
        localName: '',
        bpjsCode: '',
        bpjsName: ''
      });
      setIsAddDialogOpen(false);
    }
  };

  const handleSyncToBPJS = (id: string) => {
    setMappingData(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status: 'active', lastSync: new Date().toISOString() }
        : item
    ));
  };

  const handleDeleteMapping = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus mapping obat ini?')) {
      const updatedMappingData = mappingData.filter(item => item.id !== id);
      setMappingData(updatedMappingData);
      
      // Save to JSON file
      await handleSaveAsJSON(updatedMappingData);
    }
  };

  const handleEditMapping = (item: MedicineMappingData) => {
    setEditingItem(item);
    setEditMapping({
      localCode: item.localCode,
      localName: item.localName,
      bpjsCode: item.bpjsCode,
      bpjsName: item.bpjsName,
      status: item.status
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateMapping = async () => {
    if (editingItem && editMapping.localCode && editMapping.localName) {
      const updatedMapping: MedicineMappingData = {
        ...editingItem,
        ...editMapping,
        lastSync: new Date().toISOString()
      };
      
      const updatedMappingData = mappingData.map(item => 
        item.id === editingItem.id ? updatedMapping : item
      );
      setMappingData(updatedMappingData);
      
      // Save to JSON file
      await handleSaveAsJSON(updatedMappingData);
      
      setEditMapping({
        localCode: '',
        localName: '',
        bpjsCode: '',
        bpjsName: '',
        status: 'active' as 'active' | 'inactive' | 'pending'
      });
      setEditingItem(null);
      setIsEditDialogOpen(false);
    }
  };

  const handleSaveAsJSON = async (dataToUse = mappingData) => {
    console.log('handleSaveAsJSON called');
    console.log('mappingData:', dataToUse);
    
    const dataToSave = {
      exportDate: new Date().toISOString(),
      totalMappings: dataToUse.length,
      mappings: dataToUse
    };
    
    console.log('dataToSave:', dataToSave);
    
    try {
       console.log('Sending request to /api/save-mapping');
       const response = await fetch('http://localhost:3001/api/save-mapping', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(dataToSave)
       });
       
       console.log('Response status:', response.status);
       console.log('Response ok:', response.ok);
       
       if (response.ok) {
         const responseText = await response.text();
         console.log('Response text:', responseText);
         
         if (responseText) {
           const result = JSON.parse(responseText);
           console.log('Success result:', result);
           alert(`✅ ${result.message}\n\nFile: ${result.fileName}\nTotal mapping: ${dataToSave.totalMappings} obat`);
         } else {
           alert('✅ Data berhasil disimpan ke mapping_obat.json');
         }
       } else {
         const errorText = await response.text();
         console.log('Error text:', errorText);
         alert(`❌ Gagal menyimpan data mapping. Status: ${response.status}`);
       }
     } catch (error) {
       console.error('Error saving mapping data:', error);
       alert('❌ Terjadi kesalahan saat menyimpan data ke file mapping_obat.json');
     }
  };

  return (
    <Card className="medical-card">
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <span className="text-base md:text-lg">Mapping Obat Lokal ke BPJS</span>
          </CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2 w-full sm:w-auto">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah Mapping</span>
                <span className="sm:hidden">Tambah</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tambah Mapping Obat Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="localCode">Kode Obat Lokal</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="localCode"
                      value={newMapping.localCode}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, localCode: e.target.value }))}
                      placeholder="Contoh: AMOX001"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsObatLokalModalOpen(true);
                        fetchObatLokal();
                      }}
                      className="whitespace-nowrap"
                    >
                      Fetch Obat Lokal
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="localName">Nama Obat Lokal</Label>
                  <Input
                    id="localName"
                    value={newMapping.localName}
                    onChange={(e) => setNewMapping(prev => ({ ...prev, localName: e.target.value }))}
                    placeholder="Contoh: Amoxicillin 500mg"
                  />
                </div>
                <div>
                  <Label htmlFor="bpjsCode">Kode BPJS (Opsional)</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="bpjsCode"
                      value={newMapping.bpjsCode}
                      onChange={(e) => setNewMapping(prev => ({ ...prev, bpjsCode: e.target.value }))}
                      placeholder="Contoh: 93001234"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDphoModalOpen(true);
                        fetchDpho();
                      }}
                      className="whitespace-nowrap"
                    >
                      Fetch DPHO
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="bpjsName">Nama BPJS (Opsional)</Label>
                  <Input
                    id="bpjsName"
                    value={newMapping.bpjsName}
                    onChange={(e) => setNewMapping(prev => ({ ...prev, bpjsName: e.target.value }))}
                    placeholder="Contoh: AMOXICILLIN 500 MG"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleAddMapping}>
                    Simpan
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog Edit Mapping */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Mapping Obat</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editLocalCode">Kode Obat Lokal</Label>
                  <Input
                    id="editLocalCode"
                    value={editMapping.localCode}
                    onChange={(e) => setEditMapping(prev => ({ ...prev, localCode: e.target.value }))}
                    placeholder="Contoh: AMOX001"
                  />
                </div>
                <div>
                  <Label htmlFor="editLocalName">Nama Obat Lokal</Label>
                  <Input
                    id="editLocalName"
                    value={editMapping.localName}
                    onChange={(e) => setEditMapping(prev => ({ ...prev, localName: e.target.value }))}
                    placeholder="Contoh: Amoxicillin 500mg"
                  />
                </div>
                <div>
                  <Label htmlFor="editBpjsCode">Kode BPJS (Opsional)</Label>
                  <Input
                    id="editBpjsCode"
                    value={editMapping.bpjsCode}
                    onChange={(e) => setEditMapping(prev => ({ ...prev, bpjsCode: e.target.value }))}
                    placeholder="Contoh: 93001234"
                  />
                </div>
                <div>
                   <Label htmlFor="editBpjsName">Nama BPJS (Opsional)</Label>
                   <Input
                     id="editBpjsName"
                     value={editMapping.bpjsName}
                     onChange={(e) => setEditMapping(prev => ({ ...prev, bpjsName: e.target.value }))}
                     placeholder="Contoh: AMOXICILLIN 500 MG KAPSUL"
                   />
                 </div>
                 <div>
                   <Label htmlFor="editStatus">Status</Label>
                   <Select
                     value={editMapping.status}
                     onValueChange={(value) => setEditMapping(prev => ({ ...prev, status: value as 'active' | 'inactive' | 'pending' }))}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Pilih status" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="active">Aktif</SelectItem>
                       <SelectItem value="inactive">Tidak Aktif</SelectItem>
                       <SelectItem value="pending">Pending</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleUpdateMapping}>
                    Update
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan nama obat atau kode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Tidak Aktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px] text-xs md:text-sm">Kode Lokal</TableHead>
                <TableHead className="min-w-[150px] text-xs md:text-sm">Nama Obat Lokal</TableHead>
                <TableHead className="min-w-[100px] text-xs md:text-sm hidden sm:table-cell">Kode BPJS</TableHead>
                <TableHead className="min-w-[150px] text-xs md:text-sm hidden md:table-cell">Nama BPJS</TableHead>

                <TableHead className="min-w-[80px] text-xs md:text-sm">Status</TableHead>
                <TableHead className="min-w-[120px] text-xs md:text-sm hidden xl:table-cell">Terakhir Sync</TableHead>
                <TableHead className="min-w-[100px] text-xs md:text-sm">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappingData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-xs md:text-sm">{item.localCode}</TableCell>
                  <TableCell className="text-xs md:text-sm">
                    <div>
                      <div className="font-medium">{item.localName}</div>
                      <div className="sm:hidden text-xs text-muted-foreground mt-1">
                        {item.bpjsCode ? `BPJS: ${item.bpjsCode}` : 'Belum dipetakan'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden sm:table-cell">
                    {item.bpjsCode || (
                      <span className="text-muted-foreground italic">Belum dipetakan</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell">
                    {item.bpjsName || (
                      <span className="text-muted-foreground italic">Belum dipetakan</span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs md:text-sm">{getStatusBadge(item.status)}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden xl:table-cell">{formatDate(item.lastSync)}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      {item.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSyncToBPJS(item.id)}
                          title="Sync ke BPJS"
                          className="h-8 w-8 p-0"
                        >
                          <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMapping(item)}
                        title="Edit"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMapping(item.id)}
                        title="Hapus"
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredMappingData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm md:text-base">Tidak ada data mapping yang ditemukan</p>
            <p className="text-xs md:text-sm">Tambah mapping obat baru atau ubah filter pencarian</p>
          </div>
        )}

        {/* Modal Obat Lokal */}
        <Dialog open={isObatLokalModalOpen} onOpenChange={setIsObatLokalModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pilih Obat Lokal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari obat berdasarkan nama atau kode..."
                  value={obatLokalSearch}
                  onChange={(e) => {
                    setObatLokalSearch(e.target.value);
                    fetchObatLokal(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
              
              {/* Loading State */}
              {isLoadingObatLokal && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Memuat data obat...</p>
                </div>
              )}
              
              {/* Data Table */}
              {!isLoadingObatLokal && (
                <div className="border rounded-lg overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm">Kode</TableHead>
                        <TableHead className="text-xs md:text-sm">Nama Obat</TableHead>
                        <TableHead className="text-xs md:text-sm hidden md:table-cell">Satuan</TableHead>
                        <TableHead className="text-xs md:text-sm hidden lg:table-cell">Letak</TableHead>
                        <TableHead className="text-xs md:text-sm">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {obatLokalData.map((obat, index) => (
                        <TableRow 
                          key={index} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleObatLokalSelect(obat)}
                        >
                          <TableCell className="font-medium text-xs md:text-sm">{obat.kode_brng}</TableCell>
                          <TableCell className="text-xs md:text-sm">{obat.nama_brng}</TableCell>
                          <TableCell className="text-xs md:text-sm hidden md:table-cell">{obat.kode_sat}</TableCell>
                          <TableCell className="text-xs md:text-sm hidden lg:table-cell">{obat.letak_barang}</TableCell>
                          <TableCell className="text-xs md:text-sm">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleObatLokalSelect(obat);
                              }}
                            >
                              Pilih
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* No Data */}
              {!isLoadingObatLokal && obatLokalData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm md:text-base">Tidak ada data obat ditemukan</p>
                  <p className="text-xs md:text-sm">Coba ubah kata kunci pencarian</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal DPHO */}
        <Dialog open={isDphoModalOpen} onOpenChange={setIsDphoModalOpen}>
          <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Pilih Obat DPHO</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari obat berdasarkan nama, kode, atau generik..."
                  value={dphoSearch}
                  onChange={(e) => {
                    setDphoSearch(e.target.value);
                    fetchDpho(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
              
              {/* Loading State */}
              {isLoadingDpho && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Memuat data DPHO...</p>
                </div>
              )}
              
              {/* Data Table */}
              {!isLoadingDpho && (
                <div className="border rounded-lg overflow-x-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm">Kode</TableHead>
                        <TableHead className="text-xs md:text-sm">Nama Obat</TableHead>
                        <TableHead className="text-xs md:text-sm hidden md:table-cell">Generik</TableHead>
                        <TableHead className="text-xs md:text-sm hidden lg:table-cell">Harga</TableHead>
                        <TableHead className="text-xs md:text-sm hidden lg:table-cell">PRB</TableHead>
                        <TableHead className="text-xs md:text-sm hidden xl:table-cell">Kronis</TableHead>
                        <TableHead className="text-xs md:text-sm">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dphoData.map((dpho, index) => (
                        <TableRow 
                          key={index} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleDphoSelect(dpho)}
                        >
                          <TableCell className="font-medium text-xs md:text-sm">{dpho.kodeobat}</TableCell>
                          <TableCell className="text-xs md:text-sm">{dpho.namaobat}</TableCell>
                          <TableCell className="text-xs md:text-sm hidden md:table-cell">{dpho.generik}</TableCell>
                          <TableCell className="text-xs md:text-sm hidden lg:table-cell">Rp {parseInt(dpho.harga).toLocaleString()}</TableCell>
                          <TableCell className="text-xs md:text-sm hidden lg:table-cell">
                            <Badge variant={dpho.prb === 'True' ? 'default' : 'secondary'}>
                              {dpho.prb === 'True' ? 'Ya' : 'Tidak'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm hidden xl:table-cell">
                            <Badge variant={dpho.kronis === 'True' ? 'default' : 'secondary'}>
                              {dpho.kronis === 'True' ? 'Ya' : 'Tidak'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDphoSelect(dpho);
                              }}
                            >
                              Pilih
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              {/* No Data */}
              {!isLoadingDpho && dphoData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm md:text-base">Tidak ada data DPHO ditemukan</p>
                  <p className="text-xs md:text-sm">Coba ubah kata kunci pencarian atau periksa pengaturan BPJS</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
};

export default MedicineMapping;
