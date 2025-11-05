import React, { useState, useMemo, useRef } from 'react';
import { Theme, View } from '../../types';
import { ThemeToggle } from './ThemeToggle';
import { GlobeIcon, DatabaseIcon, BarChart3Icon, ClipboardPasteIcon, BellIcon, UserIcon, Settings2Icon, PencilIcon, GripVerticalIcon, LogOutIcon } from '../ui/icons';

const ALL_NAV_ITEMS: { view: View; label: string; icon: React.ReactElement }[] = [
    { view: 'planningHub', label: 'Planejamento', icon: <GlobeIcon /> },
    { view: 'operationsHub', label: 'Operações', icon: <ClipboardPasteIcon /> },
    { view: 'registrationHub', label: 'Cadastros', icon: <DatabaseIcon /> },
    { view: 'dashboard', label: 'Dashboard', icon: <BarChart3Icon /> },
];

interface HeaderProps {
    onHome: () => void;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    setView: (view: View) => void;
    activeView: View;
    navOrder: View[];
    setNavOrder: (order: View[]) => void;
    onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onHome, theme, setTheme, setView, activeView, navOrder, setNavOrder, onLogout }) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const dragItem = useRef<View | null>(null);
    const dragOverItem = useRef<View | null>(null);

    const orderedNavItems = useMemo(() => {
        return navOrder
            .map(view => ALL_NAV_ITEMS.find(item => item.view === view))
            .filter((item): item is NonNullable<typeof item> => !!item);
    }, [navOrder]);

    const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, view: View) => {
        dragItem.current = view;
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>, view: View) => {
        dragOverItem.current = view;
    };
    
    const handleDrop = () => {
        if (dragItem.current && dragOverItem.current) {
            const newNavOrder = [...navOrder];
            const dragItemIndex = newNavOrder.indexOf(dragItem.current);
            const dragOverItemIndex = newNavOrder.indexOf(dragOverItem.current);

            if (dragItemIndex === -1 || dragOverItemIndex === -1) return;

            const [reorderedItem] = newNavOrder.splice(dragItemIndex, 1);
            newNavOrder.splice(dragOverItemIndex, 0, reorderedItem);
            
            setNavOrder(newNavOrder);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };

    return (
        <aside className="fixed top-0 left-0 h-full w-20 bg-card border-r border-border flex flex-col items-center py-4 z-50">
            <div className="p-3 mb-4 rounded-lg bg-primary text-primary-foreground text-xl font-bold">
                M
            </div>

            <nav className="flex flex-col items-center gap-2">
                {orderedNavItems.map(item => (
                    <button 
                        key={item.view}
                        draggable={isEditMode}
                        onDragStart={isEditMode ? (e) => handleDragStart(e, item.view) : undefined}
                        onDragEnter={isEditMode ? (e) => handleDragEnter(e, item.view) : undefined}
                        onDragEnd={isEditMode ? handleDrop : undefined}
                        onDragOver={isEditMode ? (e) => e.preventDefault() : undefined}
                        onClick={() => {
                            if (isEditMode) return;
                            if (item.view === 'planningHub') {
                                onHome();
                            } else {
                                setView(item.view);
                            }
                        }}
                        title={item.label}
                        className={`
                            p-3 rounded-lg transition-all duration-200 w-14 h-12 flex items-center justify-center relative
                            ${activeView === item.view 
                                ? 'bg-primary text-primary-foreground shadow-lg' 
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
                            ${isEditMode ? 'cursor-move' : 'cursor-pointer'}
                        `}
                    >
                        {isEditMode && <GripVerticalIcon className="absolute left-0.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50"/>}
                        {React.cloneElement(item.icon as React.ReactElement<{ className?: string }>, { className: 'h-6 w-6' })}
                    </button>
                ))}
            </nav>

            <div className="mt-auto flex flex-col items-center gap-2">
                 <button 
                    onClick={() => setIsEditMode(!isEditMode)}
                    title={isEditMode ? "Sair do modo de edição" : "Personalizar layout"} 
                    className={`
                        p-3 rounded-lg transition-all duration-200
                        ${isEditMode 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
                    `}
                >
                    <PencilIcon className="h-5 w-5" />
                </button>
                 <button title="Notificações" className="p-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <BellIcon className="h-5 w-5" />
                </button>
                 <button title="Perfil" className="p-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <UserIcon className="h-5 w-5" />
                </button>
                 <button 
                    onClick={() => setView('settings')}
                    title="Configurações" 
                    className={`
                        p-3 rounded-lg transition-all duration-200
                        ${activeView === 'settings' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
                    `}
                >
                    <Settings2Icon className="h-5 w-5" />
                </button>
                 <button 
                    onClick={onLogout}
                    title="Sair / Bloquear" 
                    className="p-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                    <LogOutIcon className="h-5 w-5" />
                </button>
                <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
        </aside>
    );
};