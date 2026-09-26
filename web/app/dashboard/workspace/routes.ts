import {
    ArrowLeftRight,
    ArrowUpRight,
    Layers,
    LayoutDashboard,
    Plug,
    Wallet,
} from 'lucide-react';

export const routes = [
    ['overview', 'Overview', LayoutDashboard],
    ['orders', 'Orders', Layers],
    ['payouts', 'Crypto payouts', ArrowUpRight],
    ['reconciliation', 'Reconciliation', ArrowLeftRight],
    ['treasury', 'Treasury & forecast', Wallet],
    ['connections', 'Connections', Plug],
] as const;
