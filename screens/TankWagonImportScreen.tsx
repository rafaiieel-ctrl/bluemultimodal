import React, { useState, useCallback, useRef } from 'react';
import { TankWagon, CalibrationRow, CalibrationStep, ImportReport, ValidationError, TankWagonCalibrationPoint } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { AlertTriangleIcon, ArrowUpCircleIcon, CheckCircleIcon, FileDownIcon, FileTextIcon, Loader2Icon, XIcon } from '../components/ui/icons';
import { Textarea } from '../components/ui/Textarea';

const CSV_HEADER = "CERT_TYPE;CERT_NUMBER;ISSUER;ISSUE_DATE;VALID_UNTIL;DOC;EXE;METROL;STATUS;OWNER_NAME;OWNER_CNPJ;OWNER_STREET;OWNER_NUM;OWNER_DIST;OWNER_CITY;OWNER_STATE;OWNER_ZIP;OWNER_PHONE;WAGON_MFR;WAGON_MODEL;WAGON_YEAR;WAGON_SERIAL;INMETRO_ID;REGISTRATION;DIAMETER_MM;LENGTH_MM;DOMO_TYPE;DOMO_HREF_MM;CAL_MEDIUM;REF_TEMP_C;ULLAGE_EMPTY_MM;ULLAGE_FULL_MM;ULLAGE_TOTAL_MM;NOMINAL_CAP_L;TANK_STEPS_JSON;DOMO_STEPS_JSON;LAB_NAME;RBC_CODE;TECHNICIAN;RESP_TECH;SIGN_DATE;OBS";

interface TankWagonImportScreenProps {
    existingTankWagons: TankWagon[];
    onSave: (wagons: TankWagon[]) => void;
    onBack: () => void;
}

