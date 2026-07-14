const axios = require('axios')
const crypto = require('crypto')
const { User } = require('../models')

/**
 * OAuth2 Service for Google, Apple, Facebook, Microsoft
 */
class OAuth2Service {
  constructor () {
    this.providers = {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: ['openid', 'profile', 'email']
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID,
        teamId: process.env.APPLE_TEAM_ID,
        keyId: process.env.APPLE_KEY_ID,
        privateKey: process.env.APPLE_PRIVATE_KEY,
        redirectUri: process.env.APPLE_REDIRECT_URI || 'http://localhost:3000/auth/apple/callback',
        authUrl: 'https://appleid.apple.com/auth/authorize',
        tokenUrl: 'https://appleid.apple.com/auth/token',
        scopes: ['name', 'email']
      },
      facebook: {
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/auth/facebook/callback',
        authUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
        userInfoUrl: 'https://graph.facebook.com/v18.0/me',
        scopes: ['email', 'public_profile']
      },
      microsoft: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/microsoft/callback',
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scopes: ['openid', 'profile', 'email']
      }
    }
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl (provider, state = null) {
    const config = this.providers[provider]
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`)
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state: state || crypto.randomBytes(16).toString('hex')
    })

    return `${config.authUrl}?${params.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken (provider, code) {
    const config = this.providers[provider]
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`)
    }

    try {
      const response = await axios.post(config.tokenUrl, {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code'
      })

      return response.data
    } catch (error) {
      throw new Error(`Failed to exchange code for token: ${error.message}`)
    }
  }

  /**
   * Get user info from OAuth provider
   */
  async getUserInfo (provider, accessToken) {
    const config = this.providers[provider]
    if (!config) {
      throw new Error(`Unsupported OAuth provider: ${provider}`)
    }

    try {
      const response = await axios.get(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      })

      return this.normalizeUserInfo(provider, response.data)
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`)
    }
  }

  /**
   * Normalize user info from different providers
   */
  normalizeUserInfo (provider, data) {
    switch (provider) {
      case 'google':
        return {
          email: data.email,
          name: data.name,
          firstName: data.given_name,
          lastName: data.family_name,
          picture: data.picture,
          provider: 'google',
          providerId: data.id
        }
      case 'facebook':
        return {
          email: data.email,
          name: data.name,
          firstName: data.first_name,
          lastName: data.last_name,
          picture: data.picture?.data?.url,
          provider: 'facebook',
          providerId: data.id
        }
      case 'microsoft':
        return {
          email: data.mail || data.userPrincipalName,
          name: data.displayName,
          firstName: data.givenName,
          lastName: data.surname,
          picture: null,
          provider: 'microsoft',
          providerId: data.id
        }
      case 'apple':
        return {
          email: data.email,
          name: data.name?.firstName ? `${data.name.firstName} ${data.name.lastName || ''}` : null,
          firstName: data.name?.firstName,
          lastName: data.name?.lastName,
          picture: null,
          provider: 'apple',
          providerId: data.sub
        }
      default:
        throw new Error(`Unsupported provider: ${provider}`)
    }
  }

  /**
   * Find or create user from OAuth
   */
  async findOrCreateUser (userInfo, role = 'passenger') {
    try {
      // Check if user exists with this provider
      let user = await User.findOne({
        where: {
          [`${userInfo.provider}Id`]: userInfo.providerId
        }
      })

      if (user) {
        // Update user info
        await user.update({
          name: userInfo.name || user.name,
          avatar: userInfo.picture || user.avatar,
          lastLoginAt: new Date()
        })
        return user
      }

      // Check if user exists with same email
      user = await User.findOne({
        where: { email: userInfo.email }
      })

      if (user) {
        // Link OAuth account to existing user
        await user.update({
          [`${userInfo.provider}Id`]: userInfo.providerId,
          lastLoginAt: new Date()
        })
        return user
      }

      // Create new user
      user = await User.create({
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split('@')[0],
        password: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
        role,
        avatar: userInfo.picture,
        [`${userInfo.provider}Id`]: userInfo.providerId,
        emailVerifiedAt: new Date(), // OAuth emails are pre-verified
        isActive: true
      })

      return user
    } catch (error) {
      throw new Error(`Failed to find or create user: ${error.message}`)
    }
  }

  /**
   * Verify Apple ID token (JWT)
   */
  async verifyAppleToken (idToken) {
    // Apple requires JWT verification with their public keys
    // This is a simplified version - in production, use proper JWT verification
    try {
      const jwt = require('jsonwebtoken')
      const decoded = jwt.decode(idToken, { complete: true })

      if (!decoded) {
        throw new Error('Invalid Apple ID token')
      }

      // Verify issuer
      if (decoded.payload.iss !== 'https://appleid.apple.com') {
        throw new Error('Invalid token issuer')
      }

      // Verify audience
      if (decoded.payload.aud !== this.providers.apple.clientId) {
        throw new Error('Invalid token audience')
      }

      // Verify expiration
      if (decoded.payload.exp < Date.now() / 1000) {
        throw new Error('Token expired')
      }

      return decoded.payload
    } catch (error) {
      throw new Error(`Apple token verification failed: ${error.message}`)
    }
  }

  /**
   * Generate Apple client secret
   */
  generateAppleClientSecret () {
    const jwt = require('jsonwebtoken')
    const now = Math.floor(Date.now() / 1000)

    const payload = {
      iss: this.providers.apple.teamId,
      iat: now,
      exp: now + 180 * 24 * 60 * 60, // 6 months
      aud: 'https://appleid.apple.com',
      sub: this.providers.apple.clientId
    }

    return jwt.sign(payload, this.providers.apple.privateKey, {
      algorithm: 'ES256',
      keyid: this.providers.apple.keyId
    })
  }
}

module.exports = new OAuth2Service()
