
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Product } from '../types';
import { FileSpreadsheet, AlertCircle } from 'lucide-react';

interface ExcelUploaderProps {
  onDataLoaded: (data: Product[]) => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({ onDataLoaded }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setIsProcessing(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) throw new Error("Файл пуст");

        const products: Product[] = json.map((row, i) => {
          const keys = Object.keys(row);
          const brand = row[keys.find(k => k.toLowerCase().includes('бренд') || k.toLowerCase().includes('brand')) || keys[0]];
          const name = row[keys.find(k => k.toLowerCase().includes('назв') || k.toLowerCase().includes('name')) || keys[1]];
          const price = row[keys.find(k => k.toLowerCase().includes('цена') || k.toLowerCase().includes('price')) || keys[2]];
          
          return {
            id: String(i),
            brand: String(brand || ''),
            name: String(name || ''),
            price: price || 0,
            ...row
          };
        });

        onDataLoaded(products);
      } catch (err) {
        setError("Не удалось прочитать файл");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="w-full">
      <label className={`flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-3xl cursor-pointer hover:bg-slate-50 transition-all ${error ? 'border-red-200' : 'border-slate-100'}`}>
        <FileSpreadsheet className="w-10 h-10 text-slate-300 mb-4" />
        <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
          {isProcessing ? 'Загрузка...' : 'Выберите файл .xlsx'}
        </span>
        <input type="file" className="hidden" accept=".xlsx,.xls" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
      </label>
      {error && <div className="mt-4 text-red-500 text-[10px] font-black uppercase">{error}</div>}
    </div>
  );
};
