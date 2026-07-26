const { createClient } = require('redis')
const { logger } = require('../services/loggingService')

let client = null
let isConnected = false


const isRedisEnabled = () => {
  return process.env.REDIS_ENABLED !== 'false'
}


const getRedisConfig = () => ({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB, 10) || 0
})


const createMockClient = () => {

  const store = new Map()
  const geoStore = new Map()
  let listeners = {}

  return {

    get: async (key) => {
      const entry = store.get(key)

      if (!entry) return null

      if (entry.expires && Date.now() > entry.expires) {
        store.delete(key)
        return null
      }

      return entry.value
    },


    setex: async (key, ttl, value) => {
      store.set(key,{
        value,
        expires: Date.now() + ttl * 1000
      })

      return 'OK'
    },


    del: async (key) => {
      store.delete(key)
      geoStore.delete(key)
      return 1
    },


    incr: async (key) => {

      const value = parseInt(store.get(key)?.value || 0)

      const next = value + 1

      store.set(key,{
        value:String(next),
        expires:null
      })

      return next
    },


    geoAdd: async () => 1,


    georadius: async () => [],


    duplicate(){
      return createMockClient()
    },


    connect: async()=>{},


    disconnect: async()=>{},


    on: (event, listener) => {
      if (!listeners[event]) {
        listeners[event] = []
      }
      listeners[event].push(listener)
    },


    isOpen:false
  }
}



const initRedis = async()=>{


  if(!isRedisEnabled()){

    logger.warn(
      'Redis disabled by REDIS_ENABLED=false — using mock client'
    )

    client = createMockClient()
    return client
  }


  if(client) return client


  const config = getRedisConfig()


  client=createClient({
    socket:config.socket,
    password:config.password,
    database:config.database
  })


  client.on(
    'error',
    err=>{
      logger.error(
        'Redis error:',
        err.message
      )

      isConnected=false
    }
  )


  client.on(
    'connect',
    ()=>{
      logger.info('Redis connected')
      isConnected=true
    }
  )


  try{

    await client.connect()

    return client

  }catch(error){

    logger.warn(
      'Redis unavailable — fallback mock enabled'
    )

    client=createMockClient()

    return client
  }



}


const getClient=()=>{

  if(client)
    return client


  logger.warn(
    'Redis not initialized — using mock'
  )

  return createMockClient()

}



module.exports={
  initRedis,
  getClient,
  client:null,
  Redis:null
}
