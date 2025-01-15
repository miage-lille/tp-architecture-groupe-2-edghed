import { IMailer } from 'src/core/ports/mailer.interface';
import { Executable } from 'src/shared/executable';
import { User } from 'src/users/entities/user.entity';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';
import { Participation } from 'src/webinars/entities/participation.entity';
import { WebinarNotEnoughSeatsException } from 'src/webinars/exceptions/webinar-not-enough-seats';
import { UserAlreadyParticipatesException } from 'src/webinars/exceptions/webinar-user-already-participates';
import { WebinarNotFoundException } from 'src/webinars/exceptions/webinar-not-found';
import { UserNotFoundException } from 'src/webinars/exceptions/user-not-found';

type Request = {
  webinarId: string;
  user: User;
};

type Response = void;

export class BookSeat implements Executable<Request, Response> {
  constructor(
    private readonly participationRepository: IParticipationRepository,
    private readonly webinarRepository: IWebinarRepository,
    private readonly mailer: IMailer,
    private readonly userRepository: IUserRepository,
  ) {}

  async execute({ webinarId, user }: Request): Promise<Response> {
    
    const webinar = await this.webinarRepository.findById(webinarId);
    if (!webinar) {
      throw new WebinarNotFoundException(webinarId);
    }
  
   
    const existingUser = await this.userRepository.findById(user.props.id);
    if (!existingUser) {
      throw new UserNotFoundException(`User with ID ${user.props.id} not found`);
    }
  
   
    const participations = await this.participationRepository.findByWebinarId(webinarId);
    const isAlreadyParticipant = participations.some(p => p.props.userId === user.props.id);
    if (isAlreadyParticipant) {
      throw new UserAlreadyParticipatesException(user.props.id, webinarId);
    }
  
    
    const remainingSeats = webinar.props.seats - participations.length;
    if (remainingSeats <= 0) {
      throw new WebinarNotEnoughSeatsException();
    }
  

    const participation = new Participation({
      userId: user.props.id,
      webinarId,
    });
    await this.participationRepository.save(participation);
  
    
    await this.mailer.send({
      to: webinar.props.organizerId,
      subject: `New participant for ${webinar.props.title}`,
      body: `User ${user.props.email} has registered for your webinar.`,
    });
  
    await this.mailer.send({
      to: user.props.email,
      subject: `You are registered for ${webinar.props.title}`,
      body: `Dear ${user.props.email}, you have successfully registered for the webinar: ${webinar.props.title}.`,
    });
  }
  
}
