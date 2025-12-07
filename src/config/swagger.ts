import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isCompiled = __dirname.includes('/dist/') || __dirname.includes('\\dist\\');
const fileExtension = isCompiled ? 'js' : 'ts';

// Determine the server URL based on environment
const getServerUrl = (): string => {
  if (process.env.NODE_ENV === 'production') {
    if (process.env.APP_URL) {
      return process.env.APP_URL;
    }
    return '/';
  }
  return `http://localhost:${process.env.PORT || 3000}`;
};

const serverUrl = getServerUrl();
const servers = [
  {
    url: serverUrl,
    description:
      process.env.NODE_ENV === 'production'
        ? 'Production server'
        : 'Development server',
  },
];

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Weather API',
      version: '1.0.0',
      description: 'REST API for querying weather forecast data stored in MongoDB',
    },
    servers,
  },
  apis: [
    path.join(__dirname, `../routes/*.${fileExtension}`),
    path.join(__dirname, `../controllers/*.${fileExtension}`),
  ],
};

let swaggerSpec: ReturnType<typeof swaggerJsdoc>;

try {
  swaggerSpec = swaggerJsdoc(options);
} catch (error) {
  console.error('Error generating Swagger spec:', error);
  swaggerSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Weather API',
      version: '1.0.0',
      description: 'REST API for querying weather forecast data stored in MongoDB',
    },
    servers,
    paths: {},
  } as any;
}

export default swaggerSpec;

