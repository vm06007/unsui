import { objectLink, pkg } from './devnet-records';

export function SourcesSection() {
    return (
        <section className="arch-sources">
            <h3>Primary sources & implementation notes</h3>
            <p>
                Payment details below are provider documentation. The architecture,
                buffer model and future controls on this page are UnSui’s proposal.
            </p>
            <div>
                <a
                    href="https://developer.sbpayment.jp/system-specifications/link-type/2517/"
                    target="_blank"
                    rel="noreferrer"
                >
                    SBPS · merchant and service identifiers ↗
                </a>
                <a
                    href="https://support.sbpayment.jp/first-guide/5031/"
                    target="_blank"
                    rel="noreferrer"
                >
                    SBPS · settlement and deposit schedules ↗
                </a>
                <a
                    href="https://support.sbpayment.jp/manuals/129/130-129/7104/"
                    target="_blank"
                    rel="noreferrer"
                >
                    SBPS · transaction and tracking records ↗
                </a>
                <a
                    href="https://developer.sbpayment.jp/billing-method/6745/"
                    target="_blank"
                    rel="noreferrer"
                >
                    SBPS · payment, capture and refund functions ↗
                </a>
                <a
                    href="https://www.paycas.jp/faq/store/services/supported-payments"
                    target="_blank"
                    rel="noreferrer"
                >
                    PayCAS · supported payment brands ↗
                </a>
                <a href={objectLink(pkg)} target="_blank" rel="noreferrer">
                    UnSui · deployed Move package on devnet ↗
                </a>
            </div>
        </section>
    );
}
