import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import type { Metadata } from 'next';
import { ArchitectureHero } from './architecture-hero';
import { BufferSection } from './buffer-section';
import { ContractSection } from './contract-section';
import { MerchantSection } from './merchant-section';
import { MoneyFlow } from './money-flow';
import { ReadinessSection } from './readiness-section';
import { SourcesSection } from './sources-section';
import { TransparencySection } from './transparency-section';

export const metadata: Metadata = {
    title: 'How UnSui works — Payments, liquidity & proof',
    description:
        'Explore the proposed SB Payment yen settlement flow, prefunded Sui payouts, treasury buffer, replay protection and transparent receipts.',
};

export default function HowItWorks() {
    return (
        <>
            <SiteHeader />
            <main className="architecture">
                <ArchitectureHero />
                <MoneyFlow />
                <MerchantSection />
                <BufferSection />
                <ContractSection />
                <TransparencySection />
                <ReadinessSection />
                <SourcesSection />
            </main>
            <SiteFooter />
        </>
    );
}
