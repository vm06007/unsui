export function Badge({ value }: { value: string }) {
    return (
        <span className={'badge ' + value}>
            {value === 'in-app'
                ? 'In-App'
                : value === 'sandbox'
                  ? 'Sandbox'
                  : value === 'unmatched'
                    ? 'Awaiting merchant'
                    : value === 'pending'
                      ? 'Awaiting payout'
                      : value.replaceAll('-', ' ')}
        </span>
    );
}
