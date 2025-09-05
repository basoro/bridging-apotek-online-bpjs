
import React, { useState, useEffect } from 'react';
import { Search, Download, RefreshCw, Plus, FileCheck, User, Calendar, MapPin, Send, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { SepData, PrescriptionData, MedicineData } from '@/types/sep';

const SepPharmacyData: React.FC = () => {
  const [sepData, setSepData] = useState<SepData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGetModalOpen, setIsGetModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedSep, setSelectedSep] = useState<SepData | null>(null);
  const [noSep, setNoSep] = useState('');
  const [noKunjungan, setNoKunjungan] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [syncNotes, setSyncNotes] = useState('');
  const [editableData, setEditableData] = useState<any>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [bridgingSimrs, setBridgingSimrs] = useState<boolean>(true);
  const [isAddObatModalOpen, setIsAddObatModalOpen] = useState(false);
  const [isAddRacikanModalOpen, setIsAddRacikanModalOpen] = useState(false);
  const [newObat, setNewObat] = useState({
    KDOBT: '',
    NMOBAT: '',
    JMLOBT: '',
    SIGNA1OBT: '',
    SIGNA2OBT: '',
    JHO: ''
  });
  const [newRacikan, setNewRacikan] = useState({
    JNSROBT: '',
    JMLOBAT: '2',
    JMLRACIKAN: '',
    NO_RACIK: '1',
    ATURAN_PAKAI: '',
    SIGNA1RACIKAN: '',
    SIGNA2RACIKAN: '',
    JHORACIKAN: '',
    detail: []
  });
  const [newDetailObat, setNewDetailObat] = useState({
    KDOBT: '',
    NMOBAT: '',
    JMLOBT: ''
  });
  const [mappingData, setMappingData] = useState<any[]>([]);
  const [isLoadingMapping, setIsLoadingMapping] = useState(false);
  const [showObatSuggestions, setShowObatSuggestions] = useState(false);
  const [filteredObatSuggestions, setFilteredObatSuggestions] = useState<any[]>([]);
  const [showDetailObatSuggestions, setShowDetailObatSuggestions] = useState(false);
  const [filteredDetailObatSuggestions, setFilteredDetailObatSuggestions] = useState<any[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSepForDetail, setSelectedSepForDetail] = useState<SepData | null>(null);

  // Load SEP data from saved files
  const loadSepData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/sep-data');
      const result = await response.json();
      
      if (result.success) {
        // Convert API data to SepData format
        const convertedData: SepData[] = result.data.map((item: any) => ({
          noSep: item.dataRaw?.noSep || item.noSep,
          faskesasalresep: item.dataRaw?.faskesasalresep || item.faskesasalresep || '',
          nmfaskesasalresep: item.dataRaw?.nmfaskesasalresep || item.nmfaskesasalresep || '',
          nokartu: item.dataRaw?.nokartu || item.nokartu || '',
          namapeserta: item.dataRaw?.namapeserta || item.namapeserta || '',
          jnskelamin: item.dataRaw?.jnskelamin || item.jnskelamin || '',
          tgllhr: item.dataRaw?.tgllhr || item.tgllhr || '',
          pisat: item.dataRaw?.pisat || '',
          kdjenispeserta: item.dataRaw?.kdjenispeserta || '',
          nmjenispeserta: item.dataRaw?.nmjenispeserta || item.nmjenispeserta || '',
          kodebu: item.dataRaw?.kodebu || '',
          namabu: item.dataRaw?.namabu || '',
          tglsep: item.dataRaw?.tglsep || item.tglsep || item.timestamp.split(' ')[0],
          tglplgsep: item.dataRaw?.tglplgsep || item.tglplgsep || item.timestamp.split(' ')[0],
          jnspelayanan: item.dataRaw?.jnspelayanan || item.jnspelayanan || 'RJTL',
          nmdiag: item.dataRaw?.nmdiag || item.nmdiag || '',
          poli: item.dataRaw?.poli || item.poli,
          flagprb: item.dataRaw?.flagprb || '0',
          namaprb: item.dataRaw?.namaprb || '',
          kodedokter: item.dataRaw?.kodedokter || '',
          namadokter: item.dataRaw?.namadokter || '',
          prescriptionData: item.prescriptionData ? {
            noKunjungan: item.prescriptionData.noKunjungan || item.noKunjungan,
            tglKunjungan: item.prescriptionData.tglKunjungan || item.timestamp.split(' ')[0],
            keluhan: item.prescriptionData.keluhan || '',
            diagnosa: item.prescriptionData.diagnosa || '',
            tindakan: item.prescriptionData.tindakan || '',
            medicines: item.prescriptionData.medicines || []
          } : null,
          fileName: item.fileName,
          status: item.status,
          jumlahObat: item.jumlahObat,
          jumlahRacikan: item.jumlahRacikan,
          dataRaw: item.dataRaw,
          post_data: item.post_data // Tambahkan post_data agar bisa diakses di modal detail
        } as any));
        
        setSepData(convertedData);
      }
    } catch (error) {
      console.error('Error loading SEP data:', error);
      toast.error('Gagal memuat data SEP');
    }
  };

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
        setBridgingSimrs(result.data.bridging_simrs || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Function to load mapping data
  const loadMappingData = async () => {
    setIsLoadingMapping(true);
    try {
      const response = await fetch('/data/mapping_obat.json');
      if (response.ok) {
        const data = await response.json();
        setMappingData(data.mappings || []);
      }
    } catch (error) {
      console.error('Error loading mapping data:', error);
    } finally {
      setIsLoadingMapping(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadSepData();
    loadSettings();
    loadMappingData();
  }, []);



  const handleGetSepData = async () => {
    if (!noSep || (bridgingSimrs && !noKunjungan)) {
      toast.error(bridgingSimrs ? 'No SEP dan No Kunjungan harus diisi' : 'No SEP harus diisi');
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Fetching SEP data from BPJS API for SEP: ${noSep}`);
      console.log(`Fetching prescription data from local system for visit: ${noKunjungan}`);
      
      // Call BPJS API to get SEP data
      const bpjsResponse = await fetch(`http://localhost:3001/api/sep/${noSep}`);
      const bpjsResult = await bpjsResponse.json();
      
      if (!bpjsResult.success) {
        throw new Error(bpjsResult.message || 'Failed to fetch SEP data from BPJS');
      }
      
      const sepDataRaw = bpjsResult.data;
      if (!sepDataRaw) {
        throw new Error('Data SEP tidak ditemukan di BPJS');
      }
      
      // Fetch prescription data from local database only if bridging_simrs is true
      let resepData = [];
      if (bridgingSimrs && noKunjungan) {
        const resepResponse = await fetch('http://localhost:3001/api/data-resep', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ no_rawat: noKunjungan })
        });
        const resepResult = await resepResponse.json();
        
        if (!resepResult.success) {
          throw new Error(resepResult.message || 'Failed to fetch prescription data');
        }
        
        resepData = resepResult.data;
      }
      
      // Create combined JSON structure with dataRaw
      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const combinedData = {
        timestamp: timestamp,
        dataRaw: sepDataRaw,
        post_data: {
          no_rawat: noKunjungan || '',
          KdDokter: sepDataRaw.kodedokter || '',
          IDUSERSJP: 'DR001',
          TGLSJP: new Date().toISOString(),
          REFASALSJP: sepDataRaw.noSep,
          POLIRSP: sepDataRaw.poli || '',
          KDJNSOBAT: '2',
          NORESEP: resepData.length > 0 ? resepData[0].no_resep : '',
          iterasi: '0',
          TGLRSP: resepData.length > 0 ? `${resepData[0].tgl_peresepan}T${resepData[0].jam_peresepan}` : new Date().toISOString(),
          TGLPELRSP: resepData.length > 0 ? `${resepData[0].tgl_perawatan}T${resepData[0].jam}` : new Date().toISOString(),
          obat: [],
          racikan: []
        }
      };
      
      // Process non-racikan items
      const nonRacikanItems = resepData.filter(item => item.jenis_resep === 'non_racikan');
      combinedData.post_data.obat = nonRacikanItems.map(item => {
        const signaMatch = item.aturan_pakai.match(/(\d+)\s*x\s*(\d+)/);
        const signa1 = signaMatch ? signaMatch[1] : '1';
        const signa2 = signaMatch ? signaMatch[2] : '1';
        
        return {
          type: 'non_racikan',
          NOSJP: sepDataRaw.noSep,
          NORESEP: item.no_resep,
          CatKhsObt: '',
          KDOBT: item.kd_obat_bpjs || '',
          NMOBAT: item.nama_obat_bpjs || item.nama_item,
          JMLOBT: item.jml?.toString() || '1',
          SIGNA1OBT: signa1,
          SIGNA2OBT: signa2,
          JHO: (parseInt(signa1) * parseInt(signa2)).toString()
        };
      });
      
      // Process racikan items
      const racikanItems = resepData.filter(item => item.jenis_resep === 'racikan');
      combinedData.post_data.racikan = racikanItems.map(item => {
        const signaMatch = item.aturan_pakai.match(/(\d+)\s*x\s*(\d+)/);
        const signa1 = signaMatch ? signaMatch[1] : '1';
        const signa2 = signaMatch ? signaMatch[2] : '1';
        
        let detail = [];
        if (item.detail_racikan) {
          try {
            const detailArray = JSON.parse(item.detail_racikan);
            detail = detailArray.map(d => ({
              kode_brng: d.kode_brng,
              nama_brng: d.nama_brng,
              jml: d.jml?.toString() || '1',
              kd_obat_bpjs: d.kd_obat_bpjs || '',
              nama_obat_bpjs: d.nama_obat_bpjs || d.nama_brng
            }));
          } catch (e) {
            console.error('Error parsing racikan detail:', e);
          }
        }
        
        return {
          type: 'racikan',
          NOSJP: sepDataRaw.noSep,
          NORESEP: item.no_resep,
          no_racik: item.no_racik?.toString() || '1',
          kd_racik: item.kd_racik?.toString() || '1',
          SIGNA1RACIKAN: signa1,
          SIGNA2RACIKAN: signa2,
          JHORACIKAN: (parseInt(signa1) * parseInt(signa2)).toString(),
          JNSROBT: item.nm_racik || 'Puyer',
          JMLOBAT: '1',
          JMLRACIKAN: item.jml_dr?.toString() || '1',
          NO_RACIK: item.no_racik?.toString() || '1',
          ATURAN_PAKAI: item.aturan_pakai,
          detail: detail
        };
      });
      
      // Save combined data with dataRaw to server
      const saveResponse = await fetch('http://localhost:3001/api/save-sep-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          noSep: sepDataRaw.noSep,
          dataRaw: sepDataRaw,
          data: combinedData
        })
      });
      
      const saveResult = await saveResponse.json();
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Failed to save SEP data');
      }
      
      console.log('SEP data with dataRaw saved to:', saveResult.filePath);
      
      // Define fileName for toast message
      const fileName = `${sepDataRaw.noSep}.json`;
      
      // // Also provide download option
      // const dataStr = JSON.stringify(combinedData, null, 2);
      // const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      // const linkElement = document.createElement('a');
      // linkElement.setAttribute('href', dataUri);
      // linkElement.setAttribute('download', fileName);
      // linkElement.click();
      
      // Update UI with the fetched data including dataRaw
      const newSepData = {
        ...sepDataRaw,
        dataRaw: sepDataRaw,
        prescriptionData: {
          noKunjungan: noKunjungan,
          tglKunjungan: sepDataRaw.tglsep,
          keluhan: '',
          diagnosa: sepDataRaw.nmdiag,
          tindakan: '',
          medicines: [
            ...combinedData.post_data.obat.map(obat => ({
              id: Math.random().toString(),
              kodeObat: obat.KDOBT,
              namaObat: obat.NMOBAT,
              jenisObat: 'non-racikan' as const,
              jumlah: parseInt(obat.JMLOBT),
              signa: `${obat.SIGNA1OBT}-${obat.SIGNA2OBT}`,
              aturanPakai: 'Sesuai petunjuk dokter',
              harga: 0
            })),
            ...combinedData.post_data.racikan.map(racikan => ({
              id: Math.random().toString(),
              kodeObat: racikan.NO_RACIK,
              namaObat: racikan.JNSROBT,
              jenisObat: 'racikan' as const,
              jumlah: parseInt(racikan.JMLRACIKAN),
              signa: `${racikan.SIGNA1RACIKAN}-${racikan.SIGNA2RACIKAN}`,
              aturanPakai: racikan.ATURAN_PAKAI,
              harga: 0,
              komposisi: racikan.detail.map(d => ({
                kodeObat: d.kode_brng,
                namaObat: d.nama_brng,
                jumlah: parseInt(d.jml),
                satuan: 'mg'
              }))
            }))
          ]
        }
      };
      
      setSepData(prev => [...prev, newSepData]);
      setIsGetModalOpen(false);
      setNoSep('');
      setNoKunjungan('');
      toast.success(`Data SEP dan resep berhasil diambil dan disimpan sebagai ${fileName}`);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error(`Gagal mengambil data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to add new obat non racikan
  const handleAddObat = async () => {
    if (!editableData) return;
    
    // Validasi REFASALSJP (noSep) harus ada dari field Referensi Asal SJP
    if (!editableData.post_data?.REFASALSJP) {
      toast.error('Referensi Asal SJP harus diisi sebelum menambah obat non racikan');
      return;
    }
    
    // Validasi field wajib: KDOBT, NMOBAT, dan field lainnya
    if (!newObat.KDOBT || !newObat.NMOBAT || !newObat.JMLOBT || !newObat.SIGNA1OBT || !newObat.SIGNA2OBT || !newObat.JHO) {
      toast.error('Field KDOBT, NMOBAT, JMLOBT, SIGNA1OBT, SIGNA2OBT, dan JHO harus diisi');
      return;
    }
    
    try {
      // Save to backend if bridgingSimrs is false
      if (!bridgingSimrs) {
        const token = localStorage.getItem('authToken');
        const obatDataWithNoSep = {
          noSep: editableData.post_data?.REFASALSJP,
          KDOBT: newObat.KDOBT,
          NMOBAT: newObat.NMOBAT,
          JMLOBAT: newObat.JMLOBT,
          SIGNA1: newObat.SIGNA1OBT,
          SIGNA2: newObat.SIGNA2OBT,
          JMLPERMINTAAN: newObat.JHO
        };
        
        const response = await fetch('http://localhost:3001/api/save-obat-non-racikan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(obatDataWithNoSep)
        });

        const result = await response.json();
        
        if (!result.success) {
          toast.error(result.message || 'Gagal menyimpan obat non racikan');
          return;
        }
      }
      
      const currentObat = editableData.post_data?.obat || [];
      const updatedObat = [...currentObat, { ...newObat }];
      
      setEditableData({
        ...editableData,
        post_data: {
          ...editableData.post_data,
          obat: updatedObat
        }
      });
      
      // Reset form
      setNewObat({
        KDOBT: '',
        NMOBAT: '',
        JMLOBT: '',
        SIGNA1OBT: '',
        SIGNA2OBT: '',
        JHO: ''
      });
      
      setIsAddObatModalOpen(false);
      toast.success('Obat non racikan berhasil ditambahkan' + (!bridgingSimrs ? ' dan disimpan' : ''));
    } catch (error) {
      console.error('Error adding obat non racikan:', error);
      toast.error('Terjadi kesalahan saat menambahkan obat non racikan');
    }
  };

  // Function to add new obat racikan
  const handleAddRacikan = async () => {
    if (!editableData) return;
    
    // Validasi REFASALSJP (noSep) harus ada dari field Referensi Asal SJP
    if (!editableData.post_data?.REFASALSJP) {
      toast.error('Referensi Asal SJP harus diisi sebelum menambah obat racikan');
      return;
    }
    
    if (!newRacikan.JNSROBT || !newRacikan.JMLRACIKAN || !newRacikan.ATURAN_PAKAI || !newRacikan.SIGNA1RACIKAN || !newRacikan.SIGNA2RACIKAN || !newRacikan.JHORACIKAN) {
      toast.error('Semua field obat racikan harus diisi');
      return;
    }
    
    if (!newRacikan.detail || newRacikan.detail.length === 0) {
      toast.error('Minimal harus ada satu detail obat dalam racikan');
      return;
    }
    
    try {
      // Save to backend if bridgingSimrs is false
      if (!bridgingSimrs) {
        const token = localStorage.getItem('authToken');
        const racikanDataWithNoSep = {
          noSep: editableData.post_data?.REFASALSJP,
          JNSROBT: newRacikan.JNSROBT,
          JMLRACIKAN: newRacikan.JMLRACIKAN,
          KETERANGAN: newRacikan.ATURAN_PAKAI,
          SIGNA1RACIKAN: newRacikan.SIGNA1RACIKAN,
          SIGNA2RACIKAN: newRacikan.SIGNA2RACIKAN,
          JHORACIKAN: newRacikan.JHORACIKAN,
          JMLOBAT: newRacikan.JMLOBAT,
          detailObat: newRacikan.detail || []
        };
        
        const response = await fetch('http://localhost:3001/api/save-obat-racikan', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(racikanDataWithNoSep)
        });

        const result = await response.json();
        
        if (!result.success) {
          toast.error(result.message || 'Gagal menyimpan obat racikan');
          return;
        }
      }
      
      const currentRacikan = editableData.post_data?.racikan || [];
      const updatedRacikan = [...currentRacikan, { ...newRacikan }];
      
      setEditableData({
        ...editableData,
        post_data: {
          ...editableData.post_data,
          racikan: updatedRacikan
        }
      });
      
      // Reset form
       setNewRacikan({
         JNSROBT: '',
         JMLOBAT: '2',
         JMLRACIKAN: '',
         NO_RACIK: '1',
         ATURAN_PAKAI: '',
         SIGNA1RACIKAN: '',
         SIGNA2RACIKAN: '',
         JHORACIKAN: '',
         detail: []
       });
       
       setNewDetailObat({
         KDOBT: '',
         NMOBAT: '',
         JMLOBT: ''
       });
       
       setIsAddRacikanModalOpen(false);
        toast.success('Obat racikan berhasil ditambahkan' + (!bridgingSimrs ? ' dan disimpan' : ''));
      } catch (error) {
        console.error('Error adding obat racikan:', error);
        toast.error('Terjadi kesalahan saat menambahkan obat racikan');
      }
    };

  // Function to add detail obat to racikan
  const handleAddDetailObat = () => {
    if (!newDetailObat.KDOBT || !newDetailObat.NMOBAT || !newDetailObat.JMLOBT) {
      toast.error('Field KDOBT, NMOBAT, dan JMLOBT harus diisi untuk detail obat');
      return;
    }

    const updatedDetail = [...newRacikan.detail, { ...newDetailObat }];
    setNewRacikan({ ...newRacikan, detail: updatedDetail });
    
    // Reset form detail obat
    setNewDetailObat({
      KDOBT: '',
      NMOBAT: '',
      JMLOBT: ''
    });
    
    toast.success('Detail obat berhasil ditambahkan');
  };

  // Function to remove detail obat from racikan
  const handleRemoveDetailObat = (index: number) => {
    const updatedDetail = newRacikan.detail.filter((_, i) => i !== index);
    setNewRacikan({ ...newRacikan, detail: updatedDetail });
    toast.success('Detail obat berhasil dihapus');
  };

  // Function to handle obat name input with autocomplete
  const handleObatNameChange = (value: string) => {
    setNewObat({ ...newObat, NMOBAT: value });
    
    if (value.length > 0) {
      const filtered = mappingData.filter(item => 
        item.bpjsName.toLowerCase().includes(value.toLowerCase()) ||
        item.localName.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredObatSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
      setShowObatSuggestions(true);
    } else {
      setShowObatSuggestions(false);
      setFilteredObatSuggestions([]);
    }
  };

  // Function to select obat from suggestions
  const handleObatSelect = (obat: any) => {
    setNewObat({ 
      ...newObat, 
      KDOBT: obat.bpjsCode,
      NMOBAT: obat.bpjsName 
    });
    setShowObatSuggestions(false);
    setFilteredObatSuggestions([]);
  };

  // Function to handle detail obat name input with autocomplete
  const handleDetailObatNameChange = (value: string) => {
    setNewDetailObat({ ...newDetailObat, NMOBAT: value });
    
    if (value.length > 0) {
      const filtered = mappingData.filter(item => 
        item.bpjsName.toLowerCase().includes(value.toLowerCase()) ||
        item.localName.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredDetailObatSuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
      setShowDetailObatSuggestions(true);
    } else {
      setShowDetailObatSuggestions(false);
      setFilteredDetailObatSuggestions([]);
    }
  };

  // Function to select detail obat from suggestions
  const handleDetailObatSelect = (obat: any) => {
    setNewDetailObat({ 
      ...newDetailObat, 
      KDOBT: obat.bpjsCode,
      NMOBAT: obat.bpjsName 
    });
    setShowDetailObatSuggestions(false);
    setFilteredDetailObatSuggestions([]);
  };

  // Function to handle view detail button click
  const handleViewDetail = (sep: SepData) => {
    setSelectedSepForDetail(sep);
    setIsDetailModalOpen(true);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.obat-autocomplete') && !target.closest('.detail-obat-autocomplete')) {
        setShowObatSuggestions(false);
        setShowDetailObatSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSyncToBPJS = async () => {
    if (!selectedSep || !editableData) return;

    setIsLoading(true);
    try {
      // Pertama, simpan data resep ke file JSON dengan format post_data
      // Gunakan data dari editableData yang sudah diedit di form
      const postData = {
        no_rawat: selectedSep.prescriptionData?.noKunjungan || '',
        KdDokter: selectedSep.kodedokter || '',
        IDUSERSJP: 'DR001',
        TGLSJP: new Date().toISOString(),
        REFASALSJP: selectedSep.noSep,
        POLIRSP: selectedSep.poli === 'PENYAKIT DALAM' ? 'INT' : selectedSep.poli || '',
        KDJNSOBAT: '2',
        NORESEP: editableData.post_data?.NORESEP || '',
        iterasi: '0',
        TGLRSP: selectedSep.tglsep ? `${selectedSep.tglsep}T16:02:29` : '',
        TGLPELRSP: selectedSep.tglplgsep ? `${selectedSep.tglplgsep}T00:00:00` : 'nullT00:00:00',
        obat: editableData.post_data?.obat || [],
        racikan: editableData.post_data?.racikan || []
      };
      
      const saveResponse = await fetch('http://localhost:3001/api/save-resep-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          noSep: selectedSep.noSep,
          data: {
            post_data: postData,
            notes: syncNotes,
            syncTimestamp: new Date().toISOString()
          }
        })
      });
      
      const saveResult = await saveResponse.json();
      
      if (!saveResult.success) {
        throw new Error(saveResult.message || 'Failed to save resep data');
      }
      
      // Kemudian, kirim data ke BPJS API
      const response = await fetch('http://localhost:3001/api/sync-to-bpjs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          editableData: editableData,
          notes: syncNotes
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Data berhasil disimpan dan disinkronisasi ke BPJS');
        setIsSyncModalOpen(false);
        setSelectedSep(null);
        setSyncNotes('');
        setEditableData(null);
      } else {
        throw new Error(result.message || 'Failed to sync to BPJS');
      }
    } catch (error) {
      console.error('Error syncing to BPJS:', error);
      toast.error('Gagal sinkronisasi ke BPJS');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getGenderBadge = (gender: string) => {
    return (
      <Badge variant={gender === 'L' ? 'default' : 'secondary'}>
        {gender === 'L' ? 'Laki-laki' : 'Perempuan'}
      </Badge>
    );
  };

  const getTotalMedicineAmount = (medicines: MedicineData[]) => {
    return medicines.reduce((total, med) => total + med.harga, 0);
  };

  const filteredSepData = sepData.filter(sep => {
    const searchLower = searchTerm.toLowerCase();
    const noSep = sep.dataRaw?.noSep || sep.noSep;
    const namapeserta = sep.dataRaw?.namapeserta || sep.namapeserta;
    const nokartu = sep.dataRaw?.nokartu || sep.nokartu;
    const nmfaskesasalresep = sep.dataRaw?.nmfaskesasalresep || sep.nmfaskesasalresep;
    
    return (
      noSep.toLowerCase().includes(searchLower) ||
      namapeserta.toLowerCase().includes(searchLower) ||
      nokartu.toLowerCase().includes(searchLower) ||
      nmfaskesasalresep.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card className="medical-card">
      <CardHeader className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-base md:text-lg">Data SEP Apotek</span>
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={loadSepData}
              variant="outline"
              className="flex items-center space-x-2 w-full sm:w-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh Data</span>
              <span className="sm:hidden">Refresh</span>
            </Button>
            <Dialog open={isGetModalOpen} onOpenChange={setIsGetModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Get SEP Apotek</span>
                  <span className="sm:hidden">Get SEP</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Ambil Data SEP Apotek</DialogTitle>
                  <DialogDescription>
                    {bridgingSimrs 
                      ? 'Masukkan No SEP dan No Kunjungan untuk mengambil data dari BPJS dan sistem lokal'
                      : 'Masukkan No SEP untuk mengambil data dari BPJS'
                    }
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="noSep">No SEP</Label>
                    <Input
                      id="noSep"
                      placeholder="Masukkan No SEP"
                      value={noSep}
                      onChange={(e) => setNoSep(e.target.value)}
                    />
                  </div>
                  {bridgingSimrs && (
                    <div className="space-y-2">
                      <Label htmlFor="noKunjungan">No Kunjungan</Label>
                      <Input
                        id="noKunjungan"
                        placeholder="Masukkan No Kunjungan"
                        value={noKunjungan}
                        onChange={(e) => setNoKunjungan(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleGetSepData}
                    disabled={isLoading || !noSep || (bridgingSimrs && !noKunjungan)}
                    className="w-full"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Mengambil Data...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-2" />
                        Ambil Data
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Cari berdasarkan No SEP, nama peserta, no kartu, atau faskes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <FileCheck className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total SEP</p>
                <p className="text-lg md:text-2xl font-bold">{sepData.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Hari Ini</p>
                <p className="text-lg md:text-2xl font-bold">
                  {sepData.filter(s => (s.dataRaw?.tglsep || s.tglsep) === new Date().toISOString().split('T')[0]).length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">RJTL</p>
                <p className="text-lg md:text-2xl font-bold">
                  {sepData.filter(s => (s.dataRaw?.jnspelayanan || s.jnspelayanan) === 'RJTL').length}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 md:w-5 md:h-5 text-blue-500" />
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">RITL</p>
                <p className="text-lg md:text-2xl font-bold">
                  {sepData.filter(s => (s.dataRaw?.nmjenispeserta || s.nmjenispeserta).includes('RITL')).length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px] text-xs md:text-sm whitespace-nowrap">No SEP</TableHead>
                <TableHead className="min-w-[120px] text-xs md:text-sm hidden sm:table-cell whitespace-nowrap">No Kartu</TableHead>
                <TableHead className="min-w-[150px] text-xs md:text-sm whitespace-nowrap">Nama Peserta</TableHead>
                <TableHead className="min-w-[60px] text-xs md:text-sm hidden md:table-cell whitespace-nowrap">JK</TableHead>
                <TableHead className="min-w-[100px] text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">Tgl Lahir</TableHead>
                <TableHead className="min-w-[120px] text-xs md:text-sm hidden xl:table-cell whitespace-nowrap">Jenis Peserta</TableHead>
                <TableHead className="min-w-[150px] text-xs md:text-sm hidden xl:table-cell whitespace-nowrap">Faskes Asal</TableHead>
                <TableHead className="min-w-[100px] text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">Tgl SEP</TableHead>
                <TableHead className="min-w-[100px] text-xs md:text-sm hidden md:table-cell whitespace-nowrap">Pelayanan</TableHead>
                <TableHead className="min-w-[150px] text-xs md:text-sm hidden xl:table-cell whitespace-nowrap">Diagnosa</TableHead>
                <TableHead className="min-w-[80px] text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">Poli</TableHead>
                <TableHead className="min-w-[120px] text-xs md:text-sm hidden md:table-cell whitespace-nowrap">No Kunjungan</TableHead>
                <TableHead className="min-w-[80px] text-xs md:text-sm whitespace-nowrap">Jml Obat</TableHead>
                <TableHead className="min-w-[80px] text-xs md:text-sm hidden sm:table-cell whitespace-nowrap">Status</TableHead>
                <TableHead className="min-w-[120px] text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">Timestamp</TableHead>
                <TableHead className="min-w-[80px] text-xs md:text-sm whitespace-nowrap">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSepData.map((sep, index) => (
                <TableRow key={`${sep.noSep}-${index}`}>
                  <TableCell className="font-medium text-xs md:text-sm whitespace-nowrap">{sep.dataRaw?.noSep || sep.noSep}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden sm:table-cell whitespace-nowrap">{sep.dataRaw?.nokartu || sep.nokartu}</TableCell>
                  <TableCell className="text-xs md:text-sm whitespace-nowrap">
                    <div>
                      <div className="font-medium">{sep.dataRaw?.namapeserta || sep.namapeserta}</div>
                      <div className="sm:hidden text-xs text-muted-foreground mt-1">
                        {sep.dataRaw?.nokartu || sep.nokartu}
                      </div>
                      <div className="md:hidden text-xs text-muted-foreground mt-1">
                        {getGenderBadge(sep.dataRaw?.jnskelamin || sep.jnskelamin)}
                      </div>
                      <div className="lg:hidden text-xs text-muted-foreground mt-1">
                        {formatDate(sep.dataRaw?.tglsep || sep.tglsep)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell whitespace-nowrap">{getGenderBadge(sep.dataRaw?.jnskelamin || sep.jnskelamin)}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">{formatDate(sep.dataRaw?.tgllhr || sep.tgllhr)}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden xl:table-cell whitespace-nowrap">
                    <Badge variant="outline" className="text-xs">{sep.dataRaw?.nmjenispeserta || sep.nmjenispeserta}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs md:text-sm hidden xl:table-cell whitespace-nowrap" title={sep.dataRaw?.nmfaskesasalresep || sep.nmfaskesasalresep}>
                    {sep.dataRaw?.nmfaskesasalresep || sep.nmfaskesasalresep}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">{formatDate(sep.dataRaw?.tglsep || sep.tglsep)}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell whitespace-nowrap">
                    <Badge variant="secondary" className="text-xs">{sep.dataRaw?.jnspelayanan || sep.jnspelayanan}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs md:text-sm hidden xl:table-cell whitespace-nowrap" title={sep.dataRaw?.nmdiag || sep.nmdiag}>
                    {sep.dataRaw?.nmdiag || sep.nmdiag}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">{sep.dataRaw?.poli || sep.poli}</TableCell>
                  <TableCell className="text-xs md:text-sm hidden md:table-cell whitespace-nowrap">
                    {sep.prescriptionData?.noKunjungan || '-'}
                  </TableCell>
                  <TableCell className="text-xs md:text-sm whitespace-nowrap">
                    <div className="text-center">
                      <p className="font-medium">{sep.jumlahObat || 0}</p>
                      {sep.jumlahRacikan && sep.jumlahRacikan > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {sep.jumlahRacikan} racikan
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden sm:table-cell whitespace-nowrap">
                    <Badge variant={sep.status === 'Tersimpan' ? 'default' : 'secondary'} className="text-xs">
                      {sep.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs md:text-sm hidden lg:table-cell whitespace-nowrap">
                    {sep.prescriptionData?.tglKunjungan || '-'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="Lihat Detail" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleViewDetail(sep)}
                      >
                        <Eye className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                      {sep.fileName && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            setSelectedSep(sep);
                            setIsSyncModalOpen(true);
                            
                            // Coba load file data dari resepobat terlebih dahulu
                            setIsLoadingFile(true);
                            try {
                              const response = await fetch(`http://localhost:3001/api/resep-data/${sep.noSep}`);
                              const result = await response.json();
                              
                              if (result.success && result.data && result.data.post_data) {
                                // Jika file resep ada dan memiliki data post_data, gunakan data tersebut
                                setEditableData(result.data);
                              } else {
                                // Jika file tidak ada atau data obat kosong, inisialisasi dari prescriptionData
                                const initialData = {
                                  post_data: {
                                    no_rawat: sep.prescriptionData?.noKunjungan || '',
                                    KdDokter: sep.kodedokter || '',
                                    IDUSERSJP: 'DR001',
                                    TGLSJP: new Date().toISOString().slice(0, 19).replace('T', ' '),
                                    REFASALSJP: sep.noSep,
                                    POLIRSP: sep.poli === 'PENYAKIT DALAM' ? 'INT' : sep.poli || '',
                                    KDJNSOBAT: '2',
                                    NORESEP: sep.prescriptionData?.noKunjungan || '',
                                    iterasi: '0',
                                    TGLRSP: sep.tglsep ? `${sep.tglsep}T16:02:29` : '',
                                    TGLPELRSP: sep.tglplgsep ? `${sep.tglplgsep}T00:00:00` : 'nullT00:00:00',
                                    obat: sep.prescriptionData?.medicines?.map(med => ({
                                      type: 'non_racikan',
                                      NOSJP: sep.noSep,
                                      NORESEP: sep.prescriptionData?.noKunjungan || '',
                                      CatKhsObt: '',
                                      KDOBT: med.kodeObat || '',
                                      NMOBAT: med.namaObat || '',
                                      JMLOBT: med.jumlah?.toString() || '0',
                                      SIGNA1OBT: '1',
                                      SIGNA2OBT: '1',
                                      JHO: '1'
                                    })) || [],
                                    racikan: []
                                  },
                                  notes: '',
                                  syncTimestamp: new Date().toISOString()
                                };
                                setEditableData(initialData);
                              }
                            } catch (error) {
                              console.error('Error loading file data:', error);
                              // Jika error, tetap inisialisasi dengan data dari prescriptionData
                              const initialData = {
                                post_data: {
                                  no_rawat: sep.prescriptionData?.noKunjungan || '',
                                  KdDokter: sep.kodedokter || '',
                                  IDUSERSJP: 'DR001',
                                  TGLSJP: new Date().toISOString(),
                                  REFASALSJP: sep.noSep,
                                  POLIRSP: sep.poli === 'PENYAKIT DALAM' ? 'INT' : sep.poli || '',
                                  KDJNSOBAT: '2',
                                  NORESEP: sep.prescriptionData?.noKunjungan || '',
                                  iterasi: '0',
                                  TGLRSP: sep.tglsep ? `${sep.tglsep}T16:02:29` : '',
                                  TGLPELRSP: sep.tglplgsep ? `${sep.tglplgsep}T00:00:00` : 'nullT00:00:00',
                                  obat: sep.prescriptionData?.medicines?.map(med => ({
                                    type: 'non_racikan',
                                    NOSJP: sep.noSep,
                                    NORESEP: sep.prescriptionData?.noKunjungan || '',
                                    CatKhsObt: '',
                                    KDOBT: med.kodeObat || '',
                                    NMOBAT: med.namaObat || '',
                                    JMLOBT: med.jumlah?.toString() || '0',
                                    SIGNA1OBT: '1',
                                    SIGNA2OBT: '1',
                                    JHO: '1'
                                  })) || [],
                                  racikan: []
                                },
                                notes: '',
                                syncTimestamp: new Date().toISOString()
                              };
                              setEditableData(initialData);
                            } finally {
                              setIsLoadingFile(false);
                            }
                          }}
                          title="Sync ke BPJS"
                          className="h-8 w-8 p-0"
                        >
                          <Send className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredSepData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileCheck className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm md:text-base">Belum ada data SEP yang tersedia</p>
            <p className="text-xs md:text-sm">Gunakan tombol "Get SEP Apotek" untuk mengambil data</p>
          </div>
        )}

        {/* Sync to BPJS Modal */}
        <Dialog open={isSyncModalOpen} onOpenChange={setIsSyncModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Sync Resep ke BPJS</DialogTitle>
              <DialogDescription>
                Edit dan kirim data resep ke sistem BPJS
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingFile ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                <span>Memuat data file...</span>
              </div>
            ) : editableData && selectedSep ? (
              <div className="space-y-6">
                {/* Data Pasien */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 text-gray-700">Data Pasien</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600"><strong>No. Rawat:</strong> {editableData.dataRaw?.noRawat || selectedSep.prescriptionData?.noKunjungan || '202507/14/000002'}</p>
                      <p className="text-gray-600"><strong>No. SEP:</strong> {editableData.post_data?.REFASALSJP || selectedSep.noSep || '1708P0080625V000004'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>No. Kartu:</strong> {editableData.dataRaw?.nokartu || selectedSep.nokartu || '0002145000363'}</p>
                      <p className="text-gray-600"><strong>Tgl. SEP:</strong> {editableData.dataRaw?.tglsep || selectedSep.tglsep || '2025-06-14'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600"><strong>Nama Pasien:</strong> {editableData.dataRaw?.namapeserta || selectedSep.namapeserta || 'JUNAIDI'}</p>
                      <p className="text-gray-600"><strong>Poli:</strong> {editableData.dataRaw?.poli || selectedSep.poli || 'PENYAKIT DALAM'}</p>
                    </div>
                  </div>
                </Card>

                {/* Informasi Resep */}
                <Card className="p-4">
                  <h3 className="font-semibold mb-3 text-gray-700">Informasi Resep</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tglSjp" className="text-sm font-medium">Tanggal SJP *</Label>
                      <Input
                        id="tglSjp"
                        type="datetime-local"
                        value={editableData.post_data?.TGLSJP ? new Date(editableData.post_data.TGLSJP).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                        onChange={(e) => setEditableData({
                          ...editableData,
                          post_data: {
                            ...editableData.post_data,
                            TGLSJP: new Date(e.target.value).toISOString().slice(0, 19).replace('T', ' ')
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="refAsalSjp" className="text-sm font-medium">Referensi Asal SJP *</Label>
                      <Input
                        id="refAsalSjp"
                        value={editableData.post_data?.REFASALSJP || ''}
                        onChange={(e) => setEditableData({
                          ...editableData,
                          post_data: {
                            ...editableData.post_data,
                            REFASALSJP: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="poliRsp" className="text-sm font-medium">Poli RSP *</Label>
                      <Select
                        value={editableData.post_data?.POLIRSP || 'IPD (Rawat Jalan)'}
                        onValueChange={(value) => setEditableData({
                          ...editableData,
                          post_data: {
                            ...editableData.post_data,
                            POLIRSP: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="IPD (Rawat Jalan)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IPD (Rawat Jalan)">IPD (Rawat Jalan)</SelectItem>
                          <SelectItem value="OPD (Rawat Inap)">OPD (Rawat Inap)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jenisObat" className="text-sm font-medium">Jenis Obat *</Label>
                      <Select
                        value={editableData.post_data?.KDJNSOBAT || '2'}
                        onValueChange={(value) => setEditableData({
                          ...editableData,
                          post_data: {
                            ...editableData.post_data,
                            KDJNSOBAT: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih Jenis Obat" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Obat PRB</SelectItem>
                          <SelectItem value="2">Obat Kronis</SelectItem>
                          <SelectItem value="3">Obat Kemoterapi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="noResep" className="text-sm font-medium">No. Resep *</Label>
                      <Input
                        id="noResep"
                        value={editableData.post_data?.NORESEP || ''}
                        onChange={(e) => setEditableData({
                          ...editableData,
                          post_data: {
                            ...editableData.post_data,
                            NORESEP: e.target.value
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iterasi" className="text-sm font-medium">Iterasi</Label>
                      <Select
                        value={editableData.post_data?.iterasi || '0'}
                        onValueChange={(value) => setEditableData({
                          ...editableData,
                          post_data: {
                            ...editableData.post_data,
                            iterasi: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="0. Non Iterasi" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0. Non Iterasi</SelectItem>
                          <SelectItem value="1">1. Iterasi 1</SelectItem>
                          <SelectItem value="2">2. Iterasi 2</SelectItem>
                          <SelectItem value="3">3. Iterasi 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tglResep" className="text-sm font-medium">Tanggal Resep *</Label>
                      <Input
                        id="tglResep"
                        type="datetime-local"
                        value={editableData.post_data?.TGLRSP ? editableData.post_data.TGLRSP.slice(0, 16) : new Date().toISOString().slice(0, 16)}
                        onChange={(e) => setEditableData({
                          ...editableData,
                          post_data: {
                            ...editableData.post_data,
                            TGLRSP: e.target.value + ':29'
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tglPelayananResep" className="text-sm font-medium">Tanggal Pelayanan Resep *</Label>
                      <Input
                        id="tglPelayananResep"
                        type="datetime-local"
                        value={editableData.post_data?.TGLPELRSP ? editableData.post_data.TGLPELRSP.slice(0, 16) : new Date().toISOString().slice(0, 16)}
                        onChange={(e) => setEditableData({
                          ...editableData,
                          post_data: {
                            ...editableData.post_data,
                            TGLPELRSP: e.target.value + ':00'
                          }
                        })}
                      />
                    </div>
                  </div>
                </Card>



                {/* Daftar Obat Non-Racikan */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-700">Daftar Obat Non-Racikan</h3>
                    {!bridgingSimrs && (
                      <Button
                        onClick={() => setIsAddObatModalOpen(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Obat
                      </Button>
                    )}
                  </div>
                  {editableData.post_data?.obat && editableData.post_data.obat.length > 0 ? (
                    <div className="space-y-4">
                      {editableData.post_data.obat.map((obat: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-700">Obat Non-Racikan #{idx + 1}</h4>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Kode Obat *</Label>
                              <Input
                                value={obat.KDOBT || ''}
                                placeholder="21250804267"
                                onChange={(e) => {
                                  const newObat = [...editableData.post_data.obat];
                                  newObat[idx] = { ...newObat[idx], KDOBT: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      obat: newObat
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Nama Obat *</Label>
                              <Input
                                value={obat.NMOBAT || ''}
                                placeholder="Natrium Bikarbonat 500 MG tab"
                                onChange={(e) => {
                                  const newObat = [...editableData.post_data.obat];
                                  newObat[idx] = { ...newObat[idx], NMOBAT: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      obat: newObat
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Jumlah Obat *</Label>
                              <Input
                                value={obat.JMLOBT || ''}
                                placeholder="10"
                                onChange={(e) => {
                                  const newObat = [...editableData.post_data.obat];
                                  newObat[idx] = { ...newObat[idx], JMLOBT: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      obat: newObat
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Signa 1 *</Label>
                              <Input
                                value={obat.SIGNA1OBT || ''}
                                placeholder="1"
                                onChange={(e) => {
                                  const newObat = [...editableData.post_data.obat];
                                  newObat[idx] = { ...newObat[idx], SIGNA1OBT: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      obat: newObat
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Signa 2 *</Label>
                              <Input
                                value={obat.SIGNA2OBT || ''}
                                placeholder="1"
                                onChange={(e) => {
                                  const newObat = [...editableData.post_data.obat];
                                  newObat[idx] = { ...newObat[idx], SIGNA2OBT: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      obat: newObat
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">JHO *</Label>
                              <Input
                                value={obat.JHO || ''}
                                placeholder="10"
                                onChange={(e) => {
                                  const newObat = [...editableData.post_data.obat];
                                  newObat[idx] = { ...newObat[idx], JHO: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      obat: newObat
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500 mb-4">Belum ada obat non-racikan</p>

                    </div>
                  )}
                </Card>

                {/* Daftar Obat Racikan */}
                <Card className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-700">Daftar Obat Racikan</h3>
                    {!bridgingSimrs && (
                      <Button
                        onClick={() => setIsAddRacikanModalOpen(true)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Racikan
                      </Button>
                    )}
                  </div>
                  {editableData.post_data?.racikan && editableData.post_data.racikan.length > 0 ? (
                    <div className="space-y-4">
                      {editableData.post_data.racikan.map((racikan: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                          <div className="mb-3">
                            <h4 className="font-medium text-gray-700">Racikan #{idx + 1} - {racikan.JNSROBT === 'Puyer' ? 'Puyer' : racikan.JNSROBT === 'Kapsul' ? 'Kapsul' : 'Bapil'}</h4>
                          </div>
                          
                          {/* Row 1: Jenis Racikan, Jumlah Item, Jumlah Racikan, No. Racikan */}
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Jenis Racikan *</Label>
                              <Select
                                value={racikan.JNSROBT || ''}
                                onValueChange={(value) => {
                                  const newRacikan = [...editableData.post_data.racikan];
                                  newRacikan[idx] = { ...newRacikan[idx], JNSROBT: value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      racikan: newRacikan
                                    }
                                  });
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Pilih Jenis Racikan" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Puyer">Puyer</SelectItem>
                                  <SelectItem value="Kapsul">Kapsul</SelectItem>
                                  <SelectItem value="Bapil">Bapil</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Jumlah Item</Label>
                              <Input
                                value={racikan.JMLOBAT || '2'}
                                placeholder="2"
                                onChange={(e) => {
                                  const newRacikan = [...editableData.post_data.racikan];
                                  newRacikan[idx] = { ...newRacikan[idx], JMLOBAT: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      racikan: newRacikan
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Jumlah Racikan *</Label>
                              <Input
                                value={racikan.JMLRACIKAN || '30'}
                                placeholder="30"
                                onChange={(e) => {
                                  const newRacikan = [...editableData.post_data.racikan];
                                  newRacikan[idx] = { ...newRacikan[idx], JMLRACIKAN: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      racikan: newRacikan
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">No. Racikan</Label>
                              <Input
                                value={racikan.NO_RACIK || '1'}
                                placeholder="1"
                                onChange={(e) => {
                                  const newRacikan = [...editableData.post_data.racikan];
                                  newRacikan[idx] = { ...newRacikan[idx], NO_RACIK: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      racikan: newRacikan
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Row 2: Aturan Pakai */}
                          <div className="mb-4">
                            <Label className="text-sm font-medium">Aturan Pakai *</Label>
                            <Textarea
                              value={racikan.ATURAN_PAKAI || '1 x 1'}
                              placeholder="1 x 1"
                              className="mt-2"
                              onChange={(e) => {
                                const newRacikan = [...editableData.post_data.racikan];
                                newRacikan[idx] = { ...newRacikan[idx], ATURAN_PAKAI: e.target.value };
                                setEditableData({
                                  ...editableData,
                                  post_data: {
                                    ...editableData.post_data,
                                    racikan: newRacikan
                                  }
                                });
                              }}
                            />
                          </div>
                          
                          {/* Row 3: Signa 1, Signa 2, JHO Racikan */}
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Signa 1 *</Label>
                              <Input
                                value={racikan.SIGNA1RACIKAN || '1'}
                                placeholder="1"
                                onChange={(e) => {
                                  const newRacikan = [...editableData.post_data.racikan];
                                  newRacikan[idx] = { ...newRacikan[idx], SIGNA1RACIKAN: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      racikan: newRacikan
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Signa 2 *</Label>
                              <Input
                                value={racikan.SIGNA2RACIKAN || '1'}
                                placeholder="1"
                                onChange={(e) => {
                                  const newRacikan = [...editableData.post_data.racikan];
                                  newRacikan[idx] = { ...newRacikan[idx], SIGNA2RACIKAN: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      racikan: newRacikan
                                    }
                                  });
                                }}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">JHO Racikan *</Label>
                              <Input
                                value={racikan.JHORACIKAN || '1'}
                                placeholder="1"
                                onChange={(e) => {
                                  const newRacikan = [...editableData.post_data.racikan];
                                  newRacikan[idx] = { ...newRacikan[idx], JHORACIKAN: e.target.value };
                                  setEditableData({
                                    ...editableData,
                                    post_data: {
                                      ...editableData.post_data,
                                      racikan: newRacikan
                                    }
                                  });
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Detail Obat dalam Racikan */}
                          <div className="mt-4">
                            <Label className="text-sm font-medium mb-2 block">Detail Obat dalam Racikan:</Label>
                            <div className="border rounded-lg overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-gray-100">
                                    <TableHead className="text-xs">Kode Obat</TableHead>
                                    <TableHead className="text-xs">Nama Obat</TableHead>
                                    <TableHead className="text-xs">Jumlah</TableHead>
                                    <TableHead className="text-xs">Kode BPJS</TableHead>
                                    <TableHead className="text-xs">Nama Obat BPJS</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                   {racikan.detail && racikan.detail.map((obat: any, detailIdx: number) => (
                                     <TableRow key={detailIdx}>
                                       <TableCell className="text-xs">{obat.kode_brng}</TableCell>
                                       <TableCell className="text-xs">{obat.nama_brng}</TableCell>
                                       <TableCell className="text-xs">{obat.jml}</TableCell>
                                       <TableCell className="text-xs">{obat.kd_obat_bpjs}</TableCell>
                                       <TableCell className="text-xs">{obat.nama_obat_bpjs}</TableCell>
                                     </TableRow>
                                   ))}
                                 </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      ))}

                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Belum ada obat racikan</p>
                    </div>
                  )}
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <span>Tidak ada data untuk ditampilkan</span>
              </div>
            )}

          <DialogFooter>
              <Button variant="outline" onClick={() => setIsSyncModalOpen(false)}>
                Batal
              </Button>
              <Button 
                onClick={handleSyncToBPJS}
                disabled={isLoading}
                className="gradient-primary"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Sync ke BPJS
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Tambah Obat Non Racikan */}
        <Dialog open={isAddObatModalOpen} onOpenChange={setIsAddObatModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Tambah Obat Non Racikan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kdobt">Kode Obat *</Label>
                  <Input
                    id="kdobt"
                    value={newObat.KDOBT}
                    onChange={(e) => setNewObat({ ...newObat, KDOBT: e.target.value })}
                    placeholder="21250804267"
                  />
                </div>
                <div className="space-y-2 relative obat-autocomplete">
                  <Label htmlFor="nmobat">Nama Obat *</Label>
                  <Input
                    id="nmobat"
                    value={newObat.NMOBAT}
                    onChange={(e) => handleObatNameChange(e.target.value)}
                    onFocus={() => {
                      if (newObat.NMOBAT.length > 0 && filteredObatSuggestions.length > 0) {
                        setShowObatSuggestions(true);
                      }
                    }}
                    placeholder="Ketik nama obat untuk mencari..."
                    autoComplete="off"
                  />
                  {showObatSuggestions && filteredObatSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredObatSuggestions.map((obat, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleObatSelect(obat)}
                        >
                          <div className="font-medium text-sm">{obat.bpjsName}</div>
                          <div className="text-xs text-gray-500">Kode: {obat.bpjsCode}</div>
                          <div className="text-xs text-gray-400">Lokal: {obat.localName}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {isLoadingMapping && (
                    <div className="text-xs text-gray-500 mt-1">Memuat data obat...</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jmlobt">Jumlah Obat *</Label>
                  <Input
                    id="jmlobt"
                    value={newObat.JMLOBT}
                    onChange={(e) => setNewObat({ ...newObat, JMLOBT: e.target.value })}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signa1obt">Signa 1 *</Label>
                  <Input
                    id="signa1obt"
                    value={newObat.SIGNA1OBT}
                    onChange={(e) => setNewObat({ ...newObat, SIGNA1OBT: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signa2obt">Signa 2 *</Label>
                  <Input
                    id="signa2obt"
                    value={newObat.SIGNA2OBT}
                    onChange={(e) => setNewObat({ ...newObat, SIGNA2OBT: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jho">JHO *</Label>
                  <Input
                    id="jho"
                    value={newObat.JHO}
                    onChange={(e) => setNewObat({ ...newObat, JHO: e.target.value })}
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddObatModalOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddObat} className="bg-blue-600 hover:bg-blue-700">
                Tambah Obat
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Tambah Obat Racikan */}
        <Dialog open={isAddRacikanModalOpen} onOpenChange={setIsAddRacikanModalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Tambah Obat Racikan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jnsrobt">Jenis Racikan *</Label>
                  <Select
                    value={newRacikan.JNSROBT}
                    onValueChange={(value) => setNewRacikan({ ...newRacikan, JNSROBT: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Jenis Racikan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Puyer">Puyer</SelectItem>
                      <SelectItem value="Kapsul">Kapsul</SelectItem>
                      <SelectItem value="Bapil">Bapil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jmlobat">Jumlah Item</Label>
                  <Input
                    id="jmlobat"
                    value={newRacikan.JMLOBAT}
                    onChange={(e) => setNewRacikan({ ...newRacikan, JMLOBAT: e.target.value })}
                    placeholder="2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jmlracikan">Jumlah Racikan *</Label>
                  <Input
                    id="jmlracikan"
                    value={newRacikan.JMLRACIKAN}
                    onChange={(e) => setNewRacikan({ ...newRacikan, JMLRACIKAN: e.target.value })}
                    placeholder="30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="no_racik">No. Racikan</Label>
                  <Input
                    id="no_racik"
                    value={newRacikan.NO_RACIK}
                    onChange={(e) => setNewRacikan({ ...newRacikan, NO_RACIK: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aturan_pakai">Aturan Pakai *</Label>
                <Textarea
                  id="aturan_pakai"
                  value={newRacikan.ATURAN_PAKAI}
                  onChange={(e) => setNewRacikan({ ...newRacikan, ATURAN_PAKAI: e.target.value })}
                  placeholder="1 x 1"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signa1racikan">Signa 1 *</Label>
                  <Input
                    id="signa1racikan"
                    value={newRacikan.SIGNA1RACIKAN}
                    onChange={(e) => setNewRacikan({ ...newRacikan, SIGNA1RACIKAN: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signa2racikan">Signa 2 *</Label>
                  <Input
                    id="signa2racikan"
                    value={newRacikan.SIGNA2RACIKAN}
                    onChange={(e) => setNewRacikan({ ...newRacikan, SIGNA2RACIKAN: e.target.value })}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jhoracikan">JHO Racikan *</Label>
                  <Input
                    id="jhoracikan"
                    value={newRacikan.JHORACIKAN}
                    onChange={(e) => setNewRacikan({ ...newRacikan, JHORACIKAN: e.target.value })}
                    placeholder="1"
                  />
                </div>
              </div>
              
              {/* Detail Obat Section */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium text-lg">Detail Obat dalam Racikan</h4>
                
                {/* Form untuk menambah detail obat */}
                <div className="grid grid-cols-[1fr_2fr_auto_auto] gap-4 p-4 bg-gray-50 rounded-lg items-end">
                  <div className="space-y-2">
                    <Label htmlFor="kdobt_detail">Kode Obat *</Label>
                    <Input
                      id="kdobt_detail"
                      value={newDetailObat.KDOBT}
                      onChange={(e) => setNewDetailObat({ ...newDetailObat, KDOBT: e.target.value })}
                      placeholder="A001"
                    />
                  </div>
                  <div className="space-y-2 relative detail-obat-autocomplete">
                    <Label htmlFor="nmobat_detail">Nama Obat *</Label>
                    <Input
                      id="nmobat_detail"
                      value={newDetailObat.NMOBAT}
                      onChange={(e) => handleDetailObatNameChange(e.target.value)}
                      onFocus={() => {
                        if (newDetailObat.NMOBAT.length > 0 && filteredDetailObatSuggestions.length > 0) {
                          setShowDetailObatSuggestions(true);
                        }
                      }}
                      placeholder="Ketik nama obat untuk mencari..."
                      autoComplete="off"
                    />
                    {showDetailObatSuggestions && filteredDetailObatSuggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredDetailObatSuggestions.map((obat, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => handleDetailObatSelect(obat)}
                          >
                            <div className="font-medium text-sm">{obat.bpjsName}</div>
                            <div className="text-xs text-gray-500">Kode: {obat.bpjsCode}</div>
                            <div className="text-xs text-gray-400">Lokal: {obat.localName}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isLoadingMapping && (
                      <div className="text-xs text-gray-500 mt-1">Memuat data obat...</div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jmlobt_detail">Jumlah *</Label>
                    <Input
                      id="jmlobt_detail"
                      value={newDetailObat.JMLOBT}
                      onChange={(e) => setNewDetailObat({ ...newDetailObat, JMLOBT: e.target.value })}
                      placeholder="10"
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button 
                      type="button"
                      onClick={handleAddDetailObat}
                      className="bg-blue-600 hover:bg-blue-700 w-10 h-10 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Tabel detail obat */}
                {newRacikan.detail.length > 0 && (
                  <div className="space-y-2">
                    <Label>Daftar Detail Obat ({newRacikan.detail.length} item)</Label>
                    <div className="border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kode Obat</TableHead>
                            <TableHead>Nama Obat</TableHead>
                            <TableHead>Jumlah</TableHead>
                            <TableHead className="w-20">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {newRacikan.detail.map((detail: any, index: number) => (
                            <TableRow key={index}>
                              <TableCell>{detail.KDOBT}</TableCell>
                              <TableCell>{detail.NMOBAT}</TableCell>
                              <TableCell>{detail.JMLOBT}</TableCell>
                              <TableCell>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleRemoveDetailObat(index)}
                                >
                                  Hapus
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddRacikanModalOpen(false);
                setNewRacikan({
                  JNSROBT: '',
                  JMLOBAT: '2',
                  JMLRACIKAN: '',
                  NO_RACIK: '1',
                  ATURAN_PAKAI: '',
                  SIGNA1RACIKAN: '',
                  SIGNA2RACIKAN: '',
                  JHORACIKAN: '',
                  detail: []
                });
                setNewDetailObat({
                  KDOBT: '',
                  NMOBAT: '',
                  JMLOBT: ''
                });
              }}>
                Batal
              </Button>
              <Button onClick={handleAddRacikan} className="bg-green-600 hover:bg-green-700">
                Tambah Racikan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal Detail SEP */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span>Detail SEP</span>
              </DialogTitle>
              <DialogDescription>
                Informasi lengkap data SEP dan resep
              </DialogDescription>
            </DialogHeader>
            
            {selectedSepForDetail && (
              <div className="space-y-6">
                {/* Informasi SEP */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg border-b pb-2">Informasi SEP</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">No SEP:</span>
                        <span>{selectedSepForDetail.noSep}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">No Kartu:</span>
                        <span>{selectedSepForDetail.nokartu}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Nama Peserta:</span>
                        <span>{selectedSepForDetail.namapeserta}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Jenis Kelamin:</span>
                        <span>{selectedSepForDetail.jnskelamin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tanggal Lahir:</span>
                        <span>{selectedSepForDetail.tgllhr}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Jenis Peserta:</span>
                        <span>{selectedSepForDetail.nmjenispeserta}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="font-semibold text-lg border-b pb-2">Informasi Pelayanan</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">Tanggal SEP:</span>
                        <span>{selectedSepForDetail.tglsep}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tanggal Pulang:</span>
                        <span>{selectedSepForDetail.tglplgsep}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Jenis Pelayanan:</span>
                        <span>{selectedSepForDetail.jnspelayanan}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Poli:</span>
                        <span>{selectedSepForDetail.poli}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Diagnosa:</span>
                        <span>{selectedSepForDetail.nmdiag}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Dokter:</span>
                        <span>{selectedSepForDetail.namadokter}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Informasi Faskes */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg border-b pb-2">Informasi Faskes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Kode Faskes Asal:</span>
                      <span>{selectedSepForDetail.faskesasalresep}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Nama Faskes Asal:</span>
                      <span>{selectedSepForDetail.nmfaskesasalresep}</span>
                    </div>
                  </div>
                </div>

                {/* Daftar Obat */}
                {(() => {
                  const medicines = selectedSepForDetail.prescriptionData?.medicines || [];
                  const postDataObat = (selectedSepForDetail as any).post_data?.obat || [];
                  const postDataRacikan = (selectedSepForDetail as any).post_data?.racikan || [];
                  
                  // Gabungkan data dari prescriptionData.medicines atau post_data
                  const allMedicines = medicines.length > 0 ? medicines : [
                    ...postDataObat.map((obat: any) => ({
                      kodeObat: obat.KDOBT,
                      namaObat: obat.NMOBAT,
                      jumlah: parseInt(obat.JMLOBT) || 0,
                      aturanPakai: `${obat.SIGNA1OBT}x${obat.SIGNA2OBT}`,
                      jenisObat: 'non-racikan'
                    })),
                    ...postDataRacikan.map((racikan: any) => ({
                      kodeObat: racikan.NO_RACIK,
                      namaObat: racikan.JNSROBT,
                      jumlah: parseInt(racikan.JMLRACIKAN) || 0,
                      aturanPakai: racikan.ATURAN_PAKAI || `${racikan.SIGNA1RACIKAN}x${racikan.SIGNA2RACIKAN}`,
                      jenisObat: 'racikan',
                      detail: racikan.detail
                    }))
                  ];
                  
                  return allMedicines.length > 0 ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-lg border-b pb-2">Daftar Obat ({allMedicines.length} item)</h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>No</TableHead>
                              <TableHead>Jenis</TableHead>
                              <TableHead>Kode Obat</TableHead>
                              <TableHead>Nama Obat</TableHead>
                              <TableHead>Jumlah</TableHead>
                              <TableHead>Aturan Pakai</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allMedicines.map((medicine: any, index: number) => (
                              <TableRow key={index}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>
                                  <Badge variant={medicine.jenisObat === 'racikan' ? 'secondary' : 'default'}>
                                    {medicine.jenisObat === 'racikan' ? 'Racikan' : 'Non-Racikan'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{medicine.kodeObat}</TableCell>
                                <TableCell>
                                  {medicine.namaObat}
                                  {medicine.jenisObat === 'racikan' && medicine.detail && medicine.detail.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Komposisi: {medicine.detail.map((d: any) => `${d.nama_brng} (${d.jml})`).join(', ')}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>{medicine.jumlah}</TableCell>
                                <TableCell>{medicine.aturanPakai}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Status dan File */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg border-b pb-2">Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge variant={selectedSepForDetail.status === 'Tersimpan' ? 'default' : 'secondary'}>
                        {selectedSepForDetail.status || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Jumlah Obat:</span>
                        <span>{selectedSepForDetail.jumlahObat || 0}</span>
                      </div>
                      {selectedSepForDetail.prescriptionData?.medicines && (
                        <div className="ml-4 text-xs text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>• Non-racikan:</span>
                            <span>{selectedSepForDetail.prescriptionData.medicines.filter(m => m.jenisObat === 'non-racikan').length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>• Racikan:</span>
                            <span>{selectedSepForDetail.prescriptionData.medicines.filter(m => m.jenisObat === 'racikan').length}</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Jumlah Racikan:</span>
                        <span>{selectedSepForDetail.jumlahRacikan || 0}</span>
                      </div>
                      {selectedSepForDetail.prescriptionData?.medicines && selectedSepForDetail.jumlahRacikan > 0 && (
                        <div className="ml-4 text-xs text-gray-600 space-y-1">
                          {selectedSepForDetail.prescriptionData.medicines
                            .filter(m => m.jenisObat === 'racikan')
                            .map((racikan, index) => (
                              <div key={index} className="flex justify-between">
                                <span>• {racikan.namaObat}:</span>
                                <span>{racikan.komposisi?.length || 0} komposisi</span>
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </div>
                    {selectedSepForDetail.fileName && (
                      <div className="col-span-1 md:col-span-3">
                        <div className="flex justify-between">
                          <span className="font-medium">File Name:</span>
                          <span className="font-mono text-xs">{selectedSepForDetail.fileName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                Tutup
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default SepPharmacyData;
