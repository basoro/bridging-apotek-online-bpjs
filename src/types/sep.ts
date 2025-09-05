
export interface SepResponse {
  response: SepData;
  metaData: {
    code: string;
    message: string;
  };
}

export interface SepDataRaw {
  noSep: string;
  faskesasalresep: string;
  nmfaskesasalresep: string;
  nokartu: string;
  namapeserta: string;
  jnskelamin: string;
  tgllhr: string;
  pisat: string;
  kdjenispeserta: string;
  nmjenispeserta: string;
  kodebu: string;
  namabu: string;
  tglsep: string;
  tglplgsep: string;
  jnspelayanan: string;
  nmdiag: string;
  poli: string;
  flagprb: string;
  namaprb: string;
  kodedokter: string;
  namadokter: string;
}

export interface SepData {
  noSep: string;
  faskesasalresep: string;
  nmfaskesasalresep: string;
  nokartu: string;
  namapeserta: string;
  jnskelamin: string;
  tgllhr: string;
  pisat: string;
  kdjenispeserta: string;
  nmjenispeserta: string;
  kodebu: string;
  namabu: string;
  tglsep: string;
  tglplgsep: string;
  jnspelayanan: string;
  nmdiag: string;
  poli: string;
  flagprb: string;
  namaprb: string;
  kodedokter: string;
  namadokter: string | null;
  // Extended data from local endpoint
  prescriptionData?: PrescriptionData;
  // Raw data from BPJS API
  dataRaw?: SepDataRaw;
  // Additional properties for saved SEP data
  fileName?: string;
  status?: string;
  jumlahObat?: number;
  jumlahRacikan?: number;
}

export interface PrescriptionData {
  noKunjungan: string;
  tglKunjungan: string;
  keluhan: string;
  diagnosa: string;
  tindakan: string;
  medicines: MedicineData[];
}

export interface MedicineData {
  id: string;
  kodeObat: string;
  namaObat: string;
  jenisObat: 'non-racikan' | 'racikan';
  jumlah: number;
  signa: string;
  aturanPakai: string;
  harga: number;
  // For racikan
  komposisi?: KomposisiObat[];
}

export interface KomposisiObat {
  kodeObat: string;
  namaObat: string;
  jumlah: number;
  satuan: string;
}

export interface KunjunganData {
  noKunjungan: string;
  noSep: string;
  tglKunjungan: string;
  keluhan: string;
  diagnosa: string;
  tindakan: string;
}
