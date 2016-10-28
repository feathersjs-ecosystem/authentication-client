import { expect } from 'chai';
import { populateEntity } from '../../src/hooks';

const user = { id: '1', name: 'Bob' };

describe('hooks:populateEntity', () => {
  let hook;
  let options;

  beforeEach(() => {
    hook = {
      type: 'after',
      params: {
        accessToken: 'my token',
        headers: {}
      },
      result: {},
      app: {
        authentication: {
          verifyJWT: () => Promise.resolve({ userId: '1' })
        },
        service: () => {
          return {
            get: () => Promise.resolve(user)
          };
        }
      }
    };

    options = {
      service: 'users',
      field: 'userId',
      on: 'user'
    };
  });

  describe('when options.service is missing', () => {
    it('throws an error', () => {
      delete options.service;

      try {
        populateEntity(options);
      } catch (error) {
        expect(error).to.not.equal(undefined);
      }
    });
  });

  describe('when options.field is missing', () => {
    it('throws an error', () => {
      delete options.field;

      try {
        populateEntity(options);
      } catch (error) {
        expect(error).to.not.equal(undefined);
      }
    });
  });

  describe('when options.on is missing', () => {
    it('throws an error', () => {
      delete options.on;

      try {
        populateEntity(options);
      } catch (error) {
        expect(error).to.not.equal(undefined);
      }
    });
  });

  describe('when not called as an after hook', () => {
    it('returns an error', () => {
      hook.type = 'before';

      return populateEntity(options)(hook).catch(error => {
        expect(error).to.not.equal(undefined);
      });
    });
  });

  it('populates an entity by token payload id', () => {
    return populateEntity(options)(hook).then(hook => {
      expect(hook.result.user).to.deep.equal(user);
    });
  });
});
