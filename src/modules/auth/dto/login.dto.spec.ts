import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './login.dto';

async function validationMessages(input: object): Promise<string[]> {
  const dto = plainToInstance(LoginDto, input);
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('LoginDto', () => {
  it('accepts a valid login payload', async () => {
    const messages = await validationMessages({
      identifier: 'tasin@example.com',
      password: 'StrongP@ss123',
    });

    expect(messages).toHaveLength(0);
  });

  it('requires an identifier', async () => {
    const messages = await validationMessages({
      password: 'StrongP@ss123',
    });

    expect(messages.join(' ')).toContain('identifier');
  });

  it('rejects a too-short identifier', async () => {
    const messages = await validationMessages({
      identifier: 'ab',
      password: 'StrongP@ss123',
    });

    expect(messages.join(' ')).toContain('identifier');
  });

  it('rejects a weak password', async () => {
    const messages = await validationMessages({
      identifier: 'tasin@example.com',
      password: 'weak',
    });

    expect(messages.join(' ')).toContain('special character');
  });

  it('rejects a client-supplied role field through the global validation pipe', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });

    const payload = {
      identifier: 'tasin@example.com',
      password: 'StrongP@ss123',
      role: 'ADMIN',
    };

    await expect(
      pipe.transform(payload, { type: 'body', metatype: LoginDto }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
