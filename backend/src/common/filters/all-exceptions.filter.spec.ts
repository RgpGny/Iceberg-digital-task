import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { BusinessError } from '../errors';

function makeHost(): { host: ArgumentsHost; response: { status: jest.Mock; json: jest.Mock } } {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/test', method: 'GET' }),
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('AllExceptionsFilter', () => {
  it('maps BusinessError to 400 with code + message + details', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost();

    filter.catch(
      new BusinessError('invalid_transition', 'Cannot skip stages', { from: 'a', to: 'b' }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'invalid_transition',
        message: 'Cannot skip stages',
        details: { from: 'a', to: 'b' },
      }),
    );
  });

  it('passes HttpException through with its status and payload', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost();

    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Not found' }),
    );
  });

  it('maps unknown errors to 500 with a generic message', () => {
    const filter = new AllExceptionsFilter();
    const { host, response } = makeHost();

    filter.catch(new Error('boom'), host);

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500, code: 'internal_error' }),
    );
  });
});
