import { Controller, Get, All, Req } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @All()
  getHello(@Req() request: any): any {
    const requestDetails = {
      method: request.method,
      url: request.url,
      headers: request.headers,
      query: request.query,
      params: request.params,
      body: request.body,
      ip: request.ip,
      userAgent: request.get('User-Agent'),
      contentType: request.get('Content-Type'),
      timestamp: new Date().toISOString(),
      rawBody: request.rawBody || 'No raw body available'
    };

    // Log to console for debugging
    console.log('📡 Base URL Request Received:');
    console.log('=====================================');
    console.log(JSON.stringify(requestDetails, null, 2));
    console.log('=====================================');

    // Return both the original hello message and request details
    return {
      message: this.appService.getHello(),
      requestDetails
    };
  }
}
