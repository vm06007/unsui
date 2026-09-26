'use client';

import { useLayoutEffect } from 'react';
import './workspace/styles.css';
import { OperationsWorkspace } from './workspace/main';

const themeBoot =
    "(function(){try{var t=localStorage.getItem('unsui-ops-theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})();";

export default function DashboardPage() {
    useLayoutEffect(() => {
        const root = document.documentElement;
        root.dataset.theme =
            localStorage.getItem('unsui-ops-theme') === 'dark' ? 'dark' : 'light';
        return () => {
            const site = localStorage.getItem('unsui-theme');
            root.dataset.theme = site === 'dark' || site === 'light' ? site : 'light';
        };
    }, []);

    return (
        <div className="ops">
            <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
            <OperationsWorkspace />
        </div>
    );
}
