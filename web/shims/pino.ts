type Logger = {
    level: string;
    info: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    debug: (...args: unknown[]) => void;
    trace: (...args: unknown[]) => void;
    fatal: (...args: unknown[]) => void;
    child: () => Logger;
};

export const levels = {
    labels: {
        10: 'trace',
        20: 'debug',
        30: 'info',
        40: 'warn',
        50: 'error',
        60: 'fatal',
    },
    values: {
        trace: 10,
        debug: 20,
        info: 30,
        warn: 40,
        error: 50,
        fatal: 60,
    },
};

function pino(): Logger {
    const logger: Logger = {
        level: 'silent',
        info() {},
        error() {},
        warn() {},
        debug() {},
        trace() {},
        fatal() {},
        child() {
            return logger;
        },
        levels,
    };
    return logger;
}

export default pino;
export { pino };
