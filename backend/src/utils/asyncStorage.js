const { AsyncLocalStorage } = require('async_hooks')

const asyncLocalStorage = new AsyncLocalStorage()

/**
 * Exécute une fonction avec un magasin donné
 * @param {Object} store - Le magasin à définir
 * @param {Function} fn - La fonction à exécuter
 * @returns {Promise<any>|any} Le résultat de la fonction
 */
const run = (store, fn) => {
  return asyncLocalStorage.run(store, () => {
    return fn()
  })
}

/**
 * Obtient le magasin actuel
 * @returns {Object|null} Le magasin actuel ou undefined
 */
const getStore = () => {
  return asyncLocalStorage.getStore()
}

/**
 * Lie une fonction au magasin actuel
 * @param {Function} fn - La fonction à lier
 * @returns {Function} La fonction liée
 */
const bind = (fn) => {
  return asyncLocalStorage.bind(fn)
}

module.exports = { run, getStore, bind }
