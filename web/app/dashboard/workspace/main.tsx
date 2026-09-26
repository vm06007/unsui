import { WalletProviders } from './auth';
import { DemoLogin } from './login';

export function OperationsWorkspace() {
    return (
        <WalletProviders>
            <DemoLogin />
        </WalletProviders>
    );
}
