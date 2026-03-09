"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidChecksumError = exports.InvalidLengthError = exports.InvalidVersionError = exports.InvalidPrefixError = void 0;
exports.format = format;
exports.parse = parse;
exports.validate = validate;
const Address = require("../core/Address.js");
const Bech32m = require("../core/Bech32m.js");
const Bytes = require("../core/Bytes.js");
const CompactSize = require("../core/CompactSize.js");
const Errors = require("../core/Errors.js");
const Hex = require("../core/Hex.js");
function format(address, options = {}) {
    const { zoneId } = options;
    const hrp = zoneId != null ? 'tempoz' : 'tempo';
    const version = new Uint8Array([0x00]);
    const zone = zoneId != null ? CompactSize.toBytes(zoneId) : new Uint8Array();
    const data = Bytes.concat(version, zone, Bytes.fromHex(address));
    return Bech32m.encode(hrp, data);
}
function parse(tempoAddress) {
    let hrp;
    let data;
    try {
        const decoded = Bech32m.decode(tempoAddress);
        hrp = decoded.hrp;
        data = decoded.data;
    }
    catch {
        throw new InvalidChecksumError({ address: tempoAddress });
    }
    if (hrp !== 'tempo' && hrp !== 'tempoz')
        throw new InvalidPrefixError({ address: tempoAddress });
    if (data.length < 1 || data[0] !== 0x00)
        throw new InvalidVersionError({
            address: tempoAddress,
            version: data.length > 0 ? data[0] : undefined,
        });
    const payload = data.slice(1);
    let zoneId;
    let rawAddress;
    if (hrp === 'tempoz') {
        const { value, size } = CompactSize.fromBytes(payload);
        zoneId = value;
        rawAddress = payload.slice(size);
    }
    else {
        zoneId = undefined;
        rawAddress = payload;
    }
    if (rawAddress.length !== 20)
        throw new InvalidLengthError({
            address: tempoAddress,
            expected: 20,
            actual: rawAddress.length,
        });
    const address = Address.checksum(Hex.fromBytes(rawAddress));
    return { address, zoneId };
}
function validate(tempoAddress) {
    try {
        parse(tempoAddress);
        return true;
    }
    catch {
        return false;
    }
}
class InvalidPrefixError extends Errors.BaseError {
    constructor({ address }) {
        super(`Tempo address "${address}" has an invalid prefix. Expected "tempo1" or "tempoz1".`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'TempoAddress.InvalidPrefixError'
        });
    }
}
exports.InvalidPrefixError = InvalidPrefixError;
class InvalidVersionError extends Errors.BaseError {
    constructor({ address, version, }) {
        super(`Tempo address "${address}" has unsupported version ${version === undefined ? '(missing)' : `0x${version.toString(16).padStart(2, '0')}`}. Only version 0x00 is supported.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'TempoAddress.InvalidVersionError'
        });
    }
}
exports.InvalidVersionError = InvalidVersionError;
class InvalidLengthError extends Errors.BaseError {
    constructor({ address, expected, actual, }) {
        super(`Tempo address "${address}" has an invalid payload length. Expected ${expected} bytes, got ${actual}.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'TempoAddress.InvalidLengthError'
        });
    }
}
exports.InvalidLengthError = InvalidLengthError;
class InvalidChecksumError extends Errors.BaseError {
    constructor({ address }) {
        super(`Tempo address "${address}" has an invalid checksum.`);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'TempoAddress.InvalidChecksumError'
        });
    }
}
exports.InvalidChecksumError = InvalidChecksumError;
//# sourceMappingURL=TempoAddress.js.map