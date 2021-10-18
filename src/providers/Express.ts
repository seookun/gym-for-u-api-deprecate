import * as express from 'express';
import * as morgan from 'morgan';
import * as path from 'path';
import * as swaggerUi from 'swagger-ui-express';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import { getMetadataArgsStorage, RoutingControllersOptions, useExpressServer } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import Locals from './Locals';
import { stream } from './Log';

export default class Express {
  public static app: express.Application = express();
  public static port = process.env.PORT || 3000;

  public static init(): Promise<void> {
    return new Promise((resolve) => {
      const options = {
        defaultErrorHandler: false,
        routePrefix: process.env.API_PREFIX,
        controllers: [path.join(__dirname, '../controllers/*.ts')],
        middlewares: [path.join(__dirname, '../middlewares/*.ts')],
        interceptors: [path.join(__dirname, '../interceptors/*.ts')],
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
    },
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
}

function useLogger(app: express.Application) {
  const format = Locals.isProduction ? 'combined' : 'dev';
  app.use(morgan(format, { stream }));
}
