import { createRoot } from 'react-dom/client';
import './styles.css';
import { WalletProviders } from './auth';
import { DemoLogin } from './login';

const hot = (import.meta as any).hot;
const root = hot?.data.root || createRoot(document.getElementById('root')!);
if (hot) hot.data.root = root;
root.render(
    <WalletProviders>
        <DemoLogin />
    </WalletProviders>,
);
