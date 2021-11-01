import * as express from 'express';
import * as morgan from 'morgan';
import * as path from 'path';
import * as swaggerUi from 'swagger-ui-express';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import { Action, getMetadataArgsStorage, RoutingControllersOptions, useExpressServer } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import Locals from './Locals';
import { stream } from '@/utils/logger';
import { verifyAccessToken } from '@/utils/jwt';
import { UserRole } from '@/models/UserModel';

function authorizationChecker(action: Action, roles: UserRole[]) {
  const accessToken = action.request.headers.authorization?.replace('Bearer', '').trim();
  const payload = verifyAccessToken(accessToken);

  return !roles.length || roles.some((role) => payload.roles.includes(role));
}

export default class Express {
  static app: express.Application = express();
  static port = Locals.port;

  static init(): Promise<void> {
    return new Promise((resolve) => {
      const options = {
        defaultErrorHandler: false,
        routePrefix: Locals.apiPrefix,
        authorizationChecker,
        controllers: [path.join(__dirname, '../controllers/*.{js,ts}')],
        middlewares: [path.join(__dirname, '../middlewares/*.{js,ts}')],
        interceptors: [path.join(__dirname, '../interceptors/*.{js,ts}')],
      };

      useLogger(this.app);
      useExpressServer(this.app, options);
      useSwagger(this.app, options);

      this.app.listen(this.port, resolve);
    });
  }
}

function useSwagger(app: express.Application, options: RoutingControllersOptions) {
  if (Locals.isProduction) return;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { defaultMetadataStorage } = require('class-transformer/cjs/storage');
  const schemas = validationMetadatasToSchemas({
    classTransformerMetadataStorage: defaultMetadataStorage,
    refPointerPrefix: '#/components/schemas/',
  });

  const storage = getMetadataArgsStorage();
  const spec = routingControllersToSpec(storage, options, {
    components: {
      schemas,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}

function useLogger(app: express.Application) {
  const format = Locals.isProduction ? 'combined' : 'dev';
  app.use(morgan(format, { stream }));
}