export const TankWagonImportScreen: React.FC<TankWagonImportScreenProps> = ({ existingTankWagons, onSave, onBack }) => {
    const [file, setFile] = useState<File | null>(null);
    const [textContent, setTextContent] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [report, setReport] = useState<ImportReport | null>(null);
    const [parsedRows, setParsedRows] = useState<CalibrationRow[]>([]);
    const [rowsStatus, setRowsStatus] = useState<Record<number, 'ok' | 'warning' | 'error'>>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setReport(null);
            setParsedRows([]);
            setRowsStatus({});
            const content = await selectedFile.text();
            setTextContent(content);
        }
    };

    const processData = useCallback(async () => {
        if (!textContent.trim()) return;

        setIsProcessing(true);
        await new Promise(res => setTimeout(res, 500));

        const lines = textContent.split(/\r?\n/).filter(line => line.trim() !== '');
        
        const localReport: ImportReport = {
            filename: file?.name || 'dados_colados.txt',
            totalRows: 0, imported: 0, skipped: 0,
            errors: [], warnings: [],
        };
        const localParsedRows: CalibrationRow[] = [];
        const localRowsStatus: Record<number, 'ok' | 'warning' | 'error'> = {};
        
        if (lines.length === 0) {
            localReport.errors.push({ line: 0, field: 'general', message: 'Nenhum dado para processar.', severity: 'error' });
            setReport(localReport);
            setIsProcessing(false);
            return;
        }
        
        const hasHeader = lines[0].trim() === CSV_HEADER;
        const dataLines = hasHeader ? lines.slice(1) : lines;

        if (dataLines.length === 0) {
             localReport.errors.push({ line: 1, field: 'general', message: 'Arquivo contém apenas o cabeçalho.', severity: 'error' });
            setReport(localReport);
            setIsProcessing(false);
            return;
        }

        localReport.totalRows = dataLines.length;

        dataLines.forEach((line, index) => {
            const lineNum = index + (hasHeader ? 2 : 1);
            const values = line.split(';');
            const row: Partial<CalibrationRow> = {};
            const headerKeys = CSV_HEADER.split(';') as (keyof CalibrationRow)[];
            
            if (values.length < headerKeys.length) {
                localReport.errors.push({ line: lineNum, field: 'general', message: `Linha com número de colunas incorreto. Esperado: ${headerKeys.length}, Encontrado: ${values.length}.`, severity: 'error' });
                localRowsStatus[lineNum] = 'error';
                localReport.skipped++;
                return; // Skip this malformed line
            }

            headerKeys.forEach((key, i) => {
                // @ts-ignore
                row[key] = values[i] || '';
            });

            // Basic validation and type conversion
            const numberFields: (keyof CalibrationRow)[] = ['DIAMETER_MM', 'LENGTH_MM', 'REF_TEMP_C', 'ULLAGE_EMPTY_MM', 'ULLAGE_FULL_MM', 'ULLAGE_TOTAL_MM', 'NOMINAL_CAP_L'];
            numberFields.forEach(field => {
                // @ts-ignore
                const numVal = parseFloat(String(row[field]).replace(',', '.'));
                // @ts-ignore
                row[field] = isNaN(numVal) ? 0 : numVal;
            });

            // JSON parsing validation
            try {
                JSON.parse(row.TANK_STEPS_JSON || '[]');
                JSON.parse(row.DOMO_STEPS_JSON || '[]');
            } catch {
                localReport.errors.push({ line: lineNum, field: 'TANK_STEPS_JSON', message: 'JSON de medição do tanque ou domo é inválido.', severity: 'error' });
            }

            localParsedRows.push(row as CalibrationRow);
            
            // Business logic validation
            const lineErrors: ValidationError[] = [];
            const lineWarnings: ValidationError[] = [];

            if (!row.CERT_NUMBER) {
                lineErrors.push({ line: lineNum, field: 'CERT_NUMBER', message: 'Número do certificado é obrigatório.', severity: 'error' });
            }
            if (row.VALID_UNTIL && row.ISSUE_DATE && new Date(row.VALID_UNTIL) < new Date(row.ISSUE_DATE)) {
                lineErrors.push({ line: lineNum, field: 'VALID_UNTIL', message: 'Data de validade não pode ser anterior à data de emissão.', severity: 'error' });
            }
            const cnpj = (row.OWNER_CNPJ || '').replace(/\D/g, '');
            if (cnpj.length !== 14 && cnpj.length !== 0) {
                lineWarnings.push({ line: lineNum, field: 'OWNER_CNPJ', message: `CNPJ '${row.OWNER_CNPJ}' parece inválido.`, severity: 'warning' });
            }

            try {
                const tankSteps: CalibrationStep[] = JSON.parse(row.TANK_STEPS_JSON || '[]');
                const domeSteps: CalibrationStep[] = JSON.parse(row.DOMO_STEPS_JSON || '[]');
                const allSteps = [...tankSteps, ...domeSteps];

                if (allSteps.length > 0 && row.NOMINAL_CAP_L) {
                    const maxVolume = Math.max(...allSteps.map(s => s.volume_L), 0);
                    const diff = Math.abs(row.NOMINAL_CAP_L - maxVolume);

                    // Adjusted tolerances to be more lenient based on user feedback.
                    const errorTolerancePercent = 0.05; // 5%
                    const warningTolerancePercent = 0.02; // 2%
                    const errorTolerance = row.NOMINAL_CAP_L * errorTolerancePercent;
                    const warningTolerance = row.NOMINAL_CAP_L * warningTolerancePercent;

                    if (diff > errorTolerance) {
                        lineErrors.push({ line: lineNum, field: 'NOMINAL_CAP_L', message: `Capacidade nominal (${row.NOMINAL_CAP_L}L) difere >${errorTolerancePercent * 100}% do volume máximo das tabelas (${maxVolume}L).`, severity: 'error' });
                    } else if (diff > warningTolerance) {
                         lineWarnings.push({ line: lineNum, field: 'NOMINAL_CAP_L', message: `Capacidade nominal (${row.NOMINAL_CAP_L}L) difere >${warningTolerancePercent * 100}% do volume máximo das tabelas (${maxVolume}L).`, severity: 'warning' });
                    }
                }
            } catch {}

            localReport.errors.push(...lineErrors);
            localReport.warnings.push(...lineWarnings);
            
            if (lineErrors.length > 0) {
                localRowsStatus[lineNum] = 'error';
                localReport.skipped++;
            } else if (lineWarnings.length > 0) {
                localRowsStatus[lineNum] = 'warning';
                localReport.imported++;
            } else {
                localRowsStatus[lineNum] = 'ok';
                localReport.imported++;
            }
        });

        setReport(localReport);
        setParsedRows(localParsedRows);
        setRowsStatus(localRowsStatus);
        setIsProcessing(false);
    }, [textContent, file]);

    const handleSaveWagons = () => {
        if (!report || report.imported === 0) return;
        
        const validWagons: TankWagon[] = parsedRows
            .filter((_, index) => rowsStatus[index + (textContent.trim().startsWith(CSV_HEADER) ? 2 : 1)] !== 'error')
            .map(row => {
                const tankSteps: CalibrationStep[] = JSON.parse(row.TANK_STEPS_JSON || '[]');
                const domeSteps: CalibrationStep[] = JSON.parse(row.DOMO_STEPS_JSON || '[]');
                const allSteps = [...tankSteps, ...domeSteps];

                const calibrationTable: TankWagonCalibrationPoint[] = allSteps
                    .map(s => ({
                        emptySpaceMm: s.ullage_mm,
                        volumeL: s.volume_L,
                    }))
                    .sort((a, b) => a.emptySpaceMm - b.emptySpaceMm);
                
                return {
                    id: Date.now() + Math.random(), // Temp ID
                    name: row.WAGON_MODEL || row.CERT_NUMBER, // Use WAGON_MODEL as primary ID
                    inmetroNumber: row.INMETRO_ID,
                    brand: row.WAGON_MFR,
                    calibrationDate: row.ISSUE_DATE,
                    certificateNumber: row.CERT_NUMBER,
                    validUntil: row.VALID_UNTIL,
                    calibrationTable: calibrationTable,
                };
            });
        
        onSave(validWagons);
    };

    const downloadReport = () => {
        if (!report) return;
        const json = JSON.stringify(report, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${file?.name.replace(/\.[^/.]+$/, "") || 'dados_colados'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tight">Importar Certificados de Vagão-Tanque</h1>

            <Card>
                <details>
                    <summary className="cursor-pointer font-semibold text-primary hover:underline">
                        Ver Exemplo do Padrão de Arquivo
                    </summary>
                    <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground space-y-2">
                        <p>O arquivo deve ser um <strong>.txt</strong> ou <strong>.csv</strong> com codificação <strong>UTF-8</strong> e ponto-e-vírgula (<strong>;</strong>) como delimitador.</p>
                        <p><strong>Cabeçalho (obrigatório e nesta ordem):</strong></p>
                        <pre className="p-2 bg-secondary rounded-md text-foreground overflow-x-auto">
                            <code>{CSV_HEADER}</code>
                        </pre>
                        <p><strong>Exemplo de linha de dados:</strong></p>
                        <pre className="p-2 bg-secondary rounded-md text-foreground overflow-x-auto">
                            <code>
                                {`INMETRO;154742;INMETRO;2023-01-18;2027-01-17;116;113;194;APROVADO;GREENBRIER MAXION;21.042.930/0001-38;AV. CARLOS ROBERTO PRATAVIERA;71;SITIO SÃO JOÃO;Hortolândia;SP;13184-859;1921182241;GREENBRIER MAXION;TCT 034.467-2;2023;15066617;15066617;;2742;18710;;;;Etanol;20;312;2888;3000;108050;[{"step":0,"volume_L":106050,"ullage_mm":312},{"step":1,"volume_L":106000,"ullage_mm":316}];[{"step":1,"volume_L":106100,"ullage_mm":306},{"step":2,"volume_L":106150,"ullage_mm":301}];IPEM-SP;194 RCAMP/VTVGT;Luiz Carlos Baguarias;Luiz Carlos Baguarias;2023-01-18;AFERIDO COM ENCANAMENTO VAZIO (B.L.)`}
                            </code>
                        </pre>
                    </div>
                </details>
            </Card>

            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <Textarea
                        label="1. Cole o conteúdo do certificado ou envie um arquivo"
                        value={textContent}
                        onChange={(e) => { setTextContent(e.target.value); setReport(null); setFile(null); }}
                        placeholder={`${CSV_HEADER}\n...`}
                        className="h-48 md:col-span-3 font-mono text-xs"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-4">
                    <Button 
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        icon={<ArrowUpCircleIcon className="h-4 w-4"/>}
                    >
                        Enviar Arquivo TXT/CSV
                    </Button>
                    <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.csv" onChange={handleFileChange} />
                    
                    <div className="flex-grow"></div>
                    
                    <Button onClick={processData} disabled={!textContent.trim() || isProcessing}>
                        {isProcessing ? <Loader2Icon className="h-4 w-4 mr-2"/> : null}
                        {isProcessing ? 'Processando...' : '2. Analisar e Validar Dados'}
                    </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">A análise é feita localmente no seu navegador. Nenhum dado é enviado para servidores.</p>
            </Card>

            {report && (
                 <div className="space-y-6 animate-fade-in">
                    <Card>
                        <h2 className="text-lg font-semibold mb-4">Relatório de Importação</h2>
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 rounded-lg bg-secondary"><p className="text-xs text-muted-foreground">Linhas de Dados</p><p className="text-2xl font-bold">{report.totalRows}</p></div>
                            <div className="p-3 rounded-lg bg-green-100/50 dark:bg-green-900/30"><p className="text-xs text-green-600">Importáveis</p><p className="text-2xl font-bold text-green-600">{report.imported}</p></div>
                            <div className="p-3 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/30"><p className="text-xs text-yellow-600">Avisos</p><p className="text-2xl font-bold text-yellow-600">{report.warnings.length}</p></div>
                            <div className="p-3 rounded-lg bg-red-100/50 dark:bg-red-900/30"><p className="text-xs text-red-600">Erros (Ignorados)</p><p className="text-2xl font-bold text-red-600">{report.skipped}</p></div>
                        </div>
                    </Card>
                    <Card>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Pré-visualização (Primeiras 10 linhas)</h2>
                        </div>
                        <div className="overflow-x-auto border rounded-md">
                            <table className="w-full text-xs">
                                <thead className="bg-secondary">
                                    <tr>
                                        <th className="p-2 text-left">Linha</th>
                                        <th className="p-2 text-left">Status</th>
                                        <th className="p-2 text-left">Nº Certificado</th>
                                        <th className="p-2 text-left">Nº Série Vagão</th>
                                        <th className="p-2 text-left">Validade</th>
                                        <th className="p-2 text-left">Erros/Avisos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedRows.slice(0, 10).map((row, index) => {
                                        const lineNum = index + (textContent.trim().startsWith(CSV_HEADER) ? 2 : 1);
                                        const status = rowsStatus[lineNum];
                                        const messages = [...report.errors, ...report.warnings].filter(e => e.line === lineNum).map(e => e.message).join(', ');
                                        
                                        const statusChip: Record<typeof status, React.ReactNode> = {
                                            ok: <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 text-green-700"><CheckCircleIcon className="h-3 w-3" /> OK</span>,
                                            warning: <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700"><AlertTriangleIcon className="h-3 w-3" /> Aviso</span>,
                                            error: <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 text-red-700"><XIcon className="h-3 w-3"/> Erro</span>,
                                        };
                                        return (
                                            <tr key={lineNum} className="border-b last:border-0">
                                                <td className="p-2 font-mono">{lineNum}</td>
                                                <td className="p-2">{statusChip[status] || ''}</td>
                                                <td className="p-2">{row.CERT_NUMBER}</td>
                                                <td className="p-2">{row.WAGON_SERIAL}</td>
                                                <td className="p-2">{row.VALID_UNTIL}</td>
                                                <td className="p-2 text-red-600 truncate max-w-xs" title={messages}>{messages}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <div className="flex flex-wrap gap-2 justify-end">
                        <Button variant="secondary" onClick={onBack}>Voltar</Button>
                        <Button variant="secondary" onClick={downloadReport} icon={<FileDownIcon className="h-4 w-4"/>}>Baixar Relatório JSON</Button>
                        <Button onClick={handleSaveWagons} disabled={report.imported === 0}>
                            Salvar {report.imported} Vagão(ões) Válido(s)
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};