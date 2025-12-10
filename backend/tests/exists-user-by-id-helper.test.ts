import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { existsUserById } from '../src/helpers/db-validator-helper';
import User from '../src/models/user-model';


jest.mock('../src/models/user-model', () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

const mockedUserModel: any = User;

describe('existsUserById helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not throw an error when the user exists', async () => {
    // Simultates that the DB returns a user
    mockedUserModel.findByPk.mockResolvedValue({ idUser: 10, email: 'user@example.com' });

    await expect(existsUserById(10)).resolves.toBeUndefined();
    expect(mockedUserModel.findByPk).toHaveBeenCalledTimes(1);
    expect(mockedUserModel.findByPk).toHaveBeenCalledWith(10);
  });

  
  it('throws an error when the user does NOT exist', async () => {
    mockedUserModel.findByPk.mockResolvedValue(null);

    await expect(existsUserById(999)).rejects.toThrow('User with ID 999 does not exist');
    expect(mockedUserModel.findByPk).toHaveBeenCalledWith(999);
  });
});
