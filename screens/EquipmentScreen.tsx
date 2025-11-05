


import React, { useState, useRef } from 'react';
import { Vessel, EquipmentType, VesselTank, CalibrationPoint, MeasurementLog, MeasurementOperationType } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Trash2Icon, PlusCircleIcon, ShipIcon } from '../components/ui/icons';
import { getCertificateStatus } from '../utils/helpers';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

interface EquipmentScreenProps {
    vessels: Vessel[];
    setVessels: React.Dispatch<React.SetStateAction<Vessel[]>>;
    onEditVessel: (id: number | 'new') => void;
    onDeleteVessel: (id: number) => void;
}

export const EquipmentScreen: React.FC<EquipmentScreenProps> = ({ vessels, setVessels, onEditVessel, onDeleteVessel }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [vesselToDelete, setVesselToDelete] = useState<Vessel | null>(null);

    const handleDeleteClick = (e: React.MouseEvent, vessel: Vessel) => {
        e.stopPropagation();
        setVesselToDelete(vessel);
    };

    const confirmDeleteVessel = () => {
        if (vesselToDelete) {
            onDeleteVessel(vesselToDelete.id);
            setVesselToDelete(null);
        }
    };

    // --- IMPORT LOGIC (Refactored for Immutability) ---
    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (!content) {
                alert("Arquivo vazio ou ilegível.");
                return;
            }
            try {
                // Split content by the start of a new record identifier
                const records = content.split(/(?=BALSA;|TANQUE;|CALIBRACAO;|MEDICAO;)/g).filter(r => r.trim());
                processImportedData(records);
                alert("Importação concluída com sucesso!");
            } catch (error) {
                console.error("Erro na importação:", error);
                alert(`Ocorreu um erro durante a importação: ${(error as Error).message}`);
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
            }
        };
        reader.readAsText(file);
    };
    
    const processImportedData = (records: string[]) => {
        let currentVessels = [...vessels];
        const groupedMeasurements: Map<string, any> = new Map();
    
        for (const record of records) {
            const parts = record.split(';').map(p => p.trim());
            const type = parts[0];
    
            switch (type) {
                case 'BALSA':
                    currentVessels = processBalsaLine(parts, currentVessels);
                    break;
                case 'TANQUE':
                    currentVessels = processTankLine(parts, currentVessels);
                    break;
                case 'CALIBRACAO':
                    currentVessels = processCalibracaoLine(parts, currentVessels);
                    break;
                case 'MEDICAO':
                    processMedicaoLinePass1(parts, groupedMeasurements);
                    break;
                default:
                    console.warn(`Tipo de linha desconhecido ignorado: ${type}`);
            }
        }
        
        const measurementLogsByVesselId = processMedicaoLinePass2(groupedMeasurements, currentVessels);
        
        setVessels(currentVessels);
    
        for (const vesselIdStr in measurementLogsByVesselId) {
            const vesselId = Number(vesselIdStr);
            const key = `qc_history_${vesselId}`;
            const existingHistory: MeasurementLog[] = JSON.parse(localStorage.getItem(key) || '[]');
            const newHistory = measurementLogsByVesselId[vesselId];
            
            const mergedHistory = [...existingHistory, ...newHistory]
              .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    
            localStorage.setItem(key, JSON.stringify(mergedHistory));
        }
    };
    
    const processBalsaLine = (parts: string[], currentVessels: Vessel[]): Vessel[] => {
        const [, externalId, name, owner, issueDate, expiryDate, capacity, notes] = parts;
        if (!externalId || !name) throw new Error("Linha BALSA inválida. ID e Nome são obrigatórios.");

        const vesselIndex = currentVessels.findIndex(v => v.externalId === externalId);

        if (vesselIndex > -1) { // Update existing
            const updatedVessel = {
                ...currentVessels[vesselIndex],
                name,
                owner,
                issueDate,
                expiryDate,
                totalTheoreticalCapacity: parseInt(capacity, 10) || currentVessels[vesselIndex].totalTheoreticalCapacity,
                notes: notes ? notes.replace(/,/g, ';') : currentVessels[vesselIndex].notes,
                type: 'balsa-tanque' as EquipmentType
            };
            return currentVessels.map((v, i) => i === vesselIndex ? updatedVessel : v);
        } else { // Create new
            const newVessel: Vessel = {
                id: Date.now() + Math.random(),
                externalId,
                name,
                owner,
                issueDate,
                expiryDate,
                totalTheoreticalCapacity: parseInt(capacity, 10) || 0,
                notes: notes ? notes.replace(/,/g, ';') : '',
                type: 'balsa-tanque',
                certificateNumber: '',
                executor: '',
                tanks: []
            };
            return [...currentVessels, newVessel];
        }
    };

    const processTankLine = (parts: string[], currentVessels: Vessel[]): Vessel[] => {
        const [, balsaId, tankId, tankName, maxHeight, maxVolume] = parts;
        if (!balsaId || !tankId || !tankName) throw new Error("Linha TANQUE inválida.");

        const vesselIndex = currentVessels.findIndex(v => v.externalId === balsaId);
        if (vesselIndex === -1) throw new Error(`Balsa com ID ${balsaId} não encontrada para o tanque ${tankId}.`);
        
        const vessel = currentVessels[vesselIndex];
        const tankIndex = vessel.tanks.findIndex(t => t.externalId === tankId);

        let newTanks: VesselTank[];

        if (tankIndex > -1) { // Update existing tank
            const updatedTank = {
                ...vessel.tanks[tankIndex],
                tankName,
                maxCalibratedHeight: parseInt(maxHeight, 10) || vessel.tanks[tankIndex].maxCalibratedHeight,
                maxVolume: parseInt(maxVolume, 10) || vessel.tanks[tankIndex].maxVolume,
            };
            newTanks = vessel.tanks.map((t, i) => i === tankIndex ? updatedTank : t);
        } else { // Create new tank
            const newTank: VesselTank = {
                id: Date.now() + Math.random(),
                externalId: tankId,
                tankName,
                maxCalibratedHeight: parseInt(maxHeight, 10) || 0,
                maxVolume: parseInt(maxVolume, 10) || 0,
                calibrationCurve: []
            };
            newTanks = [...vessel.tanks, newTank];
        }

        const updatedVessel = { ...vessel, tanks: newTanks };
        return currentVessels.map((v, i) => i === vesselIndex ? updatedVessel : v);
    };
    
    const processCalibracaoLine = (parts: string[], currentVessels: Vessel[]): Vessel[] => {
        const [, tankId, trimStr, heightStr, volumeStr] = parts;
        if (!tankId) throw new Error("Linha CALIBRACAO inválida.");

        let vesselIndex = -1;
        let tankIndex = -1;
        let targetVessel: Vessel | undefined;

        for(let i=0; i < currentVessels.length; i++){
            const tIndex = currentVessels[i].tanks.findIndex(t => t.externalId === tankId);
            if(tIndex > -1) {
                vesselIndex = i;
                tankIndex = tIndex;
                targetVessel = currentVessels[i];
                break;
            }
        }
        
        if (!targetVessel) throw new Error(`Tanque com ID ${tankId} não encontrado para calibração.`);
        
        const trim = parseInt(trimStr.replace('+', ''), 10);
        const height = parseFloat(heightStr);
        const volume = parseInt(volumeStr, 10);

        if (isNaN(trim) || isNaN(height) || isNaN(volume)) throw new Error(`Dados de calibração inválidos para o tanque ${tankId}`);
        
        const targetTank = targetVessel.tanks[tankIndex];
        const curve = targetTank.calibrationCurve;
        const pointIndex = curve.findIndex(p => p.trim === trim && p.height === height);

        let newCurve: CalibrationPoint[];
        if(pointIndex > -1) {
            const updatedPoint = { ...curve[pointIndex], volume };
            newCurve = curve.map((p, i) => i === pointIndex ? updatedPoint : p);
        } else {
            newCurve = [...curve, { trim, height, volume }];
        }

        const updatedTank = { ...targetTank, calibrationCurve: newCurve };
        const updatedTanks = targetVessel.tanks.map((t, i) => i === tankIndex ? updatedTank : t);
        const updatedVessel = { ...targetVessel, tanks: updatedTanks };
        
        return currentVessels.map((v, i) => i === vesselIndex ? updatedVessel : v);
    };

    const processMedicaoLinePass1 = (parts: string[], groupedMeasurements: Map<string, any>) => {
        const [, balsaId, tankId, dateTime, opType, trim, height, volume, product, origin, destination, operator] = parts;
        const groupKey = `${balsaId}|${dateTime}|${opType}|${operator}`;

        if (!groupedMeasurements.has(groupKey)) {
            groupedMeasurements.set(groupKey, {
                balsaId, dateTime, opType, product, operator, origin, destination,
                totalVolume: 0,
                measurements: []
            });
        }
        
        const group = groupedMeasurements.get(groupKey);
        group.totalVolume += parseInt(volume, 10) || 0;
        group.measurements.push({
            tankId,
            trim: parseInt(trim.replace('+', ''), 10),
            height: parseFloat(height),
            calculatedVolume: parseInt(volume, 10)
        });
    };

    const processMedicaoLinePass2 = (groupedMeasurements: Map<string, any>, vessels: Vessel[]): Record<number, MeasurementLog[]> => {
        const logsByVessel: Record<number, MeasurementLog[]> = {};
        for(const group of groupedMeasurements.values()) {
            const vessel = vessels.find(v => v.externalId === group.balsaId);
            if (!vessel) continue;
            
            const newLog: MeasurementLog = {
                id: new Date(group.dateTime.replace(' ', 'T')).getTime() + Math.random(),
                vesselId: vessel.id,
                dateTime: new Date(group.dateTime.replace(' ', 'T')).toISOString(),
                operationType: group.opType as MeasurementOperationType,
                product: group.product,
                operator: group.operator,
                origin: group.origin,
                destination: group.destination,
                totalVolume: group.totalVolume,
                measurements: group.measurements.map((m: any) => {
                    const tank = vessel.tanks.find(t => t.externalId === m.tankId);
                    return {
                        tankId: tank?.id || 0,
                        tankName: tank?.tankName || 'Desconhecido',
                        trim: m.trim,
                        height: m.height,
                        calculatedVolume: m.calculatedVolume
                    };
                })
            };
            
            if(!logsByVessel[vessel.id]) logsByVessel[vessel.id] = [];
            logsByVessel[vessel.id].push(newLog);
        }
        return logsByVessel;
    };
    // --- END IMPORT LOGIC ---

    const handleSelectVessel = (vessel: Vessel) => {
        if (vessel.type === 'balsa-tanque') {
            onEditVessel(vessel.id);
        } else {
            alert("Gerenciamento detalhado disponível apenas para Balsas-Tanque no momento.");
        }
    }
    
    return (
        <main className="max-w-8xl mx-auto p-4 md:p-8">
            <Card>
                <div className="flex flex-wrap gap-4 justify-between items-end mb-4 pb-4 border-b border-border">
                    <div>
                        <h2 className="text-lg font-semibold">Embarcações Cadastradas</h2>
                        <p className="text-sm text-muted-foreground">Gerencie suas embarcações e seus certificados de arqueação.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                            Importar TXT
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileImport} accept=".txt,text/plain" className="hidden" />
                        <Button onClick={() => onEditVessel('new')} icon={<PlusCircleIcon className="h-4 w-4"/>}>
                            Adicionar Balsa-Tanque
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="border-b-0">
                            <tr className="text-left text-muted-foreground">
                                <th className="p-3 font-medium">Nome</th>
                                <th className="p-3 font-medium">Tipo</th>
                                <th className="p-3 font-medium">Nº de Tanques</th>
                                <th className="p-3 font-medium">Status Certificado</th>
                                <th className="p-3 font-medium">Validade</th>
                                <th className="p-3 font-medium text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {vessels.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center p-16 text-muted-foreground">
                                        <ShipIcon className="mx-auto h-12 w-12 mb-4" />
                                        <h3 className="text-lg font-semibold text-foreground">Nenhuma embarcação cadastrada</h3>
                                        <p className="mt-1">Comece adicionando uma nova embarcação ou importando um arquivo TXT.</p>
                                    </td>
                                </tr>
                            ) : (
                                vessels.map(vessel => {
                                    const status = getCertificateStatus(vessel.expiryDate);
                                    return (
                                    <tr key={vessel.id} className="border-b last:border-0 hover:bg-secondary/50 cursor-pointer" onClick={() => handleSelectVessel(vessel)}>
                                        <td className="p-3 font-medium">{vessel.name}</td>
                                        <td className="p-3 capitalize">{vessel.type.replace('-', ' ')}</td>
                                        <td className="p-3">{vessel.tanks.length}</td>
                                        <td className={`p-3 ${status.color}`}>{status.text}</td>
                                        <td className="p-3">{vessel.expiryDate ? new Date(vessel.expiryDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</td>
                                        <td className="p-3 text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={(e) => handleDeleteClick(e, vessel)}
                                                title="Remover"
                                            >
                                                <Trash2Icon className="h-4 w-4 text-destructive/80" />
                                            </Button>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ConfirmationModal
                isOpen={!!vesselToDelete}
                onClose={() => setVesselToDelete(null)}
                onConfirm={confirmDeleteVessel}
                title="Confirmar Exclusão de Embarcação"
            >
                <p>Você está prestes a excluir permanentemente a embarcação <strong className="text-foreground">{vesselToDelete?.name}</strong>.</p>
                <p className="font-bold text-destructive">Esta ação é irreversível e removerá todos os dados de tanques e calibração associados.</p>
                <p>Tem certeza que deseja continuar?</p>
            </ConfirmationModal>
        </main>
    );
};