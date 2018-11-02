const castToString = (value) => {
  if (typeof value === 'string') {
    return value;
  } else if (typeof value === 'object') {
    return Object.keys(value).reduce((res, key) => `${res} ${key}: ${value[key]}`, '');
  }
  return `${value}`;
};

module.exports = castToString;
