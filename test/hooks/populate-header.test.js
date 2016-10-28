import { expect } from 'chai';
import { populateHeader } from '../../src/hooks';

describe('hooks:populateHeader', () => {
  let hook;

  beforeEach(() => {
    hook = {
      type: 'before',
      params: {
        accessToken: 'my token',
        headers: {}
      }
    };
  });

  describe('when not called as a before hook', () => {
    it('returns an error', () => {
      hook.type = 'after';

      return populateHeader()(hook).catch(error => {
        expect(error).to.not.equal(undefined);
      });
    });
  });

  describe('when accessToken is missing', () => {
    it('does nothing', () => {
      delete hook.params.accessToken;
      return populateHeader()(hook).then(newHook => {
        expect(newHook).to.deep.equal(hook);
      });
    });
  });

  describe('when accessToken is present', () => {
    it('adds the accessToken to authorization header', () => {
      return populateHeader()(hook).then(hook => {
        expect(hook.params.headers.authorization).to.equal('my token');
      });
    });

    it('retains existing headers', () => {
      hook.params.headers = {
        authorization: 'existing',
        custom: 'custom'
      };

      return populateHeader()(hook).then(hook => {
        expect(hook.params.headers.authorization).to.equal('existing');
        expect(hook.params.headers.custom).to.equal('custom');
      });
    });

    it('supports a custom token header', () => {
      return populateHeader({header: 'custom'})(hook).then(hook => {
        expect(hook.params.headers.custom).to.equal('my token');
      });
    });
  });
});
