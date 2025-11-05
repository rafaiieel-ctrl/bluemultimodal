import React, { useState, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { DownloadCloudIcon, UploadCloudIcon, AlertTriangleIcon } from '../components/ui/icons';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';

interface SettingsScreenProps {
    onReset: () => void;
    onBackup: () => void;
    onRestore: (file: File) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onReset, onBackup, onRestore }) => {
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    const handleRestoreClick = () => {
        restoreInputRef.current?.click();
    };

    const handleFileRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onRestore(file);
        }
        // Reset input to allow selecting the same file again
        if(event.target) {
            event.target.value = '';
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
                <p className="text-muted-foreground">Gerencie backups, notificações e dados do sistema.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Unidades de Medida</h3>
                    <div className="space-y-4">
                        <Select label="Unidade de Volume" defaultValue="L">
                            <option value="L">Litros (L)</option>
                            <option value="m3" disabled>Metros Cúbicos (m³)</option>
                        </Select>
                         <Select label="Unidade de Massa" defaultValue="Kg">
                            <option value="Kg">Quilogramas (Kg)</option>
                            <option value="Ton" disabled>Toneladas (Ton)</option>
                        </Select>
                        <p className="text-xs text-muted-foreground pt-2">
                            As unidades selecionadas serão usadas para adição em toda a aplicação. Os dados são sempre armazenados em Litros e Quilogramas.
                        </p>
                    </div>
                </Card>
                 <Card className="lg:col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Configurações de Notificação</h3>
                    <div className="space-y-4">
                        <Input label="Email para notificações" type="email" defaultValue="user@getmultimodal.com" />
                         <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-2">Receber alertas sobre:</label>
                             <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-input text-primary focus:ring-ring"/>
                                    <span className="text-sm">Conclusão de operações</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-input text-primary focus:ring-ring"/>
                                    <span className="text-sm">Atrasos de embarcações</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-input text-primary focus:ring-ring"/>
                                    <span className="text-sm">Vencimento de certificados</span>
                                </label>
                             </div>
                        </div>
                    </div>
                </Card>
                 <Card className="lg:col-span-1">
                    <h3 className="text-lg font-semibold mb-4">Backup e Restauração</h3>
                     <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            Crie um backup de segurança de todos os seus dados ou restaure o sistema a partir de um arquivo de backup anterior.
                        </p>
                         <div className="flex items-center gap-2 pt-2">
                            <Button variant="secondary" className="w-full" icon={<DownloadCloudIcon className="h-4 w-4"/>} onClick={onBackup}>
                                Criar Backup
                            </Button>
                            <Button variant="secondary" className="w-full" icon={<UploadCloudIcon className="h-4 w-4"/>} onClick={handleRestoreClick}>
                                Restaurar
                            </Button>
                            <input 
                                type="file"
                                ref={restoreInputRef}
                                className="hidden"
                                accept=".json,application/json"
                                onChange={handleFileRestore}
                            />
                         </div>
                    </div>
                </Card>
            </div>
            
            <Card className="border-2 border-destructive/50 bg-danger-100/20 dark:bg-destructive/10">
                <h3 className="text-lg font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangleIcon className="h-5 w-5"/>
                    Zona de Perigo
                </h3>
                <p className="text-destructive/80 mt-2 mb-4 text-sm">
                    A ação abaixo é irreversível. Ela apagará todos os cadastros, programações e operações, retornando o sistema ao seu estado inicial.
                </p>
                <Button variant="destructive" onClick={() => setIsConfirmModalOpen(true)}>
                    Limpar Dados e Reiniciar
                </Button>
            </Card>

            <ConfirmationModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={onReset}
                title="Confirmar Limpeza Total dos Dados"
                variant="destructive"
                confirmText="Sim, apagar tudo"
            >
                <p>Você está prestes a <strong className="text-foreground">apagar permanentemente</strong> todos os dados da aplicação, incluindo:</p>
                <ul className="list-disc pl-5 my-2 text-sm">
                    <li>Todas as operações</li>
                    <li>Todas as programações</li>
                    <li>Todos os cadastros (embarcações, vagões, locais)</li>
                </ul>
                <p className="font-bold">Esta ação não pode ser desfeita.</p>
            </ConfirmationModal>
        </div>
    );
};