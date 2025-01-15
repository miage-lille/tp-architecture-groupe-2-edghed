export class UserAlreadyParticipatesException extends Error {
    constructor(userId: string, webinarId: string) {
      super(`User with ID ${userId} is already participating in webinar with ID ${webinarId}.`);
      this.name = 'UserAlreadyParticipatesException';
    }
  }
  