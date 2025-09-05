
import React, { useState } from 'react';
import { Eye, Filter, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Prescription } from '@/types/bpjs';

const PrescriptionTable: React.FC = () => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data
  const mockPrescriptions: Prescription[] = [
    {
      id: 'RX001',
      patientId: '1',
      patientName: 'Budi Santoso',
      doctorName: 'Dr. Sarah',
      createdAt: '2024-01-15T10:30:00Z',
      medicines: [
        {
          medicineId: '1',
          medicineName: 'Amoxicillin 500mg',
          quantity: 10,
          dosage: '3x1',
          instructions: 'Sesudah makan'
        }
      ],
      status: 'submitted',
      bpjsStatus: 'approved',
      totalAmount: 25000,
      notes: 'Infeksi saluran pernapasan'
    },
    {
      id: 'RX002',
      patientId: '2',
      patientName: 'Siti Aminah',
      doctorName: 'Dr. Ahmad',
      createdAt: '2024-01-15T14:15:00Z',
      medicines: [
        {
          medicineId: '2',
          medicineName: 'Paracetamol 500mg',
          quantity: 20,
          dosage: '3x1',
          instructions: 'Saat demam'
        }
      ],
      status: 'dispensed',
      bpjsStatus: 'pending',
      totalAmount: 20000
    },
    {
      id: 'RX003',
      patientId: '3',
      patientName: 'Andi Wijaya',
      doctorName: 'Dr. Linda',
      createdAt: '2024-01-16T09:00:00Z',
      medicines: [
        {
          medicineId: '1',
          medicineName: 'Amoxicillin 500mg',
          quantity: 15,
          dosage: '2x1',
          instructions: 'Sesudah makan'
        }
      ],
      status: 'approved',
      bpjsStatus: 'rejected',
      totalAmount: 37500,
      notes: 'Alergi penisilin - perlu konfirmasi'
    }
  ];

  const getStatusBadge = (status: string, type: 'status' | 'bpjs') => {
    const statusConfig = {
      status: {
        draft: { class: 'bg-gray-100 text-gray-800', text: 'Draft' },
        submitted: { class: 'status-pending', text: 'Dikirim' },
        approved: { class: 'status-success', text: 'Disetujui' },
        rejected: { class: 'status-error', text: 'Ditolak' },
        dispensed: { class: 'status-success', text: 'Diserahkan' }
      },
      bpjs: {
        pending: { class: 'status-pending', text: 'Menunggu' },
        approved: { class: 'status-success', text: 'Disetujui BPJS' },
        rejected: { class: 'status-error', text: 'Ditolak BPJS' },
        error: { class: 'status-error', text: 'Error' }
      }
    };

    const config = statusConfig[type][status as keyof typeof statusConfig[typeof type]];
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const filteredPrescriptions = mockPrescriptions.filter(prescription => {
    const matchesFilter = filter === 'all' || prescription.bpjsStatus === filter;
    const matchesSearch = searchTerm === '' || 
      prescription.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prescription.doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  return (
    <Card className="medical-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Monitoring Resep & Klaim BPJS</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Cari berdasarkan nama pasien, ID resep, atau dokter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter status BPJS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="pending">Menunggu</SelectItem>
              <SelectItem value="approved">Disetujui</SelectItem>
              <SelectItem value="rejected">Ditolak</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID Resep</TableHead>
                <TableHead>Pasien</TableHead>
                <TableHead>Dokter</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jumlah Obat</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Status BPJS</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPrescriptions.map((prescription) => (
                <TableRow key={prescription.id}>
                  <TableCell className="font-medium">{prescription.id}</TableCell>
                  <TableCell>{prescription.patientName}</TableCell>
                  <TableCell>{prescription.doctorName}</TableCell>
                  <TableCell>{formatDate(prescription.createdAt)}</TableCell>
                  <TableCell>{prescription.medicines.length} item</TableCell>
                  <TableCell>{formatCurrency(prescription.totalAmount)}</TableCell>
                  <TableCell>{getStatusBadge(prescription.status, 'status')}</TableCell>
                  <TableCell>{getStatusBadge(prescription.bpjsStatus, 'bpjs')}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredPrescriptions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Tidak ada data resep yang ditemukan</p>
            <p className="text-sm">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrescriptionTable;
