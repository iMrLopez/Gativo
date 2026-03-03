import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('tag-read')
  tagRead(): boolean {
    const tagId = 'someTagId'; // Replace with actual tag ID retrieval logic
    return this.appService.tagRead(tagId);
  }
}
