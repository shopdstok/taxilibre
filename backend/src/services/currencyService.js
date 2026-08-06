const axios = require('axios')

class CurrencyService {
  constructor () {
    this.baseCurrency = 'EUR'
    this.rates = {}
    this.lastUpdate = null
  }

  async fetchRates () {
    try {
      // Using a free exchange rate API (in production, you'd use a reliable paid service)
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/' + this.baseCurrency)
      this.rates = response.data.rates
      this.lastUpdate = new Date()
      return this.rates
    } catch (error) {
      console.error('Error fetching exchange rates:', error)
      // Return last known rates if available
      return this.rates
    }
  }

  convert (amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return amount

    const fromRate = this.rates[fromCurrency]
    const toRate = this.rates[toCurrency]

    if (!fromRate || !toRate) {
      throw new Error('Currency not supported: ' + fromCurrency + ' or ' + toCurrency)
    }

    return (amount / fromRate) * toRate
  }

  getSupportedCurrencies () {
    return Object.keys(this.rates).filter(c => c !== this.baseCurrency)
  }
}

module.exports = new CurrencyService()
