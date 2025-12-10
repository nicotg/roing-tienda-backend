import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { existsEmail } from '../src/helpers/db-validator-helper';
import User from '../src/models/user-model';


jest.mock('../src/models/user-model', () => {
  return {
    __esModule: true,
    default: {
        findOne: jest.fn(),
    }
  };
});



const mockedUserModel: any = User;

describe('existsEmail helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('do not throw an error when the email does not exists', async () => {
    mockedUserModel.findOne.mockResolvedValue(null); //Simulates no existing user

    await expect(existsEmail('nuevo@example.com')).resolves.toBeUndefined();

    expect(mockedUserModel.findOne).toHaveBeenCalledTimes(1);
    expect(mockedUserModel.findOne).toHaveBeenCalledWith({ where: { email: 'nuevo@example.com' } });
  });


  it('throws an error when the email already exists', async () => {
    mockedUserModel.findOne.mockResolvedValue({ idUser: 1, email: 'existe@example.com' }); 

    await expect(existsEmail('existe@example.com')).rejects.toThrow('Ya existe una cuenta con este correo electrónico');

    expect(mockedUserModel.findOne).toHaveBeenCalledTimes(1);
  });

});
