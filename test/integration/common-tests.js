import { expect } from 'chai';
import localstorage from 'localstorage-memory';

export default function runTests (client, options) {
  it('client.authentication object', () => {
    expect(typeof client.authentication.getJWT).to.equal('function');
    expect(client.authentication.options).to.deep.equal({
      cookie: 'feathers-jwt',
      tokenKey: 'feathers-jwt',
      localEndpoint: '/auth/local',
      tokenEndpoint: '/auth/token'
    });
  });

  it('can use client.authentication.getJWT() to get the accessToken', () => {
    return client.authenticate(options).then(response => {
      client.authentication.getJWT().then(accessToken => {
        expect(accessToken).to.equal(response.accessToken);
      });
    });
  });

  it('can decode a accessToken with client.authentication.verifyToken()', () => {
    return client.authenticate(options).then(response => {
      return client.authentication.verifyJWT(response).then(payload => {
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
