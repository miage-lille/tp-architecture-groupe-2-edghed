import { BookSeat } from './book-seat';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { UserAlreadyParticipatesException } from 'src/webinars/exceptions/webinar-user-already-participates';
import { WebinarNotEnoughSeatsException } from 'src/webinars/exceptions/webinar-not-enough-seats';
import { IMailer } from 'src/core/ports/mailer.interface';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';
import { IUserRepository } from 'src/users/ports/user-repository.interface'; 
import { User } from 'src/users/entities/user.entity';
import { InMemoryMailer } from 'src/core/adapters/in-memory-mailer';


const mockParticipationRepository = {
  findByWebinarId: jest.fn().mockResolvedValue([]), 
};
const mockWebinarRepository = {
  findById: jest.fn(),
};
const mockUserRepository = {
  findById: jest.fn(),
};

describe('BookSeat', () => {
  let bookSeat: BookSeat;
  const user = new User({
    id: 'user1',
    email: 'user@example.com',
    password: 'password123', 
  });
  let inMemoryMailer: InMemoryMailer;

  beforeEach(() => {
    inMemoryMailer = new InMemoryMailer(); 
    bookSeat = new BookSeat(
      mockParticipationRepository as unknown as IParticipationRepository,
      mockWebinarRepository as unknown as IWebinarRepository,
      inMemoryMailer as unknown as IMailer, 
      mockUserRepository as unknown as IUserRepository 
    );
  });

  it('should throw WebinarNotFoundException if the webinar does not exist', async () => {
    mockWebinarRepository.findById.mockResolvedValueOnce(null);  
  
    await expect(bookSeat.execute({ webinarId: 'webinar1', user }))
      .rejects
      .toThrowError(WebinarNotFoundException);  
  });
  
  it('should throw UserAlreadyParticipatesException if the user is already participating', async () => {
    mockWebinarRepository.findById.mockResolvedValueOnce({ id: 'webinar1', props: { seats: 10, title: 'Webinar 1' } });
    mockUserRepository.findById.mockResolvedValueOnce(user);  
    mockParticipationRepository.findByWebinarId.mockResolvedValueOnce([{ props: { userId: 'user1' } }]); 
  
    await expect(bookSeat.execute({ webinarId: 'webinar1', user }))
      .rejects
      .toThrowError(UserAlreadyParticipatesException);  
  });
  
  it('should throw WebinarNotEnoughSeatsException if there are not enough seats', async () => {
    mockWebinarRepository.findById.mockResolvedValueOnce({ id: 'webinar1', props: { seats: 1, title: 'Webinar 1' } });
    mockUserRepository.findById.mockResolvedValueOnce(user);
    mockParticipationRepository.findByWebinarId.mockResolvedValueOnce([{ props: { userId: 'user2' } }]);  // Le webinaire est déjà plein
  
    await expect(bookSeat.execute({ webinarId: 'webinar1', user }))
      .rejects
      .toThrowError(WebinarNotEnoughSeatsException); 
  });
  
  it('should successfully add a participation and send an email', async () => {
    mockWebinarRepository.findById.mockResolvedValueOnce({
      id: 'webinar1',
      props: { seats: 10, title: 'Webinar 1', organizerId: 'organizer1' }
    });
    mockUserRepository.findById.mockResolvedValueOnce(user); 
    mockParticipationRepository.findByWebinarId.mockResolvedValueOnce([]);  
    mockParticipationRepository.save.mockResolvedValueOnce(undefined);  
  
    await bookSeat.execute({ webinarId: 'webinar1', user });
  
    expect(inMemoryMailer.sentEmails).toContainEqual({
      to: 'organizer1',
      subject: 'New participant for Webinar 1',
      body: 'User user@example.com has registered for your webinar.',
    });
    expect(inMemoryMailer.sentEmails).toContainEqual({
      to: 'user@example.com',
      subject: 'You are registered for Webinar 1',
      body: 'Dear user@example.com, you have successfully registered for the webinar: Webinar 1.',
    });
  });
});
