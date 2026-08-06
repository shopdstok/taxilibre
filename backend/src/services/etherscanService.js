require('dotenv').config({ override: false });

const ethPriceUsd = parseFloat(process.env.ETH_PRICE_USD || '2000');

const etherscan = {
  getGasPrice: async () => {
    // Return a dummy gas price of 20 gwei (in wei: 20 * 1e9)
    return (20 * 1e9).toString();
  },
  utils: {
    formatUnits: (value, unit) => {
      if (unit === 'gwei') {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return (num / 1e9).toString();
      }
      return value.toString();
    }
  }
};

module.exports = { etherscan, ethPriceUsd };
