import * as Address from '../core/Address.js';
import * as Errors from '../core/Errors.js';
/** Root type for a Tempo Address. */
export type TempoAddress = `tempo1${string}` | `tempoz1${string}`;
/**
 * Formats a raw Ethereum address (and optional zone ID) into a Tempo address string.
 *
 * @example
 * ```ts twoslash
 * import { TempoAddress } from 'ox/tempo'
 *
 * const address = TempoAddress.format('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28')
 * // @log: 'tempo1qp6z6dwvvc6vq5efyk3ms39une6etu4a9qtj2kk0'
 * ```
 *
 * @example
 * ### Zone Address
 * ```ts twoslash
 * import { TempoAddress } from 'ox/tempo'
 *
 * const address = TempoAddress.format(
 *   '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD28',
 *   { zoneId: 1 },
 * )
 * // @log: 'tempoz1qqqhgtf4e3nrfszn9yj68wzyhj08t90jh55q74d9uj'
 * ```
 *
 * @param address - The raw 20-byte Ethereum address.
 * @param options - Options.
 * @returns The encoded Tempo address string.
 */
export declare function format(address: Address.Address, options?: format.Options): TempoAddress;
export declare namespace format {
    type Options = {
        /** Zone ID for zone addresses. */
        zoneId?: number | bigint | undefined;
    };
    type ErrorType = Errors.GlobalErrorType;
}
/**
 * Parses a Tempo address string into a raw Ethereum address and optional zone ID.
 *
 * @example
 * ### Mainnet Address
 * ```ts twoslash
 * import { TempoAddress } from 'ox/tempo'
 *
 * const result = TempoAddress.parse(
 *   'tempo1qp6z6dwvvc6vq5efyk3ms39une6etu4a9qtj2kk0',
 * )
 * // @log: { address: '0x742d35CC6634c0532925a3B844bc9e7595F2Bd28', zoneId: undefined }
 * ```
 *
 * @example
 * ### Zone Address
 * ```ts twoslash
 * import { TempoAddress } from 'ox/tempo'
 *
 * const result = TempoAddress.parse(
 *   'tempoz1qqqhgtf4e3nrfszn9yj68wzyhj08t90jh55q74d9uj',
 * )
 * // @log: { address: '0x742d35CC6634c0532925a3B844bc9e7595F2Bd28', zoneId: 1 }
 * ```
 *
 * @param tempoAddress - The Tempo address string to parse.
 * @returns The parsed raw address and optional zone ID.
 */
export declare function parse(tempoAddress: string): parse.ReturnType;
export declare namespace parse {
    type ReturnType = {
        /** The raw 20-byte Ethereum address. */
        address: Address.Address;
        /** The zone ID, or `undefined` for mainnet addresses. */
        zoneId: number | bigint | undefined;
    };
    type ErrorType = InvalidPrefixError | InvalidVersionError | InvalidLengthError | InvalidChecksumError | Errors.GlobalErrorType;
}
/**
 * Validates a Tempo address string.
 *
 * @example
 * ```ts twoslash
 * import { TempoAddress } from 'ox/tempo'
 *
 * const valid = TempoAddress.validate(
 *   'tempo1qp6z6dwvvc6vq5efyk3ms39une6etu4a9qtj2kk0',
 * )
 * // @log: true
 * ```
 *
 * @param tempoAddress - The Tempo address string to validate.
 * @returns Whether the address is valid.
 */
export declare function validate(tempoAddress: string): boolean;
/** Thrown when a Tempo address has an invalid prefix. */
export declare class InvalidPrefixError extends Errors.BaseError {
    readonly name = "TempoAddress.InvalidPrefixError";
    constructor({ address }: {
        address: string;
    });
}
/** Thrown when a Tempo address has an unsupported version byte. */
export declare class InvalidVersionError extends Errors.BaseError {
    readonly name = "TempoAddress.InvalidVersionError";
    constructor({ address, version, }: {
        address: string;
        version: number | undefined;
    });
}
/** Thrown when a Tempo address has an invalid payload length. */
export declare class InvalidLengthError extends Errors.BaseError {
    readonly name = "TempoAddress.InvalidLengthError";
    constructor({ address, expected, actual, }: {
        address: string;
        expected: number;
        actual: number;
    });
}
/** Thrown when a Tempo address has an invalid checksum. */
export declare class InvalidChecksumError extends Errors.BaseError {
    readonly name = "TempoAddress.InvalidChecksumError";
    constructor({ address }: {
        address: string;
    });
}
//# sourceMappingURL=TempoAddress.d.ts.map