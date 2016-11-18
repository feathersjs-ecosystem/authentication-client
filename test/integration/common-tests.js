import { expect } from 'chai';
import localstorage from 'localstorage-memory';

export default function runTests (client, options) {
  console.log(client);
  describe('default options', () => {
    it('sets the cookie name', () => {
      expect(client.passport.options.cookie).to.equal('feathers-jwt');
    });

    it('sets the name used for localstorage', () => {
      expect(client.passport.options.tokenKey).to.equal('feathers-jwt');
    });

    it('sets the auth service path', () => {
      expect(client.passport.options.path).to.equal('/authentication');
    });

    it('sets the entity', () => {
      expect(client.passport.options.entity).to.equal('user');
    });

    it('sets the entity service', () => {
      expect(client.passport.options.service).to.equal('users');
    });
  });

  it('can use client.passport.getJWT() to get the accessToken', () => {
    return client.authenticate(options).then(response => {
      client.passport.getJWT().then(accessToken => {
        expect(accessToken).to.equal(response.accessToken);
      });
    });
  });

  it('can decode a accessToken with client.passport.verifyToken()', () => {
    return client.authenticate(options).then(response => {
      return client.passport.verifyJWT(response).then(payload => {
        expect(payload.id).to.equal(0);
        expect(payload.iss).to.equal('feathers');
        expect(payload.sub).to.equal('auth');
      });
    });
  });

  it('local username password authentication', () => {
    return client.authenticate(options).then(response => {
      expect(response.accessToken).to.not.equal(undefined);
      expect(client.get('accessToken')).to.deep.equal(response.accessToken);
    });
  });

  it('local username password authentication and access to protected service', () => {
    return client.authenticate(options).then(response => {
      expect(response.accessToken).to.not.equal(undefined);
      return client.service('messages').create({ text: 'auth test message' })
        .then(msg => {
          expect(typeof msg.id).to.not.equal(undefined);
        });
    });
  });

  it('local authentication with wrong credentials fails', () => {
    options.password = 'this is wrong';
    return client.authenticate(options).catch(error => {
      expect(error.name).to.equal('NotAuthenticated');
      expect(error.code).to.equal(401);
    });
  });

  it('authentication with no options and no stored accessToken fails', () => {
    return client.authenticate().catch(error => {
      expect(error.message).to.equal('Could not find stored JWT and no authentication type was given');
      expect(error.code).to.equal(401);
    });
  });

  it('uses localStorage compatible stores', () => {
    const oldStorage = client.get('storage');
    client.set('storage', localstorage);

    return client.authenticate(options).then(response => {
      expect(response.accessToken).to.equal(localstorage.getItem('feathers-jwt'));
      client.set('storage', oldStorage);
    });
  });

  it('accessToken is stored and re-authentication with stored accessToken works', () => {
    return client.authenticate(options).then(response => {
      expect(response.accessToken).to.not.equal(undefined);

      return client.authenticate().then(response => {
        expect(client.get('accessToken')).to.equal(response.accessToken);
      });
    });
  });

  it('.logout works, does not grant access to protected service and accessToken is removed from localstorage', () => {
    return client.authenticate(options).then(response => {
      expect(response.accessToken).to.not.equal(undefined);
      return client.logout();
    })
    .then(() => {
      expect(client.get('accessToken')).to.equal(null);
      return Promise.resolve(client.get('storage').getItem('feathers-jwt'));
    })
    .then(accessToken => {
      expect(accessToken).to.equal(undefined);

      return client.service('messages').create({ text: 'auth test message' }).catch(error => {
        expect(error.code).to.equal(401);
      });
    });
  });
}
