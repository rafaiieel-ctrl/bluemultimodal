import React, { useState, useEffect, useMemo } from 'react';
import { TankWagon, TankWagonCalibrationPoint } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Trash2Icon, PlusCircleIcon, Loader2Icon } from '../components/ui/icons';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { interpolate } from '../services/calculationService';
import { brToNumber, numberToBr } from '../utils/helpers';

const createNewTankWagon = (): TankWagon => ({
    id: Date.now(),
    name: '',
    certificateNumber: '',
    validUntil: '',
    calibrationTable: [],
});

interface TankWagonScreenProps {
    tankWagon?: TankWagon;
    onSave: (wagon: TankWagon) => void;
    onBack: () => void;
}

export const TankWagonScreen: React.FC<TankWagonScreenProps> = ({ tankWagon, onSave, onBack }) => {
    const isCreating = !tankWagon;
    const [wagonData, setWagonData] = useState<TankWagon>(() => isCreating ? createNewTankWagon() : { ...tankWagon! });
    const [initialState, setInitialState] = useState(() => wagonData);
    const [isDirty, setIsDirty] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    
    const [testHeight, setTestHeight] = useState('');
    const interpolatedVolume = useMemo(() => {
        const heightNum = brToNumber(testHeight);
        if (isNaN(heightNum)) return NaN;
        return interpolate(heightNum, wagonData.calibrationTable.map(p => ({ height: p.emptySpaceMm, volume: p.volumeL })));
    }, [testHeight, wagonData.calibrationTable]);

    useEffect(() => {
        setIsDirty(JSON.stringify(wagonData) !== JSON.stringify(initialState));
    }, [wagonData, initialState]);

    const handleBack = () => {
        if (isDirty) {
            if (window.confirm('Você tem alterações não salvas. Deseja sair e descartar as alterações?')) {
                onBack();
            }
        } else {
            onBack();
        }
    };

    const handleSave = () => {
        if (saveStatus === 'saving' || !isDirty) return;

        if (!wagonData.name.trim()) {
            alert("O ID do vagão é obrigatório.");
            return;
        }
        setSaveStatus('saving');
        onSave(wagonData);
        setInitialState(wagonData);
        
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 500);
    };

    const handleDataChange = (field: keyof TankWagon, value: any) => {
        setWagonData(prev => ({ ...prev, [field]: value }));
    };

    const handleCurveChange = (index: number, field: keyof TankWagonCalibrationPoint, value: string) => {
        setWagonData(prev => ({
            ...prev,
            calibrationTable: prev.calibrationTable.map((point, i) => {
                if (i === index) {
                    const numValue = brToNumber(value);
                    return { ...point, [field]: isFinite(numValue) ? numValue : 0 };
                }
                return point;
            })
        }));
    };

    const addCurvePoint = () => {
        const newPoint: TankWagonCalibrationPoint = { emptySpaceMm: 0, volumeL: 0 };
        setWagonData(prev => ({...prev, calibrationTable: [...prev.calibrationTable, newPoint]}));
    };

    const removeCurvePoint = (index: number) => {
        setWagonData(prev => ({...prev, calibrationTable: prev.calibrationTable.filter((_, i) => i !== index)}));
    };
    
    const saveButtonText = () => {
        if (saveStatus === 'saving') return 'Salvando...';
        if (saveStatus === 'saved') return 'Salvo!';
        return isCreating ? 'Salvar Vagão' : 'Salvar Alterações';
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{isCreating ? 'Cadastrar Novo Vagão-Tanque' : `Editando: ${wagonData.name}`}</h1>
                </div>
                 <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleBack}>Voltar</Button>
                    <Button onClick={handleSave} disabled={saveStatus === 'saving' || !isDirty}>
                        {saveStatus === 'saving' && <Loader2Icon className="h-4 w-4 mr-2"/>}
                        {saveButtonText()}
                    </Button>
                </div>
            </div>

            <Card>
                <h3 className="text-lg font-semibold mb-4">Dados do Vagão-Tanque</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="ID do Vagão (Nº Fabricação)" placeholder="Ex: TCT 034.467-2" value={wagonData.name} onChange={e => handleDataChange('name', e.target.value)} />
                    <Input label="Marca" value={wagonData.brand || ''} onChange={e => handleDataChange('brand', e.target.value)} />
                    <Input label="Nº Certificado" value={wagonData.certificateNumber || ''} onChange={e => handleDataChange('certificateNumber', e.target.value)} />
                    <Input label="Nº INMETRO (Série)" value={wagonData.inmetroNumber || ''} onChange={e => handleDataChange('inmetroNumber', e.target.value)} />
                    <Input label="Data da Calibração" type="date" value={wagonData.calibrationDate || ''} onChange={e => handleDataChange('calibrationDate', e.target.value)} />
                    <Input label="Validade do Certificado" type="date" value={wagonData.validUntil || ''} onChange={e => handleDataChange('validUntil', e.target.value)} />
                </div>
            </Card>

            <Card>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Tabela de Calibração (Aferição)</h3>
                    <Button onClick={addCurvePoint} variant="secondary" size="sm" icon={<PlusCircleIcon className="h-4 w-4"/>}>Adicionar Ponto</Button>
                </div>
                <div className="max-h-96 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-secondary">
                            <tr>
                                <th className="p-2 text-left">Espaço Vazio (mm)</th>
                                <th className="p-2 text-left">Volume (L)</th>
                                <th className="p-2 w-[50px]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {wagonData.calibrationTable.length === 0 ? (
                                <tr><td colSpan={3} className="text-center p-8 text-muted-foreground">Nenhum ponto de calibração adicionado.</td></tr>
                            ) : wagonData.calibrationTable.map((point, index) => (
                                <tr key={index} className="border-b last:border-0">
                                    <td><Input type="text" value={numberToBr(point.emptySpaceMm, 0)} onChange={e => handleCurveChange(index, 'emptySpaceMm', e.target.value)} className="rounded-none border-0 border-r" placeholder="mm"/></td>
                                    <td><Input type="text" value={numberToBr(point.volumeL, 0)} onChange={e => handleCurveChange(index, 'volumeL', e.target.value)} className="rounded-none border-0 border-r" placeholder="Litros"/></td>
                                    <td className="text-center"><Button variant="ghost" size="sm" onClick={() => removeCurvePoint(index)}><Trash2Icon className="h-4 w-4 text-destructive"/></Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

             <Card>
                <h3 className="text-lg font-semibold mb-4">Testar Tabela de Calibração</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input label="Altura 'T' (mm)" value={testHeight} onChange={e => setTestHeight(e.target.value)} placeholder="Ex: 325"/>
                    <div className="md:col-span-2 bg-secondary p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">Volume Interpolado (L)</p>
                        <p className="text-2xl font-bold font-mono">{isFinite(interpolatedVolume) ? numberToBr(interpolatedVolume, 2) : '—'}</p>
                    </div>
                </div>
            </Card>
        </div>
    );
};