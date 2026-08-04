const i18n = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  currentLocale: 'fr',
  resources: {
    fr: {
      translation: {
        hello: 'Bonjour',
        welcome: 'Bienvenue sur TaxiLibre'
      }
    },
    en: {
      translation: {
        hello: 'Hello',
        welcome: 'Welcome to TaxiLibre'
      }
    }
  },
  t: function(key) {
    const keys = key.split('.');
    let result = this.resources[this.currentLocale]?.translation;
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        result = this.resources[this.defaultLocale]?.translation;
        for (const k of keys) {
          if (result && result[k] !== undefined) {
            result = result[k];
          } else {
            return key;
          }
        }
        break;
      }
    }
    return result;
  },
  setLocale: function(locale) {
    if (this.locales.includes(locale)) {
      this.currentLocale = locale;
      return true;
    }
    return false;
  },
  getLocale: function() {
    return this.currentLocale;
  }
};

module.exports = i18n;
