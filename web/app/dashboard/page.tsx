'use client';

import { useEffect } from 'react';
import './workspace/styles.css';
import { OperationsWorkspace } from './workspace/main';

export default function DashboardPage() {
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.dataset.theme;
        return () => {
            const site = localStorage.getItem('unsui-theme');
            root.dataset.theme =
                site === 'dark' || site === 'light' ? site : previous || 'light';
        };
    }, []);

    return (
        <div className="ops">
            <OperationsWorkspace />
        </div>
    );
}
