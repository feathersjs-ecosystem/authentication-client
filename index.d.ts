
interface Config {
  header: 'authorization';
  cookie: 'feathers-jwt';
  storageKey: 'feathers-jwt';
  jwtStrategy: 'jwt';
  path: '/authentication';
  entity: 'user';
  service: 'users';
}

export default function init(config?: Config) : () => void;
export const defaults: Config;
