// backend/api/log-error/route.js
import { NextResponse } from 'next/server';
const { logger } = require('../../src/services/loggingService');

export async function POST(request) {
  try {
    const errorData = await request.json();
    
    // Valider les données d'erreur
    const { type, path, method, timestamp, userAgent, ip, error, errorInfo } = errorData;
    
    // Logger structuré pour le monitoring
    logger.error('TaxiLibre Error Log', { ...errorData });
    
    // Stocker dans la base de données (simulation)
    const errorLog = {
      id: Date.now(),
      ...errorData,
      resolved: false,
      createdAt: new Date().toISOString()
    };
    
    // Envoyer à un service de monitoring externe (Sentry, etc.)
    if (process.env.SENTRY_DSN) {
      // Intégration Sentry ici
    }
    
    // Envoyer à Slack/Discord pour notification en temps réel
    if (process.env.SLACK_WEBHOOK_URL) {
      await sendSlackNotification(errorLog);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
      errorId: errorLog.id
    });
    
  } catch (error) {
    logger.error("Failed to log error", { error: error.message });
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to log error',
        error: error.message
      },
      { status: 500 }
    );
  }
}

// Envoyer notification à Slack
async function sendSlackNotification(errorLog) {
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!webhookUrl) return;
    
    const payload = {
      text: `🚨 TaxiLibre Error: ${errorLog.type}`,
      attachments: [
        {
          color: 'danger',
          fields: [
            {
              title: 'Type',
              value: errorLog.type,
              short: true
            },
            {
              title: 'Path',
              value: errorLog.path || 'N/A',
              short: true
            },
            {
              title: 'Method',
              value: errorLog.method || 'N/A',
              short: true
            },
            {
              title: 'Timestamp',
              value: errorLog.timestamp,
              short: true
            }
          ],
          text: errorLog.error?.message || 'No error message'
        }
      ]
    };
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
  } catch (error) {
    logger.error("Failed to log error", { error: error.message });
  }
}

export async function GET() {
  try {
    // Récupérer les logs d'erreurs (pour le dashboard admin)
    const errorLogs = [
      {
        id: 1,
        type: '404_NOT_FOUND',
        path: '/api/invalid-route',
        method: 'GET',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        userAgent: 'Mozilla/5.0...',
        ip: '192.168.1.1',
        resolved: false,
        createdAt: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 2,
        type: 'API_NOT_FOUND',
        path: '/api/unknown-endpoint',
        method: 'POST',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        userAgent: 'Mozilla/5.0...',
        ip: '192.168.1.2',
        resolved: true,
        createdAt: new Date(Date.now() - 600000).toISOString()
      }
    ];
    
    return NextResponse.json({
      success: true,
      data: errorLogs,
      total: errorLogs.length
    });
    
  } catch (error) {
    logger.error("Failed to log error", { error: error.message });
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch error logs',
        error: error.message
      },
      { status: 500 }
    );
  }
}
