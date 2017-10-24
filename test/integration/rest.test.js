/* eslint-disable no-unused-expressions */
const hooks = require('feathers-hooks');
const feathers = require('feathers/client');
const rest = require('feathers-rest/client');
const localstorage = require('localstorage-memory');
const superagent = require('superagent');
const { expect } = require('chai');

const authentication = require('../../lib/index');
const createApplication = require('../fixtures/server');

const port = 8998;
const baseURL = `http://localhost:${port}`;

const app = createApplication({ secret: 'supersecret' });
let options;

describe('REST client authentication', () => {
  let server;
  let client;

  before(done => {
    server = app.listen(port);
    server.once('listening', () => {
      client = feathers()
        .configure(hooks())
        .configure(rest(baseURL).superagent(superagent))
        .configure(authentication());

      done();
    });
  });

  beforeEach(() => {
    options = {
      strategy: 'local',
      email: 'admin@feathersjs.com',
      password: 'admin'
    };
  });

  after(done => {
    server.close();
    done();
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
      return client.passport.verifyJWT(response.accessToken).then(payload => {
        expect(payload.userId).to.equal(0);
        expect(payload.iss).to.equal('feathers');
        expect(payload.sub).to.equal('anonymous');
      });
    });
  });

  it('local username password authentication', () => {
    return client.authenticate(options).then(response => {
      expect(response.accessToken).to.not.equal(undefined);
      expect(client.get('accessToken')).to.deep.equal(response.accessToken);
    });
  });

  it('`authenticated` event', done => {
    client.once('authenticated', response => {
      try {
        expect(response.accessToken).to.not.equal(undefined);
        expect(client.get('accessToken')).to.deep.equal(response.accessToken);
        done();
      } catch (e) {
        done(e);
      }
    });

    client.authenticate(options);
  });

  it('local username password authentication and access to protected service', () => {
    return client.authenticate(options).then(response => {
      expect(response.accessToken).to.not.equal(undefined);
      return client.service('users').get(0).then(user => {
        expect(user.id).to.equal(0);
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

      return client.service('users').get(0).catch(error => {
        expect(error.code).to.equal(401);
      });
    });
  });

  it('`logout` event', done => {
    client.once('logout', () => done());

    client.authenticate(options).then(response => {
      expect(response.accessToken).to.not.equal(undefined);
      return client.logout();
    });
  });
});
