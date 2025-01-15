export class WebinarNotFoundException extends Error {
    constructor(webinarId: string) {
      super(`Webinar with ID ${webinarId} was not found.`);
      this.name = 'WebinarNotFoundException';
    }
  }
  