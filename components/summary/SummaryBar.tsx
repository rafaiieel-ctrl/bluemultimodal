
import React, { useMemo } from 'react';
import { Tank } from '../../types';
import { Card } from '../ui/Card';
import { numberToBr } from '../../utils/helpers';

interface SummaryBarProps {
    tanks: Tank[];
}

const SummaryItem: React.FC<{ label: string, value: string, unit: string }> = ({ label, value, unit }) => (
    <div className="flex justify-between items-baseline border-b border-border/50 pb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold font-mono">{value} <span className="text-sm font-normal text-muted-foreground">{unit}</span></p>
    </div>
);

export const SummaryBar: React.FC<SummaryBarProps> = ({ tanks }) => {
    const summary = useMemo(() => {
        const totalV20 = tanks.reduce((sum, t) => sum + (isFinite(t.results.v20) ? t.results.v20 : 0), 0);
        
        const validInpmTanks = tanks.filter(t => isFinite(t.results.inpm));
        const avgInpm = validInpmTanks.length > 0 
            ? validInpmTanks.reduce((sum, t) => sum + t.results.inpm, 0) / validInpmTanks.length
            : NaN;
            
        const validR20Tanks = tanks.filter(t => isFinite(t.results.r20));
        const avgR20 = validR20Tanks.length > 0
            ? validR20Tanks.reduce((sum, t) => sum + t.results.r20, 0) / validR20Tanks.length
            : NaN;

        return { totalV20, avgInpm, avgR20 };
    }, [tanks]);

    return (
        <Card>
            <h2 className="text-lg font-semibold mb-4 text-foreground">Resumo da Operação</h2>
            <div className="space-y-3">
                <SummaryItem label="Tanques" value={tanks.length.toString()} unit="unidades" />
                <SummaryItem label="V@20 Total" value={numberToBr(summary.totalV20, 3)} unit="L" />
                <SummaryItem label="INPM Médio" value={numberToBr(summary.avgInpm, 2)} unit="%" />
                <SummaryItem label="ρ@20 Médio" value={numberToBr(summary.avgR20, 2)} unit="kg/m³" />
            </div>
        </Card>
    );
};
