import type { MultiBaasData } from './multibaas';

export type Row = {
    id: string;
    source: string;
    date: string;
    jpy: number;
    merchantJpy: number | null;
    merchantRef: string | null;
    settlement: string;
    payout: string;
    asset: string;
    crypto: number;
    recipient: string | null;
    digest: string | null;
    receipt: string | null;
    network: string;
    feeJpy: number;
};
export type Feed = {
    records: Row[];
    multibaas?: MultiBaasData | null;
    treasury: null | {
        asset: string;
        balance: number;
        network: string;
        observedAt: number;
    };
};
