import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

async function validationMessages(input: object): Promise<string[]> {
  const dto = plainToInstance(RegisterDto, input);
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('RegisterDto', () => {
  it('accepts a valid registration payload', async () => {
    const messages = await validationMessages({
      username: 'tasin',
      email: 'tasin@example.com',
      phoneNumber: '017XXXXXXXX',
      password: 'StrongP@ss123',
    });

    expect(messages).toHaveLength(0);
  });

  it('requires a username', async () => {
    const messages = await validationMessages({
      email: 'tasin@example.com',
      password: 'StrongP@ss123',
    });

    expect(messages.join(' ')).toContain('username');
  });

  it('rejects an invalid email', async () => {
    const messages = await validationMessages({
      username: 'tasin',
      email: 'not-an-email',
      password: 'StrongP@ss123',
    });

    expect(messages.join(' ')).toContain('email');
  });

  it('rejects a weak password', async () => {
    const messages = await validationMessages({
      username: 'tasin',
      email: 'tasin@example.com',
      password: 'weak',
    });

    expect(messages.join(' ')).toContain('special character');
  });

  it('rejects a phone number longer than the database limit', async () => {
    const messages = await validationMessages({
      username: 'tasin',
      email: 'tasin@example.com',
      phoneNumber: '0171234567890123456789012345678901234',
      password: 'StrongP@ss123',
    });

    expect(messages.join(' ')).toContain('phoneNumber');
  });

  it('rejects a client-supplied role field through the global validation pipe', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });

    const payload = {
      username: 'tasin',
      email: 'tasin@example.com',
      password: 'StrongP@ss123',
      role: 'ADMIN',
    };

    await expect(
      pipe.transform(payload, { type: 'body', metatype: RegisterDto }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
