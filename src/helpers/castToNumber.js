/**
 * Cast any value to number
 * @example castToNumber('123') = 123;
 * @example castToNumber(true) = 1;
 * @example castToNumber('abc') = NaN;
 * @param value
 * @returns {number}
 */
const castToNumber = value => !isNaN(Number(value)) ? value / 1 : 0
module.exports = castToNumber;
