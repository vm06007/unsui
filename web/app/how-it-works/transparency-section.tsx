import { ArrowRight, Database } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { ClaimTree } from './money-cycle';

const records = [
    [
        'SUI pool, transfers and immutable receipts',
        'Sui · publicly inspectable',
        'Crypto funds and the recorded payout history; not the merchant’s bank balance.',
    ],
    [
        'Card commitment and refund sequence',
        'Sui · publicly inspectable',
        'Pseudonymous continuity within the ledger. It does not prove card ownership or a card debit.',
    ],
    [
        'Payment status and processor reference',
        'Proposed merchant backend',
        'Verified purchase entitlement, based on authenticated processor data.',
    ],
    [
        'Yen settlement and conversion execution',
        'Proposed bank / provider reconciliation',
        'What arrived, fees and reversals, and how much crypto was acquired.',
    ],
    [
        'Raw NFC ID and travel history',
        'Off-chain',
        'Not published in the contract; keyed commitments are pseudonyms, not guaranteed anonymity.',
    ],
];

export function TransparencySection() {
    return (
        <section className="arch-section" id="transparency">
            <div className="arch-section-heading">
                <span className="arch-kicker">
                    05 / TRANSPARENCY WITH A CLEAR BOUNDARY
                </span>
                <h2>
                    Show what can be proven.
                    <br />
                    Name what still needs trust.
                </h2>
                <p>
                    The contract makes crypto state inspectable. Reconciliation joins
                    it to off-chain payment and bank records. Neither a hash nor a
                    Merkle tree turns an unverified yen claim into verified cash.
                </p>
            </div>
            <div className="proof-diagrams">
                <article>
                    <h3>The receipt chain</h3>
                    <div className="receipt-chain">
                        <div>
                            Receipt #1<small>Hash A</small>
                        </div>
                        <ArrowRight />
                        <div>
                            Receipt #2<small>Includes Hash A</small>
                        </div>
                        <ArrowRight />
                        <div>
                            Receipt #3<small>Includes Hash B</small>
                        </div>
                    </div>
                    <p>
                        Each receipt commits to the previous receipt’s ID and hash, the
                        current claim, sequence and timestamp. The shared ledger stores
                        the latest head.
                    </p>
                </article>
                <article>
                    <h3>The claim commitment</h3>
                    <ClaimTree />
                    <p>
                        These are the deployed Move contract’s four leaves. The receipt
                        hash covers the full BCS-encoded receipt. The website’s local
                        demo uses a separate illustrative format.
                    </p>
                </article>
            </div>
            <div className="transparency-table">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Record</TableHead>
                            <TableHead>Where it lives</TableHead>
                            <TableHead>What it establishes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.map((row) => (
                            <TableRow key={row[0]}>
                                {row.map((cell) => (
                                    <TableCell key={cell}>{cell}</TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="reconcile-strip">
                <Database />
                <div>
                    <h3>
                        The contract replaces the payout ledger—not every business
                        record.
                    </h3>
                    <p>
                        SBPS payment references, reconciliation, conversion orders and
                        exception handling still need durable off-chain records. A
                        future audit report could commit reconciliation batches
                        on-chain, but the current prototype does not attest to fiat
                        reserves.
                    </p>
                </div>
            </div>
        </section>
    );
}
